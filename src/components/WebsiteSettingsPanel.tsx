import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, CircleDot, Paintbrush2, RefreshCcw, Save, Search, Sparkles, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase-db';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { frameSequenceManifest } from '../theme/frameSequenceManifest';
import { themePresets } from '../theme/themePresets';
import { createThemeState, sanitizeThemeState } from '../theme/themeUtils';
import type { ThemeControls } from '../theme/types';
import {
  defaultSiteSettings,
  homepageSectionMeta,
  sanitizeSiteSettings,
  siteSettingsDocId,
  type HomepageSectionId,
  type SiteBookingProofItem,
  type SiteBookingService,
  type SiteTextCard,
  type SiteTimelineItem,
  type SiteSettings,
} from '../siteSettings/siteSettings';
import { logAudit } from '../utils/auditLogger';
import { siteIconOptions } from '../utils/siteIcons';
import {
  searchWebsiteSettings,
  type WebsiteSearchItem,
  type WebsiteSearchResult,
} from '../utils/websiteSettingsSearch';

interface WebsiteSettingsPanelProps {
  adminId?: string;
  adminEmail?: string;
}

type ObjectSectionKey = Exclude<keyof SiteSettings, 'schemaVersion' | 'themeStudioEnabled'>;
type StringFieldConfig<S extends ObjectSectionKey> = {
  key: keyof SiteSettings[S];
  label: string;
  rows?: number;
  aliases?: string[];
};
type BooleanFieldConfig<S extends ObjectSectionKey> = {
  key: keyof SiteSettings[S];
  label: string;
  description: string;
  aliases?: string[];
};
type StructuredFieldConfig<T> = {
  key: keyof T;
  label: string;
  rows?: number;
  type?: 'text' | 'textarea' | 'icon';
};
type SearchableSection = {
  id: string;
  label: string;
  title: string;
  description: string;
  aliases?: string[];
};
type SearchableFieldGroup = {
  id: string;
  title: string;
  description: string;
  aliases?: string[];
};

const surfaceModes: ThemeControls['surfaceMode'][] = ['paper', 'glass', 'velvet', 'ink', 'glow'];
const contrastModes: ThemeControls['contrastMode'][] = ['soft', 'balanced', 'high'];
const quickSearchSuggestions = ['hero', 'booking', 'default theme', 'instagram', 'client', 'footer', 'calendar'];
const textCardFields: StructuredFieldConfig<SiteTextCard>[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { key: 'icon', label: 'Icon', type: 'icon' },
];
const timelineFields: StructuredFieldConfig<SiteTimelineItem>[] = [
  { key: 'title', label: 'Title' },
  { key: 'institution', label: 'Institution' },
  { key: 'period', label: 'Period' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
];
const bookingServiceFields: StructuredFieldConfig<SiteBookingService>[] = [
  { key: 'value', label: 'Stored value' },
  { key: 'label', label: 'Public label' },
  { key: 'icon', label: 'Badge text' },
  { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
];
const bookingProofFields: StructuredFieldConfig<SiteBookingProofItem>[] = [
  { key: 'label', label: 'Label' },
  { key: 'detail', label: 'Detail', type: 'textarea', rows: 3 },
  { key: 'icon', label: 'Icon', type: 'icon' },
];
const brandingIdentityFields: StringFieldConfig<'branding'>[] = [
  { key: 'wordmark', label: 'Wordmark', aliases: ['logo', 'brand'] },
  { key: 'strapline', label: 'Strapline', aliases: ['tagline', 'subtitle'] },
  { key: 'practitionerName', label: 'Practitioner name', aliases: ['name'] },
  { key: 'clinicLabel', label: 'Clinic label', aliases: ['clinic', 'organization'] },
  { key: 'siteTitle', label: 'Site title', aliases: ['browser title', 'meta title'] },
  { key: 'signInLabel', label: 'Sign-in button label', aliases: ['signin', 'login button'] },
  { key: 'signInToContinueLabel', label: 'Mobile sign-in button label', aliases: ['mobile signin', 'continue button'] },
  { key: 'signOutLabel', label: 'Sign-out label', aliases: ['logout'] },
  { key: 'patientDashboardLabel', label: 'Client dashboard label', aliases: ['client dashboard', 'portal label'] },
  { key: 'adminDashboardLabel', label: 'Admin dashboard label', aliases: ['admin label'] },
  { key: 'userFallbackLabel', label: 'User fallback label', aliases: ['fallback name'] },
  { key: 'mobileSignInPrompt', label: 'Mobile sign-in prompt', rows: 3, aliases: ['mobile prompt'] },
  { key: 'userMenuAriaLabel', label: 'User menu aria label' },
  { key: 'toggleMenuAriaLabel', label: 'Mobile menu toggle aria label', aliases: ['menu toggle'] },
  { key: 'closeMenuAriaLabel', label: 'Mobile menu close aria label', aliases: ['menu close'] },
  { key: 'signOutSuccessToast', label: 'Sign-out success toast', aliases: ['logout success'] },
  { key: 'signOutErrorToast', label: 'Sign-out error toast', aliases: ['logout error'] },
];
const appCopyFields: StringFieldConfig<'appCopy'>[] = [
  { key: 'skipLinkLabel', label: 'Skip link label', aliases: ['accessibility', 'skip to content'] },
  { key: 'routeLoaderTitle', label: 'Route loader title', aliases: ['loading title'] },
  { key: 'routeLoaderDescription', label: 'Route loader description', aliases: ['loading description'] },
];
const loginModalFields: StringFieldConfig<'loginModal'>[] = [
  { key: 'closeAriaLabel', label: 'Close aria label' },
  { key: 'title', label: 'Modal title', aliases: ['signin title'] },
  { key: 'selectDescription', label: 'Select method description', rows: 3 },
  { key: 'phoneStartDescription', label: 'Phone start description', rows: 2 },
  { key: 'phoneVerifyDescription', label: 'Phone verify description', rows: 2 },
  { key: 'googleCtaLabel', label: 'Google CTA label', aliases: ['google button'] },
  { key: 'googleSuccessToast', label: 'Google success toast' },
  { key: 'googleFailureFallback', label: 'Google failure fallback', rows: 2 },
  { key: 'dividerLabel', label: 'Divider label' },
  { key: 'phoneCtaLabel', label: 'Phone CTA label', aliases: ['phone button'] },
  { key: 'phoneNumberLabel', label: 'Phone number label' },
  { key: 'phonePlaceholder', label: 'Phone placeholder' },
  { key: 'sendingLabel', label: 'Sending label' },
  { key: 'sendCodeLabel', label: 'Send code label' },
  { key: 'backOptionsLabel', label: 'Back options label' },
  { key: 'otpLabel', label: 'OTP label' },
  { key: 'otpPlaceholder', label: 'OTP placeholder' },
  { key: 'verifyingLabel', label: 'Verifying label' },
  { key: 'verifyCtaLabel', label: 'Verify CTA label' },
  { key: 'wrongNumberLabel', label: 'Wrong number label' },
  { key: 'portalAgreement', label: 'Portal agreement', rows: 2, aliases: ['agreement'] },
  { key: 'phoneRequiredError', label: 'Phone required error' },
  { key: 'recaptchaError', label: 'Recaptcha error' },
  { key: 'verificationSentToast', label: 'Verification sent toast' },
  { key: 'smsFailureFallback', label: 'SMS failure fallback', rows: 2 },
  { key: 'otpRequiredError', label: 'OTP required error' },
  { key: 'otpSuccessToast', label: 'OTP success toast' },
  { key: 'invalidOtpError', label: 'Invalid OTP error' },
];
const loginModalControls: BooleanFieldConfig<'loginModal'>[] = [
  {
    key: 'phoneLoginEnabled',
    label: 'Mobile number login',
    description: 'Show phone OTP sign-in as an option in the public login modal.',
    aliases: ['phone login', 'sms login', 'otp login', 'mobile login', 'disable sms'],
  },
];
const contactFields: StringFieldConfig<'branding'>[] = [
  { key: 'contactEmail', label: 'Contact email', aliases: ['email'] },
  { key: 'contactPhone', label: 'Contact phone', aliases: ['phone'] },
  { key: 'location', label: 'Location', aliases: ['address'] },
];
const heroFields: StringFieldConfig<'hero'>[] = [
  { key: 'eyebrow', label: 'Hero eyebrow' },
  { key: 'headline', label: 'Hero headline', rows: 3, aliases: ['hero title'] },
  { key: 'description', label: 'Hero description', rows: 4 },
  { key: 'primaryCtaLabel', label: 'Primary CTA label', aliases: ['hero primary button'] },
  { key: 'primaryCtaHref', label: 'Primary CTA link', aliases: ['hero primary url'] },
  { key: 'secondaryCtaLabel', label: 'Secondary CTA label', aliases: ['hero secondary button'] },
  { key: 'secondaryCtaHref', label: 'Secondary CTA link', aliases: ['hero secondary url'] },
  { key: 'mediaAlt', label: 'Hero image alt text', rows: 2 },
  { key: 'mediaEyebrow', label: 'Hero image eyebrow' },
  { key: 'mediaHeadline', label: 'Hero image headline', rows: 2 },
  { key: 'mediaBadge', label: 'Hero image badge' },
  { key: 'supportingFrameAltPrefix', label: 'Supporting frame alt prefix' },
  { key: 'supportingFrameBadgePrefix', label: 'Supporting frame badge prefix' },
  { key: 'supportNote', label: 'Support note', rows: 3 },
];
const profileFields: StringFieldConfig<'ethos'>[] = [
  { key: 'eyebrow', label: 'Profile eyebrow' },
  { key: 'headline', label: 'Profile headline', rows: 3, aliases: ['profile title'] },
  { key: 'intro', label: 'Profile intro', rows: 3 },
  { key: 'panelEyebrow', label: 'Role eyebrow' },
  { key: 'panelHeadline', label: 'Role headline', rows: 2 },
  { key: 'panelDescription', label: 'Role description', rows: 3 },
  { key: 'settingLabel', label: 'Setting label' },
  { key: 'settingValue', label: 'Setting value' },
  { key: 'settingDescription', label: 'Setting description', rows: 3 },
  { key: 'approachLabel', label: 'Approach label' },
  { key: 'approachValue', label: 'Approach value' },
  { key: 'approachDescription', label: 'Approach description', rows: 3 },
  { key: 'trustTitle', label: 'Proof card 1 title' },
  { key: 'trustDescription', label: 'Proof card 1 description', rows: 3 },
  { key: 'privacyTitle', label: 'Proof card 2 title' },
  { key: 'privacyDescription', label: 'Proof card 2 description', rows: 3 },
  { key: 'progressTitle', label: 'Proof card 3 title' },
  { key: 'progressDescription', label: 'Proof card 3 description', rows: 3 },
];
const practiceFields: StringFieldConfig<'services'>[] = [
  { key: 'eyebrow', label: 'Practice eyebrow' },
  { key: 'headline', label: 'Practice headline', rows: 3 },
  { key: 'intro', label: 'Practice intro', rows: 3 },
  { key: 'featuredEyebrow', label: 'Featured eyebrow' },
  { key: 'featuredTitle', label: 'Featured title' },
  { key: 'featuredDescription', label: 'Featured description', rows: 3 },
  { key: 'toneEyebrow', label: 'Tone eyebrow' },
  { key: 'toneHeadline', label: 'Tone headline', rows: 2 },
  { key: 'toneDescription', label: 'Tone description', rows: 3 },
];
const credentialsFields: StringFieldConfig<'credentials'>[] = [
  { key: 'eyebrow', label: 'Credentials eyebrow' },
  { key: 'headline', label: 'Credentials headline', rows: 3 },
  { key: 'intro', label: 'Credentials intro', rows: 3 },
  { key: 'railEyebrow', label: 'Credentials rail eyebrow' },
  { key: 'railHeadline', label: 'Credentials rail headline', rows: 2 },
  { key: 'railDescription', label: 'Credentials rail description', rows: 3 },
  { key: 'professionalRailLabel', label: 'Professional rail label' },
  { key: 'professionalRailDescription', label: 'Professional rail description' },
  { key: 'educationRailLabel', label: 'Education rail label' },
  { key: 'educationRailDescription', label: 'Education rail description' },
  { key: 'roleLabel', label: 'Role item label' },
  { key: 'studyLabel', label: 'Study item label' },
];
const artStudioFields: StringFieldConfig<'artStudio'>[] = [
  { key: 'eyebrow', label: 'Art eyebrow' },
  { key: 'headline', label: 'Art headline', rows: 3 },
  { key: 'intro', label: 'Art intro', rows: 3 },
  { key: 'panelHeadline', label: 'Art panel headline', rows: 2 },
  { key: 'panelDescription', label: 'Art panel description', rows: 3 },
  { key: 'instagramCtaLabel', label: 'Artwork CTA label' },
  { key: 'galleryCaption', label: 'Gallery badge caption' },
  { key: 'featureAlt', label: 'Feature image alt text', rows: 2 },
  { key: 'galleryAltPrefix', label: 'Gallery alt prefix' },
  { key: 'featureBadge', label: 'Feature image badge' },
];
const consultationExperienceFields: StringFieldConfig<'consultationExperience'>[] = [
  { key: 'eyebrow', label: 'Consultation eyebrow' },
  { key: 'headline', label: 'Consultation headline', rows: 3 },
  { key: 'description', label: 'Consultation description', rows: 3 },
  { key: 'outcomeLabel', label: 'Outcome label' },
  { key: 'outcomeHeadline', label: 'Outcome headline', rows: 2 },
  { key: 'outcomeDescription', label: 'Outcome description', rows: 3 },
  { key: 'stepLabelPrefix', label: 'Step label prefix' },
  { key: 'featureAlt', label: 'Feature image alt text', rows: 2 },
];
const bookingDeskFields: StringFieldConfig<'consultationDesk'>[] = [
  { key: 'eyebrow', label: 'Booking eyebrow' },
  { key: 'headline', label: 'Booking headline', rows: 3 },
  { key: 'description', label: 'Booking description', rows: 3 },
  { key: 'railHeadline', label: 'Booking rail headline', rows: 2 },
  { key: 'railDescription', label: 'Booking rail description', rows: 3 },
  { key: 'railEyebrow', label: 'Booking rail eyebrow' },
  { key: 'currentMonthLabel', label: 'Current month label' },
  { key: 'selectedDayLabel', label: 'Selected day label' },
  { key: 'nextOpeningLabel', label: 'Next opening label' },
  { key: 'liveDeskLabel', label: 'Live desk label' },
  { key: 'noFutureDatesText', label: 'No future dates text', rows: 2 },
  { key: 'nextOpeningPendingLabel', label: 'Next opening pending label' },
  { key: 'nearestPublishedSuffix', label: 'Nearest published suffix' },
  { key: 'publishedDateSingularLabel', label: 'Published date singular label' },
  { key: 'publishedDatePluralLabel', label: 'Published date plural label' },
  { key: 'slotSingularLabel', label: 'Slot singular label' },
  { key: 'slotPluralLabel', label: 'Slot plural label' },
  { key: 'signInRequiredToast', label: 'Sign-in required toast', rows: 2 },
  { key: 'availabilityLoadError', label: 'Availability load error', rows: 2 },
  { key: 'signInPrompt', label: 'Sign-in prompt', rows: 3 },
  { key: 'signInCtaLabel', label: 'Sign-in CTA label' },
  { key: 'datePanelTitle', label: 'Date panel title' },
  { key: 'datePanelDescription', label: 'Date panel description', rows: 2 },
  { key: 'openInMonthLabelPrefix', label: 'Open month label prefix' },
  { key: 'loadingAvailabilityText', label: 'Loading availability text' },
  { key: 'availabilityHint', label: 'Availability hint', rows: 2 },
  { key: 'nextOpenDateLabel', label: 'Next open date label' },
  { key: 'noMonthAvailabilityText', label: 'No month availability text', rows: 2 },
  { key: 'slotsPanelDescription', label: 'Slots panel description', rows: 2 },
  { key: 'slotsAvailableSuffix', label: 'Slots available suffix' },
  { key: 'chooseTimeLabel', label: 'Choose time label' },
  { key: 'dayOffTitle', label: 'Day off empty title', rows: 2 },
  { key: 'noSlotsTitle', label: 'No slots empty title', rows: 2 },
  { key: 'availabilityErrorTitle', label: 'Availability error title', rows: 2 },
  { key: 'emptyStateHint', label: 'Empty state hint', rows: 2 },
  { key: 'jumpNextDateLabel', label: 'Jump next date label' },
  { key: 'locationDescription', label: 'Location description', rows: 2 },
];
const bookingDeskModalFields: StringFieldConfig<'consultationDesk'>[] = [
  { key: 'modalConfirmTitle', label: 'Modal confirm title' },
  { key: 'modalConfirmDescription', label: 'Modal confirm description', rows: 2 },
  { key: 'modalDateLabel', label: 'Modal date label' },
  { key: 'modalTimeLabel', label: 'Modal time label' },
  { key: 'modalPatientLabel', label: 'Modal client label', aliases: ['patient label'] },
  { key: 'modalServiceTypeLabel', label: 'Modal service type label' },
  { key: 'modalNotesLabel', label: 'Modal notes label' },
  { key: 'modalNotesOptionalLabel', label: 'Modal notes optional label' },
  { key: 'modalNotesPlaceholder', label: 'Modal notes placeholder', rows: 2 },
  { key: 'modalBackLabel', label: 'Modal back label' },
  { key: 'modalConfirmButtonLabel', label: 'Modal confirm button label' },
  { key: 'modalConfirmingLabel', label: 'Modal confirming label' },
  { key: 'modalSuccessTitle', label: 'Modal success title' },
  { key: 'modalSuccessDescription', label: 'Modal success description', rows: 2 },
  { key: 'modalDateTimeLabel', label: 'Modal date/time label' },
  { key: 'modalServiceLabel', label: 'Modal service label' },
  { key: 'modalEmailQueuedPrefix', label: 'Modal email queued prefix' },
  { key: 'modalDashboardFallback', label: 'Modal dashboard fallback', rows: 2 },
  { key: 'modalDoneLabel', label: 'Modal done label' },
  { key: 'modalViewAppointmentsLabel', label: 'Modal appointments label' },
  { key: 'modalCloseAriaLabel', label: 'Modal close aria label' },
];
const footerCtaFields: StringFieldConfig<'footer'>[] = [
  { key: 'ctaEyebrow', label: 'Footer CTA eyebrow' },
  { key: 'ctaHeadline', label: 'Footer CTA headline', rows: 3 },
  { key: 'ctaDescription', label: 'Footer CTA description', rows: 3 },
  { key: 'bookingCtaLabel', label: 'Footer booking label' },
  { key: 'bookingCtaHref', label: 'Footer booking link' },
  { key: 'artCtaLabel', label: 'Footer art label' },
  { key: 'artCtaHref', label: 'Footer art link' },
];
const footerDetailFields: StringFieldConfig<'footer'>[] = [
  { key: 'summary', label: 'Footer summary', rows: 3 },
  { key: 'affiliationLine', label: 'Affiliation line', rows: 3 },
  { key: 'closingLine', label: 'Closing line', rows: 2 },
  { key: 'ethicsLine', label: 'Ethics line', rows: 2 },
  { key: 'copyrightName', label: 'Copyright name' },
  { key: 'copyrightPrefix', label: 'Copyright prefix' },
  { key: 'copyrightSuffix', label: 'Copyright suffix' },
  { key: 'instagramUrl', label: 'Instagram URL' },
  { key: 'instagramLabel', label: 'Instagram link label' },
  { key: 'organizationLabel', label: 'Organization label' },
  { key: 'organizationUrl', label: 'Organization URL' },
  { key: 'exploreColumnTitle', label: 'Explore column title' },
  { key: 'visitColumnTitle', label: 'Visit column title' },
];

const structureSection: SearchableSection = {
  id: 'website-structure',
  label: 'Structure',
  title: 'Homepage Structure',
  description: 'Choose the order and visibility of public sections.',
  aliases: ['navigation', 'nav', 'homepage labels'],
};
const brandingSection: SearchableSection = {
  id: 'website-branding',
  label: 'Branding',
  title: 'Branding and Contact',
  description: 'Update identity details used across the navbar, footer, and browser title.',
  aliases: ['logo', 'contact', 'signin'],
};
const themeSection: SearchableSection = {
  id: 'website-theme',
  label: 'Theme',
  title: 'Theme and Motion',
  description: 'Set the first-visit default theme, motion scenes, and visitor theme dock behavior.',
  aliases: ['color', 'motion', 'background', 'default visitor theme'],
};
const heroProfileSection: SearchableSection = {
  id: 'website-hero-profile',
  label: 'Hero/Profile',
  title: 'Hero and Profile Copy',
  description: 'Edit the first impression and professional profile language seen by clients.',
  aliases: ['hero', 'profile', 'headline'],
};
const practiceSection: SearchableSection = {
  id: 'website-practice',
  label: 'Practice',
  title: 'Practice and Credentials',
  description: 'Publish the service positioning and formal proof points that support the practice.',
  aliases: ['services', 'credentials', 'roles'],
};
const artBookingSection: SearchableSection = {
  id: 'website-art-booking',
  label: 'Art/Booking',
  title: 'Art and Booking',
  description: 'Publish the visual voice, consultation story, and booking desk language.',
  aliases: ['booking', 'calendar', 'art', 'consultation'],
};
const footerSection: SearchableSection = {
  id: 'website-footer',
  label: 'Footer',
  title: 'Footer and Final CTAs',
  description: 'Control the final conversion block, contact summary, and external links.',
  aliases: ['footer', 'instagram', 'contact'],
};

function buildAnchorId(...parts: Array<string | number>) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getFieldAnchorId(sectionId: string, groupId: string, fieldKey: string) {
  return buildAnchorId(sectionId, groupId, fieldKey);
}

function getListAnchorId(sectionId: string, groupId: string, label: string) {
  return buildAnchorId(sectionId, groupId, label, 'list');
}

function getRowAnchorId(sectionId: string, groupId: string, label: string, index: number) {
  return buildAnchorId(sectionId, groupId, label, 'row', index + 1);
}

function getGroupAnchorId(sectionId: string, groupId: string) {
  return buildAnchorId(sectionId, groupId);
}

function getSectionRowAnchorId(sectionId: string, itemId: string) {
  return buildAnchorId(sectionId, itemId);
}

function findFocusable(element: HTMLElement | null) {
  if (!element) return null;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
  ) {
    return element;
  }

  return element.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]:not([tabindex="-1"])');
}

function highlightMatch(text: string, terms: string[]) {
  if (!terms.length) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const firstMatch = terms
    .map((term) => lowerText.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstMatch === undefined) {
    return text;
  }

  const term = terms.find((candidate) => lowerText.indexOf(candidate.toLowerCase()) === firstMatch) || terms[0];
  const end = firstMatch + term.length;

  return (
    <>
      {text.slice(0, firstMatch)}
      <mark className="website-search-result__mark">{text.slice(firstMatch, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function FormField({
  label,
  value,
  rows,
  onChange,
  anchorId,
  isHighlighted,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
  anchorId?: string;
  isHighlighted?: boolean;
}) {
  return (
    <label
      className={`space-y-2 website-search-anchor${isHighlighted ? ' website-search-anchor--active' : ''}`}
      data-search-anchor={anchorId}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
        {label}
      </span>
      {rows ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="theme-textarea resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="theme-input"
        />
      )}
    </label>
  );
}

function ListField({
  label,
  values,
  onChange,
  hint,
  anchorId,
  isHighlighted,
}: {
  label: string;
  values: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  anchorId?: string;
  isHighlighted?: boolean;
}) {
  return (
    <label
      className={`space-y-2 website-search-anchor${isHighlighted ? ' website-search-anchor--active' : ''}`}
      data-search-anchor={anchorId}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
        {label}
      </span>
      <textarea
        value={values.join('\n')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((entry) => entry.trim())
              .filter(Boolean)
          )
        }
        rows={4}
        className="theme-textarea resize-y"
      />
      {hint ? <p className="text-xs leading-5 text-[rgb(var(--theme-muted-rgb))]">{hint}</p> : null}
    </label>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
  isDimmed = false,
  isHighlighted = false,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  isDimmed?: boolean;
  isHighlighted?: boolean;
}) {
  return (
    <section
      id={id}
      data-search-anchor={id}
      className={`website-settings-card theme-panel website-search-anchor${isDimmed ? ' website-settings-card--dimmed' : ''}${isHighlighted ? ' website-search-anchor--active' : ''}`}
    >
      <div className="website-settings-card__header">
        <h3 className="font-heading text-2xl font-semibold text-[rgb(var(--theme-text-rgb))]">{title}</h3>
        <p className="text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">{description}</p>
      </div>
      <div className="website-settings-card__body">{children}</div>
    </section>
  );
}

function FieldGroup({
  title,
  description,
  children,
  anchorId,
  isHighlighted,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  anchorId?: string;
  isHighlighted?: boolean;
}) {
  return (
    <div
      className={`website-field-group website-search-anchor${isHighlighted ? ' website-search-anchor--active' : ''}`}
      data-search-anchor={anchorId}
    >
      <div>
        <p className="website-field-group__title">{title}</p>
        {description ? <p className="website-field-group__description">{description}</p> : null}
      </div>
      <div className="website-field-group__fields">{children}</div>
    </div>
  );
}

function StructuredListField<T extends object>({
  label,
  values,
  fields,
  createItem,
  onChange,
  anchorId,
  highlightedAnchorId,
  sectionId,
  groupId,
}: {
  label: string;
  values: T[];
  fields: StructuredFieldConfig<T>[];
  createItem: () => T;
  onChange: (value: T[]) => void;
  anchorId?: string;
  highlightedAnchorId?: string | null;
  sectionId: string;
  groupId: string;
}) {
  const updateItem = (index: number, key: keyof T, value: string) => {
    onChange(values.map((item, itemIndex) => (itemIndex === index ? ({ ...item, [key]: value } as T) : item)));
  };
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= values.length) {
      return;
    }
    const nextValues = [...values];
    [nextValues[index], nextValues[nextIndex]] = [nextValues[nextIndex], nextValues[index]];
    onChange(nextValues);
  };

  return (
    <div
      className={`space-y-3 website-search-anchor${highlightedAnchorId === anchorId ? ' website-search-anchor--active' : ''}`}
      data-search-anchor={anchorId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">{label}</p>
        <button type="button" className="theme-button-secondary px-4 py-2 text-xs" onClick={() => onChange([...values, createItem()])}>
          Add item
        </button>
      </div>
      <div className="website-structured-list">
        {values.map((item, index) => (
          <div
            key={`${label}-${index}`}
            className={`website-structured-item website-search-anchor${highlightedAnchorId === getRowAnchorId(sectionId, groupId, label, index) ? ' website-search-anchor--active' : ''}`}
            data-search-anchor={getRowAnchorId(sectionId, groupId, label, index)}
          >
            <div className="website-structured-item__header">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                Item {index + 1}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-label={`Move ${label} item ${index + 1} up`} onClick={() => moveItem(index, 'up')} disabled={index === 0} className="website-icon-button disabled:opacity-40">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Move ${label} item ${index + 1} down`} onClick={() => moveItem(index, 'down')} disabled={index === values.length - 1} className="website-icon-button disabled:opacity-40">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" className="theme-button-secondary px-3 py-2 text-xs" onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>
                  Remove
                </button>
              </div>
            </div>
            <div className="website-fields-grid">
              {fields.map((field) => (
                <label key={String(field.key)} className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">
                    {field.label}
                  </span>
                  {field.type === 'icon' ? (
                    <select value={String(item[field.key] ?? '')} onChange={(event) => updateItem(index, field.key, event.target.value)} className="theme-select">
                      {siteIconOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.rows || field.type === 'textarea' ? (
                    <textarea
                      value={String(item[field.key] ?? '')}
                      onChange={(event) => updateItem(index, field.key, event.target.value)}
                      rows={field.rows || 3}
                      className="theme-textarea resize-y"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(item[field.key] ?? '')}
                      onChange={(event) => updateItem(index, field.key, event.target.value)}
                      className="theme-input"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const structureGroup: SearchableFieldGroup = {
  id: 'section-order',
  title: 'Section order',
  description: 'Control what appears on the public homepage and how visitors move through the story.',
  aliases: ['navigation labels', 'homepage order'],
};
const brandingIdentityGroup: SearchableFieldGroup = {
  id: 'identity',
  title: 'Identity',
  description: 'These fields shape the browser title, header, and first public brand impression.',
  aliases: ['branding', 'logo', 'header'],
};
const publicAppShellGroup: SearchableFieldGroup = {
  id: 'public-app-shell',
  title: 'Public app shell',
  description: 'Small public labels used before or around the main website experience.',
  aliases: ['loader', 'route loading', 'skip link'],
};
const signInModalGroup: SearchableFieldGroup = {
  id: 'sign-in-modal',
  title: 'Sign-in modal',
  description: 'Copy shown when visitors sign in before booking or viewing their dashboard.',
  aliases: ['login', 'signin', 'otp'],
};
const contactGroup: SearchableFieldGroup = {
  id: 'contact-details',
  title: 'Contact details',
  description: 'Used in the footer and anywhere the site needs a practical contact path.',
  aliases: ['email', 'phone', 'location'],
};
const themeBaselineGroup: SearchableFieldGroup = {
  id: 'theme-baseline',
  title: 'Default visitor theme',
  description: 'Choose the theme new visitors see before they make a personal style choice.',
  aliases: ['preset', 'theme dock', 'default color', 'first visit theme'],
};
const motionScenesGroup: SearchableFieldGroup = {
  id: 'motion-scenes',
  title: 'Motion scenes',
  description: 'Choose the generated frame sequences used in the main visual moments.',
  aliases: ['scene', 'hero scene', 'art scene'],
};
const advancedThemeGroup: SearchableFieldGroup = {
  id: 'advanced-theme-values',
  title: 'Advanced theme values',
  description: 'Tune surfaces, contrast, palette, and motion density without hunting through the full form.',
  aliases: ['colors', 'surface mode', 'contrast'],
};
const heroGroup: SearchableFieldGroup = {
  id: 'hero',
  title: 'Hero',
  description: 'The top of the public homepage: headline, summary, and two primary actions.',
  aliases: ['headline', 'cta', 'support note'],
};
const profileGroup: SearchableFieldGroup = {
  id: 'professional-profile',
  title: 'Professional profile',
  description: 'The profile section copy and the supporting role panel.',
  aliases: ['ethos', 'role panel'],
};
const practiceCopyGroup: SearchableFieldGroup = {
  id: 'practice-copy',
  title: 'Practice copy',
  description: 'Service section headings, intro copy, and the highlighted service card.',
  aliases: ['services', 'benefits', 'practice cards'],
};
const credentialsGroup: SearchableFieldGroup = {
  id: 'credentials',
  title: 'Credentials',
  description: 'Formal study, role history, and the credential rail copy.',
  aliases: ['roles', 'education', 'timeline'],
};
const artStudioGroup: SearchableFieldGroup = {
  id: 'art-studio',
  title: 'Art studio',
  description: 'Public language around visual thinking, illustration, and artwork calls to action.',
  aliases: ['gallery', 'instagram', 'artwork'],
};
const consultationExperienceGroup: SearchableFieldGroup = {
  id: 'consultation-experience',
  title: 'Consultation experience',
  description: 'The section that explains what happens before and after a consultation.',
  aliases: ['steps', 'fact cards', 'outcome'],
};
const bookingDeskGroup: SearchableFieldGroup = {
  id: 'booking-desk',
  title: 'Booking desk',
  description: 'Copy for the date picker, booking rail, and appointment confirmation area.',
  aliases: ['calendar', 'slots', 'booking modal'],
};
const footerCtaGroup: SearchableFieldGroup = {
  id: 'footer-cta',
  title: 'Footer calls to action',
  description: 'The final invitation at the end of the public website.',
  aliases: ['footer buttons', 'final cta'],
};
const footerDetailsGroup: SearchableFieldGroup = {
  id: 'footer-details',
  title: 'Footer details',
  description: 'Supporting summary, affiliation, ethics line, and organization links.',
  aliases: ['instagram', 'copyright', 'organization'],
};

function ThemeSwatchStrip({ colors }: { colors: string[] }) {
  return (
    <div className="website-theme-swatch-strip" aria-hidden="true">
      {colors.map((color) => (
        <span key={color} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export default function WebsiteSettingsPanel({ adminId, adminEmail }: WebsiteSettingsPanelProps) {
  const { siteSettings, loading, error } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>(siteSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [highlightedAnchorId, setHighlightedAnchorId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(siteSettings);
  }, [siteSettings]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(siteSettings),
    [draft, siteSettings]
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateSectionField = <
    S extends ObjectSectionKey,
    K extends keyof SiteSettings[S]
  >(
    section: S,
    key: K,
    value: SiteSettings[S][K]
  ) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...(current[section] as Record<string, unknown>),
        [key]: value,
      } as unknown as SiteSettings[S],
    }));
  };

  const renderFields = <S extends ObjectSectionKey>(
    section: S,
    fields: StringFieldConfig<S>[],
    sectionId: string,
    groupId: string
  ) =>
    fields.map((field) => (
      <div key={String(field.key)}>
        <FormField
          label={field.label}
          value={String(draft[section][field.key] ?? '')}
          rows={field.rows}
          anchorId={getFieldAnchorId(sectionId, groupId, String(field.key))}
          isHighlighted={highlightedAnchorId === getFieldAnchorId(sectionId, groupId, String(field.key))}
          onChange={(value) => updateSectionField(section, field.key, value as SiteSettings[S][typeof field.key])}
        />
      </div>
    ));

  const renderBooleanFields = <S extends ObjectSectionKey>(
    section: S,
    fields: BooleanFieldConfig<S>[],
    sectionId: string,
    groupId: string
  ) =>
    fields.map((field) => {
      const anchorId = getFieldAnchorId(sectionId, groupId, String(field.key));
      const isChecked = Boolean(draft[section][field.key]);

      return (
        <label
          key={String(field.key)}
          className={`website-search-anchor flex items-start gap-3 rounded-[calc(var(--theme-radius-md)+0.08rem)] border border-[rgb(var(--theme-line-rgb)/0.25)] bg-[rgb(var(--theme-surface-rgb)/0.56)] px-4 py-3${highlightedAnchorId === anchorId ? ' website-search-anchor--active' : ''}`}
          data-search-anchor={anchorId}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => updateSectionField(section, field.key, event.target.checked as SiteSettings[S][typeof field.key])}
            className="mt-1 h-4 w-4 accent-[rgb(var(--theme-primary-rgb))]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{field.label}</span>
            <span className="mt-1 block text-xs leading-5 text-[rgb(var(--theme-muted-rgb))]">{field.description}</span>
          </span>
        </label>
      );
    });

  const updateHomepageLabel = (sectionId: HomepageSectionId, value: string) => {
    setDraft((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        labels: {
          ...current.homepage.labels,
          [sectionId]: value,
        },
      },
    }));
  };

  const moveSection = (sectionId: HomepageSectionId, direction: 'up' | 'down') => {
    setDraft((current) => {
      const nextOrder = [...current.homepage.sectionOrder];
      const index = nextOrder.indexOf(sectionId);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= nextOrder.length) {
        return current;
      }
      [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
      return {
        ...current,
        homepage: { ...current.homepage, sectionOrder: nextOrder },
      };
    });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const nextSettings = sanitizeSiteSettings({
        ...draft,
        theme: sanitizeThemeState(draft.theme, themePresets),
      });
      await setDoc(doc(db, 'settings', siteSettingsDocId), nextSettings);
      toast.success('Website settings published');
      if (adminId) {
        void logAudit(adminId, adminEmail || 'unknown', 'UPDATE_SITE_SETTINGS', 'Published website CMS updates.');
      }
    } catch (saveError: any) {
      toast.error(saveError.message || 'Failed to publish settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sceneOptions = Object.keys(frameSequenceManifest) as Array<keyof typeof frameSequenceManifest>;
  const currentPreset = themePresets.find((preset) => preset.id === draft.theme.presetId) || themePresets[0];
  const visibleSectionCount = draft.homepage.sectionOrder.filter((sectionId) => draft.homepage.visibility[sectionId]).length;
  const settingsNavItems = [
    { ...structureSection, description: `${visibleSectionCount} visible sections` },
    { ...brandingSection, description: draft.branding.wordmark },
    { ...themeSection, description: `Default: ${currentPreset.label}` },
    { ...heroProfileSection, description: 'First impression copy' },
    { ...practiceSection, description: 'Services and credentials' },
    { ...artBookingSection, description: 'Visual and booking copy' },
    { ...footerSection, description: 'Contact and final CTA' },
  ];

  const buildFieldSearchItems = useCallback(
    <S extends ObjectSectionKey>(
      sectionKey: S,
      sectionMeta: SearchableSection,
      groupMeta: SearchableFieldGroup,
      fields: StringFieldConfig<S>[]
    ): WebsiteSearchItem[] =>
      fields.map((field) => ({
        id: `${sectionMeta.id}-${groupMeta.id}-${String(field.key)}`,
        sectionId: sectionMeta.id,
        sectionTitle: sectionMeta.label,
        groupId: groupMeta.id,
        groupTitle: groupMeta.title,
        label: field.label,
        description: groupMeta.description,
        valueText: String(draft[sectionKey][field.key] ?? ''),
        aliases: field.aliases,
        breadcrumbs: [sectionMeta.label, groupMeta.title, field.label],
        anchorId: getFieldAnchorId(sectionMeta.id, groupMeta.id, String(field.key)),
        kind: 'field',
      })),
    [draft]
  );

  const buildBooleanFieldSearchItems = useCallback(
    <S extends ObjectSectionKey>(
      sectionKey: S,
      sectionMeta: SearchableSection,
      groupMeta: SearchableFieldGroup,
      fields: BooleanFieldConfig<S>[]
    ): WebsiteSearchItem[] =>
      fields.map((field) => ({
        id: `${sectionMeta.id}-${groupMeta.id}-${String(field.key)}`,
        sectionId: sectionMeta.id,
        sectionTitle: sectionMeta.label,
        groupId: groupMeta.id,
        groupTitle: groupMeta.title,
        label: field.label,
        description: field.description,
        valueText: draft[sectionKey][field.key] ? 'enabled visible on' : 'disabled hidden off',
        aliases: field.aliases,
        breadcrumbs: [sectionMeta.label, groupMeta.title, field.label],
        anchorId: getFieldAnchorId(sectionMeta.id, groupMeta.id, String(field.key)),
        kind: 'field',
      })),
    [draft]
  );

  const buildListSearchItem = useCallback(
    (sectionMeta: SearchableSection, groupMeta: SearchableFieldGroup, label: string, values: string[], aliases?: string[]): WebsiteSearchItem => ({
      id: `${sectionMeta.id}-${groupMeta.id}-${buildAnchorId(label)}`,
      sectionId: sectionMeta.id,
      sectionTitle: sectionMeta.label,
      groupId: groupMeta.id,
      groupTitle: groupMeta.title,
      label,
      description: groupMeta.description,
      valueText: values.join(' '),
      aliases,
      breadcrumbs: [sectionMeta.label, groupMeta.title, label],
      anchorId: getListAnchorId(sectionMeta.id, groupMeta.id, label),
      kind: 'list',
    }),
    []
  );

  const buildStructuredListItems = useCallback(
    <T extends object>(
      sectionMeta: SearchableSection,
      groupMeta: SearchableFieldGroup,
      label: string,
      values: T[],
      fields: StructuredFieldConfig<T>[],
      aliases?: string[]
    ): WebsiteSearchItem[] => {
      const listItem: WebsiteSearchItem = {
        id: `${sectionMeta.id}-${groupMeta.id}-${buildAnchorId(label)}-list`,
        sectionId: sectionMeta.id,
        sectionTitle: sectionMeta.label,
        groupId: groupMeta.id,
        groupTitle: groupMeta.title,
        label,
        description: groupMeta.description,
        valueText: values
          .map((item) => fields.map((field) => String(item[field.key] ?? '')).filter(Boolean).join(' '))
          .join(' '),
        aliases,
        breadcrumbs: [sectionMeta.label, groupMeta.title, label],
        anchorId: getListAnchorId(sectionMeta.id, groupMeta.id, label),
        kind: 'list',
      };

      const rowItems = values.map((item, index) => ({
        id: `${sectionMeta.id}-${groupMeta.id}-${buildAnchorId(label)}-row-${index + 1}`,
        sectionId: sectionMeta.id,
        sectionTitle: sectionMeta.label,
        groupId: groupMeta.id,
        groupTitle: groupMeta.title,
        label: `${label} item ${index + 1}`,
        description: groupMeta.description,
        valueText: fields.map((field) => String(item[field.key] ?? '')).filter(Boolean).join(' '),
        aliases,
        breadcrumbs: [sectionMeta.label, groupMeta.title, label, `Item ${index + 1}`],
        anchorId: getRowAnchorId(sectionMeta.id, groupMeta.id, label, index),
        kind: 'row' as const,
      }));

      return [listItem, ...rowItems];
    },
    []
  );

  const searchItems = useMemo<WebsiteSearchItem[]>(() => {
    const items: WebsiteSearchItem[] = settingsNavItems.map((section) => ({
      id: section.id,
      sectionId: section.id,
      sectionTitle: section.label,
      label: section.title,
      description: section.description,
      aliases: section.aliases,
      breadcrumbs: [section.label],
      anchorId: section.id,
      kind: 'section',
    }));

    const pushGroupItem = (sectionMeta: SearchableSection, groupMeta: SearchableFieldGroup) => {
      items.push({
        id: `${sectionMeta.id}-${groupMeta.id}`,
        sectionId: sectionMeta.id,
        sectionTitle: sectionMeta.label,
        groupId: groupMeta.id,
        groupTitle: groupMeta.title,
        label: groupMeta.title,
        description: groupMeta.description,
        aliases: groupMeta.aliases,
        breadcrumbs: [sectionMeta.label, groupMeta.title],
        anchorId: getGroupAnchorId(sectionMeta.id, groupMeta.id),
        kind: 'group',
      });
    };

    pushGroupItem(structureSection, structureGroup);
    draft.homepage.sectionOrder.forEach((sectionId, index) => {
      items.push({
        id: `${structureSection.id}-${sectionId}`,
        sectionId: structureSection.id,
        sectionTitle: structureSection.label,
        groupId: structureGroup.id,
        groupTitle: structureGroup.title,
        label: `${homepageSectionMeta[sectionId].label} navigation label`,
        description: `Position ${index + 1} and visibility settings.`,
        valueText: `${draft.homepage.labels[sectionId]} ${draft.homepage.visibility[sectionId] ? 'visible' : 'hidden'}`,
        aliases: [homepageSectionMeta[sectionId].href, 'nav label', 'menu label'],
        breadcrumbs: [structureSection.label, structureGroup.title, homepageSectionMeta[sectionId].label],
        anchorId: getSectionRowAnchorId(structureSection.id, sectionId),
        kind: 'row',
      });
    });

    [
      [brandingSection, brandingIdentityGroup, 'branding', brandingIdentityFields],
      [brandingSection, publicAppShellGroup, 'appCopy', appCopyFields],
      [brandingSection, signInModalGroup, 'loginModal', loginModalFields],
      [brandingSection, contactGroup, 'branding', contactFields],
      [heroProfileSection, heroGroup, 'hero', heroFields],
      [heroProfileSection, profileGroup, 'ethos', profileFields],
      [practiceSection, practiceCopyGroup, 'services', practiceFields],
      [practiceSection, credentialsGroup, 'credentials', credentialsFields],
      [artBookingSection, artStudioGroup, 'artStudio', artStudioFields],
      [artBookingSection, consultationExperienceGroup, 'consultationExperience', consultationExperienceFields],
      [artBookingSection, bookingDeskGroup, 'consultationDesk', bookingDeskFields],
      [artBookingSection, bookingDeskGroup, 'consultationDesk', bookingDeskModalFields],
      [footerSection, footerCtaGroup, 'footer', footerCtaFields],
      [footerSection, footerDetailsGroup, 'footer', footerDetailFields],
    ].forEach(([sectionMeta, groupMeta, sectionKey, fields]) => {
      pushGroupItem(sectionMeta as SearchableSection, groupMeta as SearchableFieldGroup);
      items.push(...buildFieldSearchItems(sectionKey as ObjectSectionKey, sectionMeta as SearchableSection, groupMeta as SearchableFieldGroup, fields as StringFieldConfig<ObjectSectionKey>[]));
    });
    items.push(...buildBooleanFieldSearchItems('loginModal', brandingSection, signInModalGroup, loginModalControls));

    items.push(buildListSearchItem(heroProfileSection, heroGroup, 'Hero badges', draft.hero.badges, ['badges', 'hero tags']));
    items.push(...buildStructuredListItems(heroProfileSection, heroGroup, 'Hero trust cards', draft.hero.trustCards, textCardFields, ['trust cards']));
    items.push(...buildStructuredListItems(heroProfileSection, heroGroup, 'Hero note cards', draft.hero.noteCards, textCardFields, ['note cards']));
    items.push(buildListSearchItem(practiceSection, practiceCopyGroup, 'Practice highlights', draft.services.benefits, ['benefits', 'highlights']));
    items.push(...buildStructuredListItems(practiceSection, practiceCopyGroup, 'Practice cards', draft.services.practiceCards, textCardFields, ['practice areas']));
    items.push(buildListSearchItem(practiceSection, credentialsGroup, 'Credential highlights', draft.credentials.highlights, ['credential highlights']));
    items.push(...buildStructuredListItems(practiceSection, credentialsGroup, 'Professional roles', draft.credentials.professionalRoles, timelineFields, ['roles', 'experience']));
    items.push(...buildStructuredListItems(practiceSection, credentialsGroup, 'Education timeline', draft.credentials.educationTimeline, timelineFields, ['education', 'study']));
    items.push(buildListSearchItem(artBookingSection, consultationExperienceGroup, 'Consultation fact cards', draft.consultationExperience.factCards, ['fact cards']));
    items.push(...buildStructuredListItems(artBookingSection, consultationExperienceGroup, 'Consultation steps', draft.consultationExperience.steps, textCardFields, ['steps']));
    items.push(...buildStructuredListItems(artBookingSection, bookingDeskGroup, 'Booking proof strip', draft.consultationDesk.proofItems, bookingProofFields, ['proof strip']));
    items.push(...buildStructuredListItems(artBookingSection, bookingDeskGroup, 'Booking service types', draft.consultationDesk.serviceTypes, bookingServiceFields, ['service types']));
    items.push(
      {
        id: 'theme-studio-enabled',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: themeBaselineGroup.id,
        groupTitle: themeBaselineGroup.title,
        label: 'Visitor theme dock visibility',
        description: themeBaselineGroup.description,
        valueText: draft.themeStudioEnabled ? 'theme dock visible enabled' : 'theme dock hidden disabled',
        aliases: ['theme dock', 'visitor theme dock'],
        breadcrumbs: [themeSection.label, themeBaselineGroup.title, 'Visitor theme dock'],
        anchorId: getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'themeStudioEnabled'),
        kind: 'field',
      },
      {
        id: 'theme-preset',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: themeBaselineGroup.id,
        groupTitle: themeBaselineGroup.title,
        label: 'Default visitor theme',
        description: themeBaselineGroup.description,
        valueText: `${currentPreset.label} ${currentPreset.family} ${currentPreset.description}`,
        aliases: ['preset', 'theme default', 'default color', 'first visit theme', 'shipped theme', 'global theme'],
        breadcrumbs: [themeSection.label, themeBaselineGroup.title, 'Default visitor theme'],
        anchorId: getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'presetId'),
        kind: 'field',
      },
      {
        id: 'theme-hero-scene',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: motionScenesGroup.id,
        groupTitle: motionScenesGroup.title,
        label: 'Hero scene',
        description: motionScenesGroup.description,
        valueText: frameSequenceManifest[draft.motion.heroSceneId]?.label || draft.motion.heroSceneId,
        aliases: ['scene', 'hero animation'],
        breadcrumbs: [themeSection.label, motionScenesGroup.title, 'Hero scene'],
        anchorId: getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'heroSceneId'),
        kind: 'field',
      },
      {
        id: 'theme-art-scene',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: motionScenesGroup.id,
        groupTitle: motionScenesGroup.title,
        label: 'Art scene',
        description: motionScenesGroup.description,
        valueText: frameSequenceManifest[draft.motion.artSceneId]?.label || draft.motion.artSceneId,
        aliases: ['art animation'],
        breadcrumbs: [themeSection.label, motionScenesGroup.title, 'Art scene'],
        anchorId: getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'artSceneId'),
        kind: 'field',
      },
      {
        id: 'theme-surface-mode',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: advancedThemeGroup.id,
        groupTitle: advancedThemeGroup.title,
        label: 'Surface mode',
        description: advancedThemeGroup.description,
        valueText: draft.theme.controls.surfaceMode,
        aliases: ['surface', 'background mode'],
        breadcrumbs: [themeSection.label, advancedThemeGroup.title, 'Surface mode'],
        anchorId: getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'surfaceMode'),
        kind: 'field',
      },
      {
        id: 'theme-contrast-mode',
        sectionId: themeSection.id,
        sectionTitle: themeSection.label,
        groupId: advancedThemeGroup.id,
        groupTitle: advancedThemeGroup.title,
        label: 'Contrast mode',
        description: advancedThemeGroup.description,
        valueText: draft.theme.controls.contrastMode,
        aliases: ['contrast'],
        breadcrumbs: [themeSection.label, advancedThemeGroup.title, 'Contrast mode'],
        anchorId: getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'contrastMode'),
        kind: 'field',
      }
    );
    items.push(buildListSearchItem(themeSection, advancedThemeGroup, 'Theme colors', [draft.theme.colors.background, draft.theme.colors.primary, draft.theme.colors.accent, draft.theme.colors.text], ['colors', 'palette']));
    items.push(buildListSearchItem(themeSection, advancedThemeGroup, 'Theme controls', [String(draft.theme.controls.radiusScale), String(draft.theme.controls.shadowDepth), String(draft.theme.controls.grainIntensity), String(draft.theme.controls.motionDensity), String(draft.motion.pointerStrength)], ['radius', 'shadow', 'motion density', 'pointer strength']));

    return items;
  }, [buildBooleanFieldSearchItems, buildFieldSearchItems, buildListSearchItem, buildStructuredListItems, currentPreset.label, draft, settingsNavItems]);

  const searchResults = useMemo(() => searchWebsiteSettings(searchItems, searchQuery, 14), [searchItems, searchQuery]);
  const matchedSectionIds = useMemo(() => new Set(searchResults.map((item) => item.sectionId)), [searchResults]);

  useEffect(() => {
    setActiveResultIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (searchShellRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsSearchOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isSearchOpen]);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    setIsSearchOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.closest('[contenteditable="true"]'));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget) {
        event.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusSearch]);

  const jumpToResult = useCallback((result: WebsiteSearchResult) => {
    const element = document.querySelector<HTMLElement>(`[data-search-anchor="${result.anchorId}"]`);
    const fallbackSection = document.getElementById(result.sectionId);
    const target = element || fallbackSection;
    if (!target) {
      return;
    }

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    setIsSearchOpen(false);
    setHighlightedAnchorId(result.anchorId);
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      findFocusable(target)?.focus({ preventScroll: true });
    }, 220);
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightedAnchorId((current) => (current === result.anchorId ? null : current)), 2100);
  }, []);

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length && event.key !== 'Escape') {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveResultIndex((current) => (current + 1) % Math.max(searchResults.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveResultIndex((current) => (current - 1 + Math.max(searchResults.length, 1)) % Math.max(searchResults.length, 1));
    } else if (event.key === 'Enter' && searchResults[activeResultIndex]) {
      event.preventDefault();
      jumpToResult(searchResults[activeResultIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        setIsSearchOpen(false);
      }
    }
  };

  return (
    <form onSubmit={handleSave} className="website-settings-form">
      {error ? <div className="theme-panel p-5 text-sm text-[rgb(var(--theme-muted-rgb))]">{error}</div> : null}

      <section className="website-settings-hero theme-panel">
        <div className="flex flex-col gap-6 border-b border-[rgb(var(--theme-line-rgb)/0.22)] pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <span className="theme-chip">Website CMS</span>
            <div className="space-y-2">
              <h2 className="website-settings-hero__title">Instant-live control for the public site</h2>
              <p className="max-w-3xl text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">
                Structure, CTA links, copy, theme defaults, and motion all publish directly from here.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setDraft(siteSettings)} disabled={!isDirty || loading || isSaving} className="theme-button-secondary disabled:opacity-50">
              <RefreshCcw className="h-4 w-4" />
              Reload Live
            </button>
            <button type="button" onClick={() => setDraft(defaultSiteSettings)} disabled={isSaving} className="theme-button-secondary disabled:opacity-50">
              <Paintbrush2 className="h-4 w-4" />
              Restore Defaults
            </button>
            <button type="submit" disabled={loading || !isDirty || isSaving} className="theme-button-primary disabled:opacity-50">
              <Save className="h-4 w-4" />
              {isSaving ? 'Publishing...' : 'Publish Website'}
            </button>
          </div>
        </div>

        <div className="website-settings-status-row">
          <span className="website-settings-status-pill">
            <CircleDot className="h-3.5 w-3.5" />
            {currentPreset.label}
          </span>
          <span className="website-settings-status-pill">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {visibleSectionCount} sections live
          </span>
          {isDirty ? <span className="website-settings-status-pill website-settings-status-pill--dirty">Unsaved changes</span> : null}
        </div>
      </section>

      <section ref={searchShellRef} className="website-settings-search theme-panel-soft">
        <div className="website-settings-search__bar">
          <Search className="h-4 w-4 text-[rgb(var(--theme-muted-rgb))]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="website-settings-search__input"
            placeholder="Search hero, footer, booking, client label, instagram, calendar..."
            aria-label="Search website settings"
          />
          <div className="website-settings-search__actions">
            {searchQuery ? (
              <button
                type="button"
                className="website-settings-search__clear"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear website settings search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <span className="website-settings-search__shortcut">Ctrl/Cmd + K</span>
          </div>
        </div>

        {(isSearchOpen || searchQuery) ? (
          <div className="website-settings-search__panel">
            {searchQuery ? (
              searchResults.length ? (
                <div className="website-settings-search__results" role="listbox" aria-label="Website settings search results">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      type="button"
                      role="option"
                      aria-selected={activeResultIndex === index}
                      className={`website-search-result${activeResultIndex === index ? ' website-search-result--active' : ''}`}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      onClick={() => jumpToResult(result)}
                    >
                      <span className="website-search-result__breadcrumbs">{result.breadcrumbs.join(' > ')}</span>
                      <span className="website-search-result__title">{highlightMatch(result.label, result.matchedTerms)}</span>
                      <span className="website-search-result__snippet">{highlightMatch(result.snippet, result.matchedTerms)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="website-settings-search__empty">
                  <Sparkles className="h-4 w-4" />
                  <span>No matching website controls yet. Try a broader term like booking, footer, hero, or client.</span>
                </div>
              )
            ) : (
              <div className="website-settings-search__suggestions">
                <p className="website-settings-search__suggestions-label">Quick finds</p>
                <div className="website-settings-search__chips">
                  {quickSearchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="website-settings-search__chip"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setIsSearchOpen(true);
                        searchInputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="website-settings-layout">
        <aside className="website-settings-nav" aria-label="Website settings sections">
          <div className="website-settings-nav__inner">
            <p className="website-settings-nav__eyebrow">Edit groups</p>
            <nav className="website-settings-nav__links">
              {settingsNavItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`website-settings-nav__link${searchQuery && !matchedSectionIds.has(item.id) ? ' website-settings-nav__link--dimmed' : ''}`}
                >
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="website-settings-sections">
        <SectionCard
          id={structureSection.id}
          title={structureSection.title}
          description={structureSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(structureSection.id)}
          isHighlighted={highlightedAnchorId === structureSection.id}
        >
          <FieldGroup
            title={structureGroup.title}
            description={structureGroup.description}
            anchorId={getGroupAnchorId(structureSection.id, structureGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(structureSection.id, structureGroup.id)}
          >
            <div className="website-section-order-list">
          {draft.homepage.sectionOrder.map((sectionId, index) => (
            <div
              key={sectionId}
              className={`website-section-order-item website-search-anchor${highlightedAnchorId === getSectionRowAnchorId(structureSection.id, sectionId) ? ' website-search-anchor--active' : ''}`}
              data-search-anchor={getSectionRowAnchorId(structureSection.id, sectionId)}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{homepageSectionMeta[sectionId].label}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Position {index + 1}</p>
                <input
                  type="text"
                  value={draft.homepage.labels[sectionId]}
                  onChange={(event) => updateHomepageLabel(sectionId, event.target.value)}
                  className="theme-input"
                  aria-label={`${homepageSectionMeta[sectionId].label} navigation label`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--theme-line-rgb)/0.25)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
                  <input type="checkbox" checked={draft.homepage.visibility[sectionId]} onChange={(event) => setDraft((current) => ({ ...current, homepage: { ...current.homepage, visibility: { ...current.homepage.visibility, [sectionId]: event.target.checked } } }))} className="h-4 w-4 accent-[rgb(var(--theme-primary-rgb))]" />
                  Visible
                </label>
                <button type="button" aria-label={`Move ${homepageSectionMeta[sectionId].label} up`} onClick={() => moveSection(sectionId, 'up')} disabled={index === 0} className="website-icon-button disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label={`Move ${homepageSectionMeta[sectionId].label} down`} onClick={() => moveSection(sectionId, 'down')} disabled={index === draft.homepage.sectionOrder.length - 1} className="website-icon-button disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={brandingSection.id}
          title={brandingSection.title}
          description={brandingSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(brandingSection.id)}
          isHighlighted={highlightedAnchorId === brandingSection.id}
        >
          <FieldGroup
            title={brandingIdentityGroup.title}
            description={brandingIdentityGroup.description}
            anchorId={getGroupAnchorId(brandingSection.id, brandingIdentityGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(brandingSection.id, brandingIdentityGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('branding', brandingIdentityFields, brandingSection.id, brandingIdentityGroup.id)}
            </div>
          </FieldGroup>
          <FieldGroup
            title={publicAppShellGroup.title}
            description={publicAppShellGroup.description}
            anchorId={getGroupAnchorId(brandingSection.id, publicAppShellGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(brandingSection.id, publicAppShellGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('appCopy', appCopyFields, brandingSection.id, publicAppShellGroup.id)}
            </div>
          </FieldGroup>
          <FieldGroup
            title={signInModalGroup.title}
            description={signInModalGroup.description}
            anchorId={getGroupAnchorId(brandingSection.id, signInModalGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(brandingSection.id, signInModalGroup.id)}
          >
            <div className="mb-4 grid gap-3">
              {renderBooleanFields('loginModal', loginModalControls, brandingSection.id, signInModalGroup.id)}
            </div>
            <div className="website-fields-grid">
              {renderFields('loginModal', loginModalFields, brandingSection.id, signInModalGroup.id)}
            </div>
          </FieldGroup>
          <FieldGroup
            title={contactGroup.title}
            description={contactGroup.description}
            anchorId={getGroupAnchorId(brandingSection.id, contactGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(brandingSection.id, contactGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('branding', contactFields, brandingSection.id, contactGroup.id)}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={themeSection.id}
          title={themeSection.title}
          description={themeSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(themeSection.id)}
          isHighlighted={highlightedAnchorId === themeSection.id}
        >
          <FieldGroup
            title={themeBaselineGroup.title}
            description={themeBaselineGroup.description}
            anchorId={getGroupAnchorId(themeSection.id, themeBaselineGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(themeSection.id, themeBaselineGroup.id)}
          >
            <div
              className={`website-default-theme-card website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'presetId') ? ' website-search-anchor--active' : ''}`}
              data-search-anchor={getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'presetId')}
            >
              <div className="website-default-theme-card__copy">
                <span className="website-default-theme-card__icon">
                  <Paintbrush2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="website-default-theme-card__eyebrow">Default for new visitors</p>
                  <h4 className="website-default-theme-card__title">{currentPreset.label}</h4>
                  <p className="website-default-theme-card__description">
                    This is the color theme visitors see when they have not chosen their own style yet. Their personal Style Dock choice stays on their device.
                  </p>
                </div>
              </div>
              <div className="website-default-theme-card__controls">
                <ThemeSwatchStrip
                  colors={[
                    draft.theme.colors.background,
                    draft.theme.colors.primary,
                    draft.theme.colors.accent,
                    draft.theme.colors.text,
                  ]}
                />
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Default visitor theme</span>
                  <select
                    value={draft.theme.presetId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        theme: createThemeState(themePresets.find((preset) => preset.id === event.target.value) || themePresets[0]),
                      }))
                    }
                    className="theme-select"
                  >
                    {themePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <label
              className={`inline-flex items-center gap-3 rounded-full border border-[rgb(var(--theme-line-rgb)/0.25)] px-4 py-2 text-sm website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'themeStudioEnabled') ? ' website-search-anchor--active' : ''}`}
              data-search-anchor={getFieldAnchorId(themeSection.id, themeBaselineGroup.id, 'themeStudioEnabled')}
            >
              <input type="checkbox" checked={draft.themeStudioEnabled} onChange={(event) => setDraft((current) => ({ ...current, themeStudioEnabled: event.target.checked }))} className="h-4 w-4 accent-[rgb(var(--theme-primary-rgb))]" />
              Keep visitor theme dock visible
            </label>
          </FieldGroup>
          <FieldGroup
            title={motionScenesGroup.title}
            description={motionScenesGroup.description}
            anchorId={getGroupAnchorId(themeSection.id, motionScenesGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(themeSection.id, motionScenesGroup.id)}
          >
            <div className="website-fields-grid">
              <label
                className={`space-y-2 website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'heroSceneId') ? ' website-search-anchor--active' : ''}`}
                data-search-anchor={getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'heroSceneId')}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Hero scene</span>
                <select value={draft.motion.heroSceneId} onChange={(event) => updateSectionField('motion', 'heroSceneId', event.target.value as never)} className="theme-select">
                  {sceneOptions.map((sceneId) => <option key={sceneId} value={sceneId}>{frameSequenceManifest[sceneId].label}</option>)}
                </select>
              </label>
              <label
                className={`space-y-2 website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'artSceneId') ? ' website-search-anchor--active' : ''}`}
                data-search-anchor={getFieldAnchorId(themeSection.id, motionScenesGroup.id, 'artSceneId')}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Art scene</span>
                <select value={draft.motion.artSceneId} onChange={(event) => updateSectionField('motion', 'artSceneId', event.target.value as never)} className="theme-select">
                  {sceneOptions.map((sceneId) => <option key={sceneId} value={sceneId}>{frameSequenceManifest[sceneId].label}</option>)}
                </select>
              </label>
            </div>
          </FieldGroup>
          <FieldGroup
            title={advancedThemeGroup.title}
            description={advancedThemeGroup.description}
            anchorId={getGroupAnchorId(themeSection.id, advancedThemeGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(themeSection.id, advancedThemeGroup.id)}
          >
            <div className="website-fields-grid">
              <label
                className={`space-y-2 website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'surfaceMode') ? ' website-search-anchor--active' : ''}`}
                data-search-anchor={getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'surfaceMode')}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Surface mode</span>
                <select value={draft.theme.controls.surfaceMode} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, surfaceMode: event.target.value as ThemeControls['surfaceMode'] } } }))} className="theme-select">
                  {surfaceModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label
                className={`space-y-2 website-search-anchor${highlightedAnchorId === getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'contrastMode') ? ' website-search-anchor--active' : ''}`}
                data-search-anchor={getFieldAnchorId(themeSection.id, advancedThemeGroup.id, 'contrastMode')}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Contrast</span>
                <select value={draft.theme.controls.contrastMode} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, contrastMode: event.target.value as ThemeControls['contrastMode'] } } }))} className="theme-select">
                  {contrastModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
            </div>
            <ListField
              label="Theme colors"
              values={[draft.theme.colors.background, draft.theme.colors.primary, draft.theme.colors.accent, draft.theme.colors.text]}
              anchorId={getListAnchorId(themeSection.id, advancedThemeGroup.id, 'Theme colors')}
              isHighlighted={highlightedAnchorId === getListAnchorId(themeSection.id, advancedThemeGroup.id, 'Theme colors')}
              onChange={(value) => setDraft((current) => ({ ...current, theme: sanitizeThemeState({ ...current.theme, colors: { background: value[0] || current.theme.colors.background, primary: value[1] || current.theme.colors.primary, accent: value[2] || current.theme.colors.accent, text: value[3] || current.theme.colors.text } }, themePresets) }))}
              hint="Use four lines: background, primary, accent, text."
            />
            <ListField
              label="Theme controls"
              values={[String(draft.theme.controls.radiusScale), String(draft.theme.controls.shadowDepth), String(draft.theme.controls.grainIntensity), String(draft.theme.controls.motionDensity), String(draft.motion.pointerStrength)]}
              anchorId={getListAnchorId(themeSection.id, advancedThemeGroup.id, 'Theme controls')}
              isHighlighted={highlightedAnchorId === getListAnchorId(themeSection.id, advancedThemeGroup.id, 'Theme controls')}
              onChange={(value) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, radiusScale: Number(value[0] || current.theme.controls.radiusScale), shadowDepth: Number(value[1] || current.theme.controls.shadowDepth), grainIntensity: Number(value[2] || current.theme.controls.grainIntensity), motionDensity: Number(value[3] || current.theme.controls.motionDensity) } }, motion: { ...current.motion, pointerStrength: Number(value[4] || current.motion.pointerStrength) } }))}
              hint="Use five lines: radius, shadow, texture, motion density, pointer strength."
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={heroProfileSection.id}
          title={heroProfileSection.title}
          description={heroProfileSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(heroProfileSection.id)}
          isHighlighted={highlightedAnchorId === heroProfileSection.id}
        >
          <FieldGroup
            title={heroGroup.title}
            description={heroGroup.description}
            anchorId={getGroupAnchorId(heroProfileSection.id, heroGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(heroProfileSection.id, heroGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('hero', heroFields, heroProfileSection.id, heroGroup.id)}
            </div>
            <ListField
              label="Hero badges"
              values={draft.hero.badges}
              anchorId={getListAnchorId(heroProfileSection.id, heroGroup.id, 'Hero badges')}
              isHighlighted={highlightedAnchorId === getListAnchorId(heroProfileSection.id, heroGroup.id, 'Hero badges')}
              onChange={(value) => updateSectionField('hero', 'badges', value as never)}
            />
            <StructuredListField
              label="Hero trust cards"
              values={draft.hero.trustCards}
              fields={textCardFields}
              sectionId={heroProfileSection.id}
              groupId={heroGroup.id}
              anchorId={getListAnchorId(heroProfileSection.id, heroGroup.id, 'Hero trust cards')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={(): SiteTextCard => ({ title: 'New trust card', description: 'Describe this trust point.', icon: 'shield' })}
              onChange={(value) => updateSectionField('hero', 'trustCards', value as never)}
            />
            <StructuredListField
              label="Hero note cards"
              values={draft.hero.noteCards}
              fields={textCardFields}
              sectionId={heroProfileSection.id}
              groupId={heroGroup.id}
              anchorId={getListAnchorId(heroProfileSection.id, heroGroup.id, 'Hero note cards')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={(): SiteTextCard => ({ title: 'New note', description: 'Describe this supporting note.', icon: 'sparkles' })}
              onChange={(value) => updateSectionField('hero', 'noteCards', value as never)}
            />
          </FieldGroup>
          <FieldGroup
            title={profileGroup.title}
            description={profileGroup.description}
            anchorId={getGroupAnchorId(heroProfileSection.id, profileGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(heroProfileSection.id, profileGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('ethos', profileFields, heroProfileSection.id, profileGroup.id)}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={practiceSection.id}
          title={practiceSection.title}
          description={practiceSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(practiceSection.id)}
          isHighlighted={highlightedAnchorId === practiceSection.id}
        >
          <FieldGroup
            title={practiceCopyGroup.title}
            description={practiceCopyGroup.description}
            anchorId={getGroupAnchorId(practiceSection.id, practiceCopyGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(practiceSection.id, practiceCopyGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('services', practiceFields, practiceSection.id, practiceCopyGroup.id)}
            </div>
            <ListField
              label="Practice highlights"
              values={draft.services.benefits}
              anchorId={getListAnchorId(practiceSection.id, practiceCopyGroup.id, 'Practice highlights')}
              isHighlighted={highlightedAnchorId === getListAnchorId(practiceSection.id, practiceCopyGroup.id, 'Practice highlights')}
              onChange={(value) => updateSectionField('services', 'benefits', value as never)}
            />
            <StructuredListField
              label="Practice cards"
              values={draft.services.practiceCards}
              fields={textCardFields}
              sectionId={practiceSection.id}
              groupId={practiceCopyGroup.id}
              anchorId={getListAnchorId(practiceSection.id, practiceCopyGroup.id, 'Practice cards')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={(): SiteTextCard => ({ title: 'New practice area', description: 'Describe this area of practice.', icon: 'heart' })}
              onChange={(value) => updateSectionField('services', 'practiceCards', value as never)}
            />
          </FieldGroup>
          <FieldGroup
            title={credentialsGroup.title}
            description={credentialsGroup.description}
            anchorId={getGroupAnchorId(practiceSection.id, credentialsGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(practiceSection.id, credentialsGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('credentials', credentialsFields, practiceSection.id, credentialsGroup.id)}
            </div>
            <ListField
              label="Credential highlights"
              values={draft.credentials.highlights}
              anchorId={getListAnchorId(practiceSection.id, credentialsGroup.id, 'Credential highlights')}
              isHighlighted={highlightedAnchorId === getListAnchorId(practiceSection.id, credentialsGroup.id, 'Credential highlights')}
              onChange={(value) => updateSectionField('credentials', 'highlights', value as never)}
            />
            <StructuredListField
              label="Professional roles"
              values={draft.credentials.professionalRoles}
              fields={timelineFields}
              sectionId={practiceSection.id}
              groupId={credentialsGroup.id}
              anchorId={getListAnchorId(practiceSection.id, credentialsGroup.id, 'Professional roles')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={() => ({ title: 'New role', institution: 'Organization', period: 'Date range', description: 'Describe the role.' })}
              onChange={(value) => updateSectionField('credentials', 'professionalRoles', value as never)}
            />
            <StructuredListField
              label="Education timeline"
              values={draft.credentials.educationTimeline}
              fields={timelineFields}
              sectionId={practiceSection.id}
              groupId={credentialsGroup.id}
              anchorId={getListAnchorId(practiceSection.id, credentialsGroup.id, 'Education timeline')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={() => ({ title: 'New qualification', institution: 'Institution', period: 'Status', description: 'Describe the study.' })}
              onChange={(value) => updateSectionField('credentials', 'educationTimeline', value as never)}
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={artBookingSection.id}
          title={artBookingSection.title}
          description={artBookingSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(artBookingSection.id)}
          isHighlighted={highlightedAnchorId === artBookingSection.id}
        >
          <FieldGroup
            title={artStudioGroup.title}
            description={artStudioGroup.description}
            anchorId={getGroupAnchorId(artBookingSection.id, artStudioGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(artBookingSection.id, artStudioGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('artStudio', artStudioFields, artBookingSection.id, artStudioGroup.id)}
            </div>
          </FieldGroup>
          <FieldGroup
            title={consultationExperienceGroup.title}
            description={consultationExperienceGroup.description}
            anchorId={getGroupAnchorId(artBookingSection.id, consultationExperienceGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(artBookingSection.id, consultationExperienceGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('consultationExperience', consultationExperienceFields, artBookingSection.id, consultationExperienceGroup.id)}
            </div>
            <ListField
              label="Consultation fact cards"
              values={draft.consultationExperience.factCards}
              anchorId={getListAnchorId(artBookingSection.id, consultationExperienceGroup.id, 'Consultation fact cards')}
              isHighlighted={highlightedAnchorId === getListAnchorId(artBookingSection.id, consultationExperienceGroup.id, 'Consultation fact cards')}
              onChange={(value) => updateSectionField('consultationExperience', 'factCards', value as never)}
            />
            <StructuredListField
              label="Consultation steps"
              values={draft.consultationExperience.steps}
              fields={textCardFields}
              sectionId={artBookingSection.id}
              groupId={consultationExperienceGroup.id}
              anchorId={getListAnchorId(artBookingSection.id, consultationExperienceGroup.id, 'Consultation steps')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={(): SiteTextCard => ({ title: 'New step', description: 'Describe this booking step.', icon: 'calendar' })}
              onChange={(value) => updateSectionField('consultationExperience', 'steps', value as never)}
            />
          </FieldGroup>
          <FieldGroup
            title={bookingDeskGroup.title}
            description={bookingDeskGroup.description}
            anchorId={getGroupAnchorId(artBookingSection.id, bookingDeskGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(artBookingSection.id, bookingDeskGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('consultationDesk', bookingDeskFields, artBookingSection.id, bookingDeskGroup.id)}
            </div>
            <StructuredListField
              label="Booking proof strip"
              values={draft.consultationDesk.proofItems}
              fields={bookingProofFields}
              sectionId={artBookingSection.id}
              groupId={bookingDeskGroup.id}
              anchorId={getListAnchorId(artBookingSection.id, bookingDeskGroup.id, 'Booking proof strip')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={(): SiteBookingProofItem => ({ label: 'New proof point', detail: 'Describe this proof point.', icon: 'shield' })}
              onChange={(value) => updateSectionField('consultationDesk', 'proofItems', value as never)}
            />
            <StructuredListField
              label="Booking service types"
              values={draft.consultationDesk.serviceTypes}
              fields={bookingServiceFields}
              sectionId={artBookingSection.id}
              groupId={bookingDeskGroup.id}
              anchorId={getListAnchorId(artBookingSection.id, bookingDeskGroup.id, 'Booking service types')}
              highlightedAnchorId={highlightedAnchorId}
              createItem={() => ({ value: 'New Service', label: 'New Service', icon: 'Type', desc: 'Describe this service type.' })}
              onChange={(value) => updateSectionField('consultationDesk', 'serviceTypes', value as never)}
            />
            <div className="website-fields-grid">
              {renderFields('consultationDesk', bookingDeskModalFields, artBookingSection.id, bookingDeskGroup.id)}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          id={footerSection.id}
          title={footerSection.title}
          description={footerSection.description}
          isDimmed={Boolean(searchQuery) && !matchedSectionIds.has(footerSection.id)}
          isHighlighted={highlightedAnchorId === footerSection.id}
        >
          <FieldGroup
            title={footerCtaGroup.title}
            description={footerCtaGroup.description}
            anchorId={getGroupAnchorId(footerSection.id, footerCtaGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(footerSection.id, footerCtaGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('footer', footerCtaFields, footerSection.id, footerCtaGroup.id)}
            </div>
          </FieldGroup>
          <FieldGroup
            title={footerDetailsGroup.title}
            description={footerDetailsGroup.description}
            anchorId={getGroupAnchorId(footerSection.id, footerDetailsGroup.id)}
            isHighlighted={highlightedAnchorId === getGroupAnchorId(footerSection.id, footerDetailsGroup.id)}
          >
            <div className="website-fields-grid">
              {renderFields('footer', footerDetailFields, footerSection.id, footerDetailsGroup.id)}
            </div>
          </FieldGroup>
        </SectionCard>
        </div>
      </div>
    </form>
  );
}
