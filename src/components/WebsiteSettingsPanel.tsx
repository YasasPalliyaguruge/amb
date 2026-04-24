import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, CircleDot, Paintbrush2, RefreshCcw, Save } from 'lucide-react';
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

interface WebsiteSettingsPanelProps {
  adminId?: string;
  adminEmail?: string;
}

type ObjectSectionKey = Exclude<keyof SiteSettings, 'schemaVersion' | 'themeStudioEnabled'>;
type StringFieldConfig<S extends ObjectSectionKey> = {
  key: keyof SiteSettings[S];
  label: string;
  rows?: number;
};
type StructuredFieldConfig<T> = {
  key: keyof T;
  label: string;
  rows?: number;
  type?: 'text' | 'textarea' | 'icon';
};

const surfaceModes: ThemeControls['surfaceMode'][] = ['paper', 'glass', 'velvet', 'ink', 'glow'];
const contrastModes: ThemeControls['contrastMode'][] = ['soft', 'balanced', 'high'];
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

function FormField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
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
}: {
  label: string;
  values: string[];
  onChange: (value: string[]) => void;
  hint?: string;
}) {
  return (
    <label className="space-y-2">
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
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="website-settings-card theme-panel">
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
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="website-field-group">
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
}: {
  label: string;
  values: T[];
  fields: StructuredFieldConfig<T>[];
  createItem: () => T;
  onChange: (value: T[]) => void;
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">{label}</p>
        <button type="button" className="theme-button-secondary px-4 py-2 text-xs" onClick={() => onChange([...values, createItem()])}>
          Add item
        </button>
      </div>
      <div className="website-structured-list">
        {values.map((item, index) => (
          <div key={`${label}-${index}`} className="website-structured-item">
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

export default function WebsiteSettingsPanel({ adminId, adminEmail }: WebsiteSettingsPanelProps) {
  const { siteSettings, loading, error } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings>(siteSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(siteSettings);
  }, [siteSettings]);

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
    fields: StringFieldConfig<S>[]
  ) =>
    fields.map((field) => (
      <div key={String(field.key)}>
        <FormField
          label={field.label}
          value={String(draft[section][field.key] ?? '')}
          rows={field.rows}
          onChange={(value) => updateSectionField(section, field.key, value as SiteSettings[S][typeof field.key])}
        />
      </div>
    ));

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
    { id: 'website-structure', label: 'Structure', description: `${visibleSectionCount} visible sections` },
    { id: 'website-branding', label: 'Branding', description: draft.branding.wordmark },
    { id: 'website-theme', label: 'Theme', description: currentPreset.label },
    { id: 'website-hero-profile', label: 'Hero/Profile', description: 'First impression copy' },
    { id: 'website-practice', label: 'Practice', description: 'Services and credentials' },
    { id: 'website-art-booking', label: 'Art/Booking', description: 'Visual and booking copy' },
    { id: 'website-footer', label: 'Footer', description: 'Contact and final CTA' },
  ];

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

      <div className="website-settings-layout">
        <aside className="website-settings-nav" aria-label="Website settings sections">
          <div className="website-settings-nav__inner">
            <p className="website-settings-nav__eyebrow">Edit groups</p>
            <nav className="website-settings-nav__links">
              {settingsNavItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="website-settings-nav__link">
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="website-settings-sections">
        <SectionCard id="website-structure" title="Homepage Structure" description="Choose the order and visibility of public sections.">
          <FieldGroup title="Section order" description="Control what appears on the public homepage and how visitors move through the story.">
            <div className="website-section-order-list">
          {draft.homepage.sectionOrder.map((sectionId, index) => (
            <div key={sectionId} className="website-section-order-item">
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

        <SectionCard id="website-branding" title="Branding and Contact" description="Update identity details used across the navbar, footer, and browser title.">
          <FieldGroup title="Identity" description="These fields shape the browser title, header, and first public brand impression.">
            <div className="website-fields-grid">
              {renderFields('branding', [
                { key: 'wordmark', label: 'Wordmark' },
                { key: 'strapline', label: 'Strapline' },
                { key: 'practitionerName', label: 'Practitioner name' },
                { key: 'clinicLabel', label: 'Clinic label' },
                { key: 'siteTitle', label: 'Site title' },
                { key: 'signInLabel', label: 'Sign-in button label' },
                { key: 'signInToContinueLabel', label: 'Mobile sign-in button label' },
                { key: 'signOutLabel', label: 'Sign-out label' },
                { key: 'patientDashboardLabel', label: 'Client dashboard label' },
                { key: 'adminDashboardLabel', label: 'Admin dashboard label' },
                { key: 'userFallbackLabel', label: 'User fallback label' },
                { key: 'mobileSignInPrompt', label: 'Mobile sign-in prompt', rows: 3 },
                { key: 'userMenuAriaLabel', label: 'User menu aria label' },
                { key: 'toggleMenuAriaLabel', label: 'Mobile menu toggle aria label' },
                { key: 'closeMenuAriaLabel', label: 'Mobile menu close aria label' },
                { key: 'signOutSuccessToast', label: 'Sign-out success toast' },
                { key: 'signOutErrorToast', label: 'Sign-out error toast' },
              ])}
            </div>
          </FieldGroup>
          <FieldGroup title="Public app shell" description="Small public labels used before or around the main website experience.">
            <div className="website-fields-grid">
              {renderFields('appCopy', [
                { key: 'skipLinkLabel', label: 'Skip link label' },
                { key: 'routeLoaderTitle', label: 'Route loader title' },
                { key: 'routeLoaderDescription', label: 'Route loader description' },
              ])}
            </div>
          </FieldGroup>
          <FieldGroup title="Sign-in modal" description="Copy shown when visitors sign in before booking or viewing their dashboard.">
            <div className="website-fields-grid">
              {renderFields('loginModal', [
                { key: 'closeAriaLabel', label: 'Close aria label' },
                { key: 'title', label: 'Modal title' },
                { key: 'selectDescription', label: 'Select method description', rows: 3 },
                { key: 'phoneStartDescription', label: 'Phone start description', rows: 2 },
                { key: 'phoneVerifyDescription', label: 'Phone verify description', rows: 2 },
                { key: 'googleCtaLabel', label: 'Google CTA label' },
                { key: 'googleSuccessToast', label: 'Google success toast' },
                { key: 'googleFailureFallback', label: 'Google failure fallback' },
                { key: 'dividerLabel', label: 'Divider label' },
                { key: 'phoneCtaLabel', label: 'Phone CTA label' },
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
                { key: 'portalAgreement', label: 'Portal agreement', rows: 2 },
                { key: 'phoneRequiredError', label: 'Phone required error' },
                { key: 'recaptchaError', label: 'Recaptcha error' },
                { key: 'verificationSentToast', label: 'Verification sent toast' },
                { key: 'smsFailureFallback', label: 'SMS failure fallback', rows: 2 },
                { key: 'otpRequiredError', label: 'OTP required error' },
                { key: 'otpSuccessToast', label: 'OTP success toast' },
                { key: 'invalidOtpError', label: 'Invalid OTP error' },
              ])}
            </div>
          </FieldGroup>
          <FieldGroup title="Contact details" description="Used in the footer and anywhere the site needs a practical contact path.">
            <div className="website-fields-grid">
              {renderFields('branding', [
                { key: 'contactEmail', label: 'Contact email' },
                { key: 'contactPhone', label: 'Contact phone' },
                { key: 'location', label: 'Location' },
              ])}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard id="website-theme" title="Theme and Motion" description="Set the live default theme, motion scenes, and visitor theme dock behavior.">
          <FieldGroup title="Theme baseline" description="Set the visible theme preset and whether visitors can use the theme dock.">
            <label className="inline-flex items-center gap-3 rounded-full border border-[rgb(var(--theme-line-rgb)/0.25)] px-4 py-2 text-sm">
              <input type="checkbox" checked={draft.themeStudioEnabled} onChange={(event) => setDraft((current) => ({ ...current, themeStudioEnabled: event.target.checked }))} className="h-4 w-4 accent-[rgb(var(--theme-primary-rgb))]" />
              Keep visitor theme dock visible
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Theme preset</span>
              <select value={draft.theme.presetId} onChange={(event) => setDraft((current) => ({ ...current, theme: createThemeState(themePresets.find((preset) => preset.id === event.target.value) || themePresets[0]) }))} className="theme-select">
                {themePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              </select>
            </label>
          </FieldGroup>
          <FieldGroup title="Motion scenes" description="Choose the generated frame sequences used in the main visual moments.">
            <div className="website-fields-grid">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Hero scene</span>
                <select value={draft.motion.heroSceneId} onChange={(event) => updateSectionField('motion', 'heroSceneId', event.target.value as never)} className="theme-select">
                  {sceneOptions.map((sceneId) => <option key={sceneId} value={sceneId}>{frameSequenceManifest[sceneId].label}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Art scene</span>
                <select value={draft.motion.artSceneId} onChange={(event) => updateSectionField('motion', 'artSceneId', event.target.value as never)} className="theme-select">
                  {sceneOptions.map((sceneId) => <option key={sceneId} value={sceneId}>{frameSequenceManifest[sceneId].label}</option>)}
                </select>
              </label>
            </div>
          </FieldGroup>
          <FieldGroup title="Advanced theme values" description="Tune surfaces, contrast, palette, and motion density without hunting through the full form.">
            <div className="website-fields-grid">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Surface mode</span>
                <select value={draft.theme.controls.surfaceMode} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, surfaceMode: event.target.value as ThemeControls['surfaceMode'] } } }))} className="theme-select">
                  {surfaceModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--theme-muted-rgb))]">Contrast</span>
                <select value={draft.theme.controls.contrastMode} onChange={(event) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, contrastMode: event.target.value as ThemeControls['contrastMode'] } } }))} className="theme-select">
                  {contrastModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
            </div>
            <ListField label="Theme colors" values={[draft.theme.colors.background, draft.theme.colors.primary, draft.theme.colors.accent, draft.theme.colors.text]} onChange={(value) => setDraft((current) => ({ ...current, theme: sanitizeThemeState({ ...current.theme, colors: { background: value[0] || current.theme.colors.background, primary: value[1] || current.theme.colors.primary, accent: value[2] || current.theme.colors.accent, text: value[3] || current.theme.colors.text } }, themePresets) }))} hint="Use four lines: background, primary, accent, text." />
            <ListField label="Theme controls" values={[String(draft.theme.controls.radiusScale), String(draft.theme.controls.shadowDepth), String(draft.theme.controls.grainIntensity), String(draft.theme.controls.motionDensity), String(draft.motion.pointerStrength)]} onChange={(value) => setDraft((current) => ({ ...current, theme: { ...current.theme, controls: { ...current.theme.controls, radiusScale: Number(value[0] || current.theme.controls.radiusScale), shadowDepth: Number(value[1] || current.theme.controls.shadowDepth), grainIntensity: Number(value[2] || current.theme.controls.grainIntensity), motionDensity: Number(value[3] || current.theme.controls.motionDensity) } }, motion: { ...current.motion, pointerStrength: Number(value[4] || current.motion.pointerStrength) } }))} hint="Use five lines: radius, shadow, texture, motion density, pointer strength." />
          </FieldGroup>
        </SectionCard>

        <SectionCard id="website-hero-profile" title="Hero and Profile Copy" description="Edit the first impression and professional profile language seen by clients.">
          <FieldGroup title="Hero" description="The top of the public homepage: headline, summary, and two primary actions.">
            <div className="website-fields-grid">
              {renderFields('hero', [
                { key: 'eyebrow', label: 'Hero eyebrow' },
                { key: 'headline', label: 'Hero headline', rows: 3 },
                { key: 'description', label: 'Hero description', rows: 4 },
                { key: 'primaryCtaLabel', label: 'Primary CTA label' },
                { key: 'primaryCtaHref', label: 'Primary CTA link' },
                { key: 'secondaryCtaLabel', label: 'Secondary CTA label' },
                { key: 'secondaryCtaHref', label: 'Secondary CTA link' },
                { key: 'mediaAlt', label: 'Hero image alt text', rows: 2 },
                { key: 'mediaEyebrow', label: 'Hero image eyebrow' },
                { key: 'mediaHeadline', label: 'Hero image headline', rows: 2 },
                { key: 'mediaBadge', label: 'Hero image badge' },
                { key: 'supportingFrameAltPrefix', label: 'Supporting frame alt prefix' },
                { key: 'supportingFrameBadgePrefix', label: 'Supporting frame badge prefix' },
                { key: 'supportNote', label: 'Support note', rows: 3 },
              ])}
            </div>
            <ListField label="Hero badges" values={draft.hero.badges} onChange={(value) => updateSectionField('hero', 'badges', value as never)} />
            <StructuredListField
              label="Hero trust cards"
              values={draft.hero.trustCards}
              fields={textCardFields}
              createItem={(): SiteTextCard => ({ title: 'New trust card', description: 'Describe this trust point.', icon: 'shield' })}
              onChange={(value) => updateSectionField('hero', 'trustCards', value as never)}
            />
            <StructuredListField
              label="Hero note cards"
              values={draft.hero.noteCards}
              fields={textCardFields}
              createItem={(): SiteTextCard => ({ title: 'New note', description: 'Describe this supporting note.', icon: 'sparkles' })}
              onChange={(value) => updateSectionField('hero', 'noteCards', value as never)}
            />
          </FieldGroup>
          <FieldGroup title="Professional profile" description="The profile section copy and the supporting role panel.">
            <div className="website-fields-grid">
              {renderFields('ethos', [
                { key: 'eyebrow', label: 'Profile eyebrow' },
                { key: 'headline', label: 'Profile headline', rows: 3 },
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
              ])}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard id="website-practice" title="Practice and Credentials" description="Publish the service positioning and formal proof points that support the practice.">
          <FieldGroup title="Practice copy" description="Service section headings, intro copy, and the highlighted service card.">
            <div className="website-fields-grid">
              {renderFields('services', [
                { key: 'eyebrow', label: 'Practice eyebrow' },
                { key: 'headline', label: 'Practice headline', rows: 3 },
                { key: 'intro', label: 'Practice intro', rows: 3 },
                { key: 'featuredEyebrow', label: 'Featured eyebrow' },
                { key: 'featuredTitle', label: 'Featured title' },
                { key: 'featuredDescription', label: 'Featured description', rows: 3 },
                { key: 'toneEyebrow', label: 'Tone eyebrow' },
                { key: 'toneHeadline', label: 'Tone headline', rows: 2 },
                { key: 'toneDescription', label: 'Tone description', rows: 3 },
              ])}
            </div>
            <ListField label="Practice highlights" values={draft.services.benefits} onChange={(value) => updateSectionField('services', 'benefits', value as never)} />
            <StructuredListField
              label="Practice cards"
              values={draft.services.practiceCards}
              fields={textCardFields}
              createItem={(): SiteTextCard => ({ title: 'New practice area', description: 'Describe this area of practice.', icon: 'heart' })}
              onChange={(value) => updateSectionField('services', 'practiceCards', value as never)}
            />
          </FieldGroup>
          <FieldGroup title="Credentials" description="Formal study, role history, and the credential rail copy.">
            <div className="website-fields-grid">
              {renderFields('credentials', [
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
              ])}
            </div>
            <ListField label="Credential highlights" values={draft.credentials.highlights} onChange={(value) => updateSectionField('credentials', 'highlights', value as never)} />
            <StructuredListField
              label="Professional roles"
              values={draft.credentials.professionalRoles}
              fields={timelineFields}
              createItem={() => ({ title: 'New role', institution: 'Organization', period: 'Date range', description: 'Describe the role.' })}
              onChange={(value) => updateSectionField('credentials', 'professionalRoles', value as never)}
            />
            <StructuredListField
              label="Education timeline"
              values={draft.credentials.educationTimeline}
              fields={timelineFields}
              createItem={() => ({ title: 'New qualification', institution: 'Institution', period: 'Status', description: 'Describe the study.' })}
              onChange={(value) => updateSectionField('credentials', 'educationTimeline', value as never)}
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard id="website-art-booking" title="Art and Booking" description="Publish the visual voice, consultation story, and booking desk language.">
          <FieldGroup title="Art studio" description="Public language around visual thinking, illustration, and artwork calls to action.">
            <div className="website-fields-grid">
              {renderFields('artStudio', [
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
              ])}
            </div>
          </FieldGroup>
          <FieldGroup title="Consultation experience" description="The section that explains what happens before and after a consultation.">
            <div className="website-fields-grid">
              {renderFields('consultationExperience', [
                { key: 'eyebrow', label: 'Consultation eyebrow' },
                { key: 'headline', label: 'Consultation headline', rows: 3 },
                { key: 'description', label: 'Consultation description', rows: 3 },
                { key: 'outcomeLabel', label: 'Outcome label' },
                { key: 'outcomeHeadline', label: 'Outcome headline', rows: 2 },
                { key: 'outcomeDescription', label: 'Outcome description', rows: 3 },
                { key: 'stepLabelPrefix', label: 'Step label prefix' },
                { key: 'featureAlt', label: 'Feature image alt text', rows: 2 },
              ])}
            </div>
            <ListField label="Consultation fact cards" values={draft.consultationExperience.factCards} onChange={(value) => updateSectionField('consultationExperience', 'factCards', value as never)} />
            <StructuredListField
              label="Consultation steps"
              values={draft.consultationExperience.steps}
              fields={textCardFields}
              createItem={(): SiteTextCard => ({ title: 'New step', description: 'Describe this booking step.', icon: 'calendar' })}
              onChange={(value) => updateSectionField('consultationExperience', 'steps', value as never)}
            />
          </FieldGroup>
          <FieldGroup title="Booking desk" description="Copy for the date picker, booking rail, and appointment confirmation area.">
            <div className="website-fields-grid">
              {renderFields('consultationDesk', [
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
              ])}
            </div>
            <StructuredListField
              label="Booking proof strip"
              values={draft.consultationDesk.proofItems}
              fields={bookingProofFields}
              createItem={(): SiteBookingProofItem => ({ label: 'New proof point', detail: 'Describe this proof point.', icon: 'shield' })}
              onChange={(value) => updateSectionField('consultationDesk', 'proofItems', value as never)}
            />
            <StructuredListField
              label="Booking service types"
              values={draft.consultationDesk.serviceTypes}
              fields={bookingServiceFields}
              createItem={() => ({ value: 'New Service', label: 'New Service', icon: 'Type', desc: 'Describe this service type.' })}
              onChange={(value) => updateSectionField('consultationDesk', 'serviceTypes', value as never)}
            />
            <div className="website-fields-grid">
              {renderFields('consultationDesk', [
                { key: 'modalConfirmTitle', label: 'Modal confirm title' },
                { key: 'modalConfirmDescription', label: 'Modal confirm description', rows: 2 },
                { key: 'modalDateLabel', label: 'Modal date label' },
                { key: 'modalTimeLabel', label: 'Modal time label' },
                { key: 'modalPatientLabel', label: 'Modal client label' },
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
              ])}
            </div>
          </FieldGroup>
        </SectionCard>

        <SectionCard id="website-footer" title="Footer and Final CTAs" description="Control the final conversion block, contact summary, and external links.">
          <FieldGroup title="Footer calls to action" description="The final invitation at the end of the public website.">
            <div className="website-fields-grid">
              {renderFields('footer', [
            { key: 'ctaEyebrow', label: 'Footer CTA eyebrow' },
            { key: 'ctaHeadline', label: 'Footer CTA headline', rows: 3 },
            { key: 'ctaDescription', label: 'Footer CTA description', rows: 3 },
            { key: 'bookingCtaLabel', label: 'Footer booking label' },
            { key: 'bookingCtaHref', label: 'Footer booking link' },
            { key: 'artCtaLabel', label: 'Footer art label' },
            { key: 'artCtaHref', label: 'Footer art link' },
              ])}
            </div>
          </FieldGroup>
          <FieldGroup title="Footer details" description="Supporting summary, affiliation, ethics line, and organization links.">
            <div className="website-fields-grid">
              {renderFields('footer', [
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
              ])}
            </div>
          </FieldGroup>
        </SectionCard>
        </div>
      </div>
    </form>
  );
}
