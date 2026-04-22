import { frameSequenceManifest, type FrameSequenceSceneId } from '../theme/frameSequenceManifest';
import { defaultThemePreset, themePresets } from '../theme/themePresets';
import { createThemeState, sanitizeThemeState } from '../theme/themeUtils';
import type { ThemeState } from '../theme/types';

export type HomepageSectionId =
  | 'hero'
  | 'profile'
  | 'credentials'
  | 'practice'
  | 'art'
  | 'consultation'
  | 'booking';

export type SiteIconKey =
  | 'activity'
  | 'arrow'
  | 'book'
  | 'brain'
  | 'briefcase'
  | 'calendar'
  | 'check'
  | 'clock'
  | 'gallery'
  | 'graduation'
  | 'heart'
  | 'lock'
  | 'refresh'
  | 'route'
  | 'shield'
  | 'sparkles'
  | 'users';

export const homepageSectionMeta: Record<
  HomepageSectionId,
  { label: string; href: string }
> = {
  hero: { label: 'Home', href: '/#home' },
  profile: { label: 'Profile', href: '/#profile' },
  credentials: { label: 'Credentials', href: '/#academic-tenure' },
  practice: { label: 'Practice', href: '/#services' },
  art: { label: 'Art', href: '/#doodle-art' },
  consultation: { label: 'Consultation', href: '/#consultation-experience' },
  booking: { label: 'Book', href: '/#consultation-desk' },
};

export const homepageSectionIds = Object.keys(homepageSectionMeta) as HomepageSectionId[];

export interface HomepageLayoutSettings {
  sectionOrder: HomepageSectionId[];
  visibility: Record<HomepageSectionId, boolean>;
  labels: Record<HomepageSectionId, string>;
}

export interface SiteTextCard {
  title: string;
  description: string;
  icon: SiteIconKey;
}

export interface SiteTimelineItem {
  title: string;
  institution: string;
  period: string;
  description: string;
}

export interface SiteBookingService {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

export interface SiteBookingProofItem {
  label: string;
  detail: string;
  icon: SiteIconKey;
}

export interface SiteBrandingSettings {
  wordmark: string;
  strapline: string;
  practitionerName: string;
  clinicLabel: string;
  siteTitle: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  signInLabel: string;
  signInToContinueLabel: string;
  signOutLabel: string;
  patientDashboardLabel: string;
  adminDashboardLabel: string;
  userFallbackLabel: string;
  mobileSignInPrompt: string;
  userMenuAriaLabel: string;
  toggleMenuAriaLabel: string;
  closeMenuAriaLabel: string;
  signOutSuccessToast: string;
  signOutErrorToast: string;
}

export interface SiteAppCopySettings {
  skipLinkLabel: string;
  routeLoaderTitle: string;
  routeLoaderDescription: string;
}

export interface SiteLoginModalSettings {
  closeAriaLabel: string;
  title: string;
  selectDescription: string;
  phoneStartDescription: string;
  phoneVerifyDescription: string;
  googleCtaLabel: string;
  googleSuccessToast: string;
  googleFailureFallback: string;
  dividerLabel: string;
  phoneCtaLabel: string;
  phoneNumberLabel: string;
  phonePlaceholder: string;
  sendingLabel: string;
  sendCodeLabel: string;
  backOptionsLabel: string;
  otpLabel: string;
  otpPlaceholder: string;
  verifyingLabel: string;
  verifyCtaLabel: string;
  wrongNumberLabel: string;
  portalAgreement: string;
  phoneRequiredError: string;
  recaptchaError: string;
  verificationSentToast: string;
  smsFailureFallback: string;
  otpRequiredError: string;
  otpSuccessToast: string;
  invalidOtpError: string;
}

export interface SiteHeroSettings {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaHref: string;
  badges: string[];
  mediaAlt: string;
  mediaEyebrow: string;
  mediaHeadline: string;
  mediaBadge: string;
  supportingFrameAltPrefix: string;
  supportingFrameBadgePrefix: string;
  supportNote: string;
  trustCards: SiteTextCard[];
  noteCards: SiteTextCard[];
}

export interface SiteEthosSettings {
  eyebrow: string;
  headline: string;
  intro: string;
  panelEyebrow: string;
  panelHeadline: string;
  panelDescription: string;
  settingLabel: string;
  settingValue: string;
  settingDescription: string;
  approachLabel: string;
  approachValue: string;
  approachDescription: string;
  trustTitle: string;
  trustDescription: string;
  privacyTitle: string;
  privacyDescription: string;
  progressTitle: string;
  progressDescription: string;
}

export interface SiteServicesSettings {
  eyebrow: string;
  headline: string;
  intro: string;
  featuredEyebrow: string;
  featuredTitle: string;
  featuredDescription: string;
  benefits: string[];
  toneEyebrow: string;
  toneHeadline: string;
  toneDescription: string;
  practiceCards: SiteTextCard[];
}

export interface SiteCredentialsSettings {
  eyebrow: string;
  headline: string;
  intro: string;
  railEyebrow: string;
  railHeadline: string;
  railDescription: string;
  highlights: string[];
  professionalRailLabel: string;
  professionalRailDescription: string;
  educationRailLabel: string;
  educationRailDescription: string;
  roleLabel: string;
  studyLabel: string;
  professionalRoles: SiteTimelineItem[];
  educationTimeline: SiteTimelineItem[];
}

export interface SiteArtStudioSettings {
  eyebrow: string;
  headline: string;
  intro: string;
  panelEyebrow: string;
  panelHeadline: string;
  panelDescription: string;
  instagramCtaLabel: string;
  galleryCaption: string;
  featureAlt: string;
  galleryAltPrefix: string;
  featureBadge: string;
}

export interface SiteConsultationExperienceSettings {
  eyebrow: string;
  headline: string;
  description: string;
  outcomeLabel: string;
  outcomeHeadline: string;
  outcomeDescription: string;
  factCards: string[];
  steps: SiteTextCard[];
  stepLabelPrefix: string;
  featureAlt: string;
}

export interface SiteConsultationDeskSettings {
  eyebrow: string;
  headline: string;
  description: string;
  railEyebrow: string;
  railHeadline: string;
  railDescription: string;
  proofItems: SiteBookingProofItem[];
  currentMonthLabel: string;
  selectedDayLabel: string;
  nextOpeningLabel: string;
  liveDeskLabel: string;
  noFutureDatesText: string;
  nextOpeningPendingLabel: string;
  nearestPublishedSuffix: string;
  publishedDateSingularLabel: string;
  publishedDatePluralLabel: string;
  slotSingularLabel: string;
  slotPluralLabel: string;
  signInRequiredToast: string;
  availabilityLoadError: string;
  signInPrompt: string;
  signInCtaLabel: string;
  datePanelTitle: string;
  datePanelDescription: string;
  openInMonthLabelPrefix: string;
  loadingAvailabilityText: string;
  availabilityHint: string;
  nextOpenDateLabel: string;
  noMonthAvailabilityText: string;
  slotsPanelDescription: string;
  slotsAvailableSuffix: string;
  chooseTimeLabel: string;
  dayOffTitle: string;
  noSlotsTitle: string;
  availabilityErrorTitle: string;
  emptyStateHint: string;
  jumpNextDateLabel: string;
  locationDescription: string;
  serviceTypes: SiteBookingService[];
  modalConfirmTitle: string;
  modalConfirmDescription: string;
  modalDateLabel: string;
  modalTimeLabel: string;
  modalPatientLabel: string;
  modalServiceTypeLabel: string;
  modalNotesLabel: string;
  modalNotesOptionalLabel: string;
  modalNotesPlaceholder: string;
  modalBackLabel: string;
  modalConfirmButtonLabel: string;
  modalConfirmingLabel: string;
  modalSuccessTitle: string;
  modalSuccessDescription: string;
  modalDateTimeLabel: string;
  modalServiceLabel: string;
  modalEmailQueuedPrefix: string;
  modalDashboardFallback: string;
  modalDoneLabel: string;
  modalViewAppointmentsLabel: string;
  modalCloseAriaLabel: string;
}

export interface SiteFooterSettings {
  ctaEyebrow: string;
  ctaHeadline: string;
  ctaDescription: string;
  bookingCtaLabel: string;
  artCtaLabel: string;
  bookingCtaHref: string;
  artCtaHref: string;
  summary: string;
  affiliationLine: string;
  closingLine: string;
  ethicsLine: string;
  copyrightName: string;
  copyrightPrefix: string;
  copyrightSuffix: string;
  instagramUrl: string;
  instagramLabel: string;
  organizationLabel: string;
  organizationUrl: string;
  exploreColumnTitle: string;
  visitColumnTitle: string;
}

export interface SiteMotionSettings {
  heroSceneId: FrameSequenceSceneId;
  artSceneId: FrameSequenceSceneId;
  pointerStrength: number;
}

export interface SiteMediaSettings {
  heroPrimaryUrl: string;
  heroSupportingUrls: string[];
  artFeatureUrl: string;
  artGalleryUrls: string[];
  consultationFeatureUrl: string;
}

export interface SiteSettings {
  schemaVersion: number;
  themeStudioEnabled: boolean;
  theme: ThemeState;
  motion: SiteMotionSettings;
  homepage: HomepageLayoutSettings;
  media: SiteMediaSettings;
  appCopy: SiteAppCopySettings;
  loginModal: SiteLoginModalSettings;
  branding: SiteBrandingSettings;
  hero: SiteHeroSettings;
  ethos: SiteEthosSettings;
  services: SiteServicesSettings;
  credentials: SiteCredentialsSettings;
  artStudio: SiteArtStudioSettings;
  consultationExperience: SiteConsultationExperienceSettings;
  consultationDesk: SiteConsultationDeskSettings;
  footer: SiteFooterSettings;
}

export const siteSettingsDocId = 'site';
export const siteSettingsSchemaVersion = 5;

const defaultStringArray = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
const defaultVisibility = homepageSectionIds.reduce(
  (accumulator, sectionId) => ({ ...accumulator, [sectionId]: true }),
  {} as Record<HomepageSectionId, boolean>
);
const defaultHomepageLabels = homepageSectionIds.reduce(
  (accumulator, sectionId) => ({ ...accumulator, [sectionId]: homepageSectionMeta[sectionId].label }),
  {} as Record<HomepageSectionId, string>
);

export const defaultSiteSettings: SiteSettings = {
  schemaVersion: siteSettingsSchemaVersion,
  themeStudioEnabled: true,
  theme: createThemeState(defaultThemePreset),
  motion: {
    heroSceneId: 'hero',
    artSceneId: 'studio',
    pointerStrength: 14,
  },
  homepage: {
    sectionOrder: [...homepageSectionIds],
    visibility: defaultVisibility,
    labels: defaultHomepageLabels,
  },
  media: {
    heroPrimaryUrl: '',
    heroSupportingUrls: [],
    artFeatureUrl: '',
    artGalleryUrls: [],
    consultationFeatureUrl: '',
  },
  appCopy: {
    skipLinkLabel: 'Skip to main content',
    routeLoaderTitle: 'Opening page',
    routeLoaderDescription: 'Loading the next screen.',
  },
  loginModal: {
    closeAriaLabel: 'Close dialog',
    title: 'Secure Sign In',
    selectDescription:
      'Sign in to reserve a session, then return later to review, reschedule, or cancel future appointments.',
    phoneStartDescription: 'Enter your mobile number to receive a private verification code.',
    phoneVerifyDescription: 'Enter the 6-digit code to complete sign-in.',
    googleCtaLabel: 'Continue with Google',
    googleSuccessToast: 'Successfully signed in!',
    googleFailureFallback: 'Failed to sign in',
    dividerLabel: 'or',
    phoneCtaLabel: 'Continue with Phone',
    phoneNumberLabel: 'Mobile Number',
    phonePlaceholder: '+94 77 XXX XXXX',
    sendingLabel: 'Sending...',
    sendCodeLabel: 'Send Code',
    backOptionsLabel: 'Back to options',
    otpLabel: 'Enter 6-digit Code',
    otpPlaceholder: '000000',
    verifyingLabel: 'Verifying...',
    verifyCtaLabel: 'Verify and Sign In',
    wrongNumberLabel: 'Wrong number? Go back',
    portalAgreement: 'By continuing, you agree to confidential use of the patient portal.',
    phoneRequiredError: 'Please enter a phone number',
    recaptchaError: 'reCAPTCHA not initialized',
    verificationSentToast: 'Verification code sent',
    smsFailureFallback: 'Failed to send SMS. Make sure the phone number is correct.',
    otpRequiredError: 'Please enter the OTP',
    otpSuccessToast: 'Successfully verified and signed in',
    invalidOtpError: 'Invalid OTP code. Please try again.',
  },
  branding: {
    wordmark: 'AMB',
    strapline: 'Counseling - Behavior Therapy - Pedagogy',
    practitionerName: 'Aadhila M. Biswas',
    clinicLabel: 'CAFS Sri Lanka',
    siteTitle: 'Aadhila M. Biswas - Counseling and Behavior Therapy',
    contactEmail: 'hello@aadhilabiswas.com',
    contactPhone: '+94 77 000 0000',
    location: 'Colombo, Sri Lanka',
    signInLabel: 'Sign In',
    signInToContinueLabel: 'Sign In to Continue',
    signOutLabel: 'Sign Out',
    patientDashboardLabel: 'Patient Dashboard',
    adminDashboardLabel: 'Admin Dashboard',
    userFallbackLabel: 'Patient',
    mobileSignInPrompt:
      'Sign in to book, reschedule, and review appointments from your private dashboard.',
    userMenuAriaLabel: 'User menu',
    toggleMenuAriaLabel: 'Toggle mobile menu',
    closeMenuAriaLabel: 'Close menu',
    signOutSuccessToast: 'Successfully logged out',
    signOutErrorToast: 'Failed to log out',
  },
  hero: {
    eyebrow: 'Counselor - Behavior Therapist - Educator',
    headline: 'Psychological support that stays clear, private, and grounded.',
    description:
      'A counseling and behavior therapy practice supporting children, adolescents, adults, and families through psychosocial care, emotional regulation, and practical change.',
    primaryCtaLabel: 'View the Profile',
    secondaryCtaLabel: 'Book a Consultation',
    primaryCtaHref: '/#profile',
    secondaryCtaHref: '/#consultation-desk',
    badges: ['CAFS Sri Lanka', 'B.Sc. Psychology and Counseling', 'University of Colombo PGD'],
    mediaAlt: 'Portrait and visual identity for Aadhila M. Biswas',
    mediaEyebrow: 'Professional identity',
    mediaHeadline: 'Counselor, behavior therapist, and educator.',
    mediaBadge: 'Calm / clear / private',
    supportingFrameAltPrefix: 'Selected practice frame',
    supportingFrameBadgePrefix: 'Frame',
    supportNote:
      'Start with the profile if you want to understand the approach first, or go directly to the consultation desk when you are ready to book.',
    trustCards: [
      {
        title: 'Private and respectful',
        description: 'Sessions are designed to feel calm, confidential, and professionally held.',
        icon: 'shield',
      },
      {
        title: 'Children to adults',
        description: 'Support for children, adolescents, adults, and families across changing needs.',
        icon: 'users',
      },
      {
        title: 'Book online',
        description: 'Review availability, choose a slot, and manage bookings from the patient desk.',
        icon: 'calendar',
      },
    ],
    noteCards: [
      {
        title: 'Current clinical setting',
        description: 'Consultant Counselor and Behavior Therapist at CAFS Sri Lanka.',
        icon: 'heart',
      },
      {
        title: 'Professional focus',
        description: 'Counseling, behavior therapy, child-focused care, and psychosocial support.',
        icon: 'book',
      },
      {
        title: 'Why it feels clear',
        description: 'Teaching experience strengthens how care is explained, paced, and structured.',
        icon: 'sparkles',
      },
    ],
  },
  ethos: {
    eyebrow: 'Professional Profile',
    headline: 'Care informed by clinical work, behavior therapy, and years of teaching experience.',
    intro:
      'The work combines counseling, structured behavioral support, and educational clarity so difficult experiences can be approached with care, steadiness, and practical direction.',
    panelEyebrow: 'Current Clinical Role',
    panelHeadline: 'Consultant Counselor and Behavior Therapist at CAFS Sri Lanka.',
    panelDescription:
      'Current work includes one-to-one counseling, child behavior management, and assessments for emotional, behavioral, and developmental concerns.',
    settingLabel: 'Focus Areas',
    settingValue: 'Psychosocial Wellbeing',
    settingDescription:
      "Including women's empowerment, children's rights, emotional wellbeing, and bullying prevention.",
    approachLabel: 'How the work is held',
    approachValue: 'Structured and relational',
    approachDescription:
      'Using counseling, CBT, and behavior strategies in a way that stays practical, emotionally aware, and culturally responsive.',
    trustTitle: 'Confidential and respectful',
    trustDescription: 'Support begins with privacy, professional boundaries, and a pace that honors personal readiness.',
    privacyTitle: 'Practical and understandable',
    privacyDescription: 'Difficult ideas are explained clearly so the process feels workable instead of overwhelming.',
    progressTitle: 'Strengthened by teaching',
    progressDescription: 'Years in classrooms and universities shape a style of care that is organized, clear, and easy to follow.',
  },
  services: {
    eyebrow: 'Areas of Practice',
    headline: 'Support for emotional wellbeing, behavior change, neurodivergence, and family-centered care.',
    intro:
      'The practice supports people across life stages using counseling, psychosocial support, and behavior-focused work matched to individual needs and context.',
    featuredEyebrow: 'Core Clinical Work',
    featuredTitle: 'Counseling and behavior support that stays usable in daily life.',
    featuredDescription:
      'Sessions are designed to support reflection, regulation, recovery, and practical follow-through in a way that feels calm and structured.',
    benefits: [
      'Counseling and psychosocial support',
      'Behavior management for children, including ASD and ADHD-related support',
      'Standardized psychological assessment and trauma-informed care',
    ],
    toneEyebrow: 'Why the structure feels clear',
    toneHeadline: 'Educational experience helps make care easier to understand and apply.',
    toneDescription:
      'Teaching experience strengthens the ability to pace information well, explain clearly, and create care plans people can actually return to.',
    practiceCards: [
      {
        title: 'Counseling',
        description: 'Support for emotional strain, life challenges, grief, uncertainty, and personal development.',
        icon: 'heart',
      },
      {
        title: 'Cognitive Behavioral Therapy',
        description:
          'Structured work for understanding patterns, processing difficult thoughts, and building more helpful responses.',
        icon: 'brain',
      },
      {
        title: 'Behavior Therapy',
        description:
          'Behavior-focused strategies for routines, regulation, follow-through, and child or adolescent support.',
        icon: 'activity',
      },
      {
        title: 'Child and Family-Aware Care',
        description:
          'A practice informed by early childhood education, school experience, and careful attention to family context.',
        icon: 'users',
      },
    ],
  },
  credentials: {
    eyebrow: 'Credentials and Experience',
    headline: 'Formal study, clinical roles, and teaching experience that strengthen the practice.',
    intro:
      'Professional grounding comes from academic study, clinical placements, counseling work, university teaching, and practical experience across different care settings.',
    railEyebrow: 'What anchors the work',
    railHeadline: 'A practice shaped by both study and lived professional responsibility.',
    railDescription:
      'The combination of psychology training, postgraduate counseling study, and applied teaching experience supports work that is thoughtful, dependable, and usable in real life.',
    highlights: [
      "PGD / Master's in Counseling and Psychosocial Support - University of Colombo",
      'B.Sc. in Psychology and Counseling - Aquinas College of Higher Studies',
      'Diploma in Graphic Design - ESOFT Metro Campus',
    ],
    professionalRailLabel: 'Professional experience',
    professionalRailDescription: 'Clinical, educational, and applied roles',
    educationRailLabel: 'Education',
    educationRailDescription: 'Formal study supporting the practice',
    roleLabel: 'Role',
    studyLabel: 'Study',
    professionalRoles: [
      {
        title: 'Consultant Counselor / Behavior Therapist',
        institution: 'Child Adolescent and Family Services (CAFS) Sri Lanka',
        period: 'Jul 2025 - Present',
        description:
          'Supports emotional wellbeing, behavior change, and child-focused care within a confidential clinical setting.',
      },
      {
        title: 'Assistant Lecturer',
        institution: 'AIC Campus',
        period: 'Jan 2023 - Aug 2025',
        description: 'Taught psychology and early childhood education while mentoring undergraduate learners.',
      },
      {
        title: 'IGCSE English Language Teacher',
        institution: 'Harcourts International School',
        period: 'Mar 2020 - Jan 2023',
        description:
          'Built practical experience in communication, classroom structure, and adolescent development.',
      },
      {
        title: 'Clinical Psychology Intern',
        institution: 'Deep Haven Counseling Colombo',
        period: 'Dec 2021 - Apr 2022',
        description: 'Developed early clinical documentation, case support, and a more holistic view of care.',
      },
    ],
    educationTimeline: [
      {
        title: "PGD / Master's in Counseling and Psychosocial Support",
        institution: 'University of Colombo',
        period: 'Ongoing',
        description:
          'Advanced postgraduate study that deepens work around counseling, psychosocial support, and community wellbeing.',
      },
      {
        title: 'B.Sc. in Psychology and Counseling',
        institution: 'Aquinas College of Higher Studies',
        period: 'Completed',
        description: 'Built the scientific and applied counseling foundation behind the practice.',
      },
      {
        title: 'Diploma in Graphic Design',
        institution: 'ESOFT Metro Campus',
        period: 'Completed',
        description: 'Supports clearer visual communication, advocacy work, and the creative voice of the site.',
      },
    ],
  },
  artStudio: {
    eyebrow: 'Art and Visual Voice',
    headline: 'Visual thinking that supports expression, therapeutic tools, and public understanding.',
    intro:
      'Alongside counseling work, visual design and illustration are used to support communication, therapeutic materials, and more accessible mental health education.',
    panelEyebrow: 'Visual practice',
    panelHeadline: 'Design and illustration as part of the wider professional voice.',
    panelDescription:
      'Graphic design training informs therapeutic tools, awareness materials, and a gentler visual language for communicating emotional ideas.',
    instagramCtaLabel: 'View the artwork',
    galleryCaption: 'Selected visual work',
    featureAlt: 'Artwork from the visual practice',
    galleryAltPrefix: 'Artwork detail',
    featureBadge: 'Visual voice',
  },
  consultationExperience: {
    eyebrow: 'Consultation Experience',
    headline: 'From first inquiry to later follow-up, the process stays calm and easy to return to.',
    description:
      'Published dates, secure sign-in, and a private dashboard make it easier to book, revisit upcoming sessions later, and adjust plans when needed.',
    outcomeLabel: 'What the process offers',
    outcomeHeadline: 'A quieter path into care.',
    outcomeDescription:
      'Less uncertainty, less back-and-forth, and a booking flow that keeps the important details visible from start to finish.',
    factCards: [
      'Published availability keeps the first step simple and avoids the feeling of sending requests into the dark.',
      'Once booked, appointments stay visible in the patient dashboard so future changes do not create extra friction.',
    ],
    steps: [
      {
        title: 'Browse published dates',
        description: 'Start with the dates that are already open instead of waiting for email back-and-forth.',
        icon: 'calendar',
      },
      {
        title: 'Sign in once',
        description: 'Secure sign-in keeps the booking flow private and makes later appointment access much easier.',
        icon: 'lock',
      },
      {
        title: 'Confirm clearly',
        description: 'Review the session type, date, time, and any notes before the booking is reserved.',
        icon: 'check',
      },
      {
        title: 'Return later if needed',
        description: 'The patient dashboard lets you review future appointments, reschedule, or cancel when plans shift.',
        icon: 'refresh',
      },
    ],
    stepLabelPrefix: 'Step',
    featureAlt: 'Consultation atmosphere',
  },
  consultationDesk: {
    eyebrow: 'Booking Desk',
    headline: 'When the timing feels right, booking is straightforward.',
    description:
      'Open dates are published in advance so you can review options, choose a suitable time, and confirm a session without unnecessary back-and-forth.',
    railEyebrow: 'Before you confirm',
    railHeadline: 'Date, time, and care type stay visible at every step.',
    railDescription:
      'The desk is designed to stay simple and quiet: secure sign-in, clear choices, and later access through the patient dashboard whenever you need to return.',
    proofItems: [
      {
        icon: 'shield',
        label: 'Confidential',
        detail: 'Handled inside the same secure patient system.',
      },
      {
        icon: 'check',
        label: 'Live Availability',
        detail: 'Only open dates and active slots are shown.',
      },
      {
        icon: 'lock',
        label: 'Manageable Later',
        detail: 'Reschedule or cancel from the dashboard when needed.',
      },
    ],
    currentMonthLabel: 'Current month',
    selectedDayLabel: 'Selected day',
    nextOpeningLabel: 'Next opening',
    liveDeskLabel: 'Live desk',
    noFutureDatesText: 'No future dates are published right now.',
    nextOpeningPendingLabel: 'Pending',
    nearestPublishedSuffix: 'is the nearest published date.',
    publishedDateSingularLabel: 'published date',
    publishedDatePluralLabel: 'published dates',
    slotSingularLabel: 'slot',
    slotPluralLabel: 'slots',
    signInRequiredToast: 'Please sign in to book this slot.',
    availabilityLoadError: 'Live availability is temporarily unavailable. Please refresh and try again.',
    signInPrompt: 'Sign in once to confirm the slot, then manage future changes from your patient dashboard.',
    signInCtaLabel: 'Open sign-in',
    datePanelTitle: 'Select a Date',
    datePanelDescription: 'Highlighted dates already contain published openings.',
    openInMonthLabelPrefix: 'Open in',
    loadingAvailabilityText: 'Checking published availability.',
    availabilityHint: 'Use the highlighted dates to move directly into the slot view.',
    nextOpenDateLabel: 'Next open date',
    noMonthAvailabilityText: 'No availability has been published for this month yet.',
    slotsPanelDescription: 'Choose from the currently available slots below.',
    slotsAvailableSuffix: 'available',
    chooseTimeLabel: 'Choose a time',
    dayOffTitle: 'This day is marked off in the practice schedule.',
    noSlotsTitle: 'No slots are available for the selected date.',
    availabilityErrorTitle: 'Availability could not be loaded right now.',
    emptyStateHint: 'Browse the highlighted dates in the calendar or jump to the next open day below.',
    jumpNextDateLabel: 'Jump to next available date',
    locationDescription: 'In-person consultations, typically 45 to 60 minutes.',
    serviceTypes: [
      {
        value: 'General Counseling',
        label: 'General Counseling',
        icon: 'Talk',
        desc: 'Supportive sessions for emotional wellbeing, stress, and life transitions.',
      },
      {
        value: 'Cognitive Behavioral Therapy (CBT)',
        label: 'Cognitive Behavioral Therapy',
        icon: 'CBT',
        desc: 'Evidence-based work to reshape thought patterns and coping responses.',
      },
      {
        value: 'Behavior Management',
        label: 'Behavior Management',
        icon: 'Plan',
        desc: 'Structured strategies for behavior-focused interventions and routines.',
      },
      {
        value: 'Child Therapy',
        label: 'Child Therapy',
        icon: 'Youth',
        desc: 'Age-appropriate care for children and adolescents in a safe setting.',
      },
    ],
    modalConfirmTitle: 'Confirm Booking',
    modalConfirmDescription: 'Review the session details before you reserve the slot.',
    modalDateLabel: 'Date',
    modalTimeLabel: 'Time',
    modalPatientLabel: 'Patient',
    modalServiceTypeLabel: 'Service Type',
    modalNotesLabel: 'Notes',
    modalNotesOptionalLabel: 'optional',
    modalNotesPlaceholder: 'Anything useful to know before the session?',
    modalBackLabel: 'Back',
    modalConfirmButtonLabel: 'Confirm Booking',
    modalConfirmingLabel: 'Confirming...',
    modalSuccessTitle: 'Booking Confirmed',
    modalSuccessDescription: 'Your session has been reserved and is ready in the dashboard.',
    modalDateTimeLabel: 'Date and Time',
    modalServiceLabel: 'Service',
    modalEmailQueuedPrefix: 'A confirmation email will be queued for',
    modalDashboardFallback: 'You can review this appointment in your patient dashboard.',
    modalDoneLabel: 'Done',
    modalViewAppointmentsLabel: 'View My Appointments',
    modalCloseAriaLabel: 'Close booking dialog',
  },
  footer: {
    ctaEyebrow: 'Take the next step',
    ctaHeadline: 'Explore the practice first, then book when the time feels right.',
    ctaDescription:
      'Read through the profile, review the areas of practice, and move to the booking desk whenever you feel ready to begin.',
    bookingCtaLabel: 'Go to the Booking Desk',
    artCtaLabel: 'View the Artwork',
    bookingCtaHref: '/#consultation-desk',
    artCtaHref: 'https://instagram.com/lifeindoodless',
    summary: 'Consultant Counselor, Behavior Therapist, and Educator.',
    affiliationLine:
      'Consultant Counselor and Behavior Therapist, CAFS Sri Lanka\nPostgraduate study, University of Colombo',
    closingLine: 'Clear care. Confidential support. Practical movement.',
    ethicsLine: 'Client dignity, confidentiality, and professional ethics remain central throughout.',
    copyrightName: 'Aadhila M. Biswas',
    copyrightPrefix: 'Copyright',
    copyrightSuffix: 'All rights reserved.',
    instagramUrl: 'https://instagram.com/lifeindoodless',
    instagramLabel: '@lifeindoodless on Instagram',
    organizationLabel: 'CAFS Sri Lanka',
    organizationUrl: 'https://www.cafssrilanka.lk',
    exploreColumnTitle: 'Explore',
    visitColumnTitle: 'Visit',
  },
};

function readTrimmedString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readObject(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readStringList(value: unknown, fallback: string[], maxLength: number = fallback.length || 12) {
  return Array.isArray(value)
    ? defaultStringArray(
        value.filter((entry): entry is string => typeof entry === 'string')
      ).slice(0, maxLength)
    : fallback;
}

const siteIconKeys: SiteIconKey[] = [
  'activity',
  'arrow',
  'book',
  'brain',
  'briefcase',
  'calendar',
  'check',
  'clock',
  'gallery',
  'graduation',
  'heart',
  'lock',
  'refresh',
  'route',
  'shield',
  'sparkles',
  'users',
];

function readIconKey(value: unknown, fallback: SiteIconKey): SiteIconKey {
  return typeof value === 'string' && siteIconKeys.includes(value as SiteIconKey)
    ? (value as SiteIconKey)
    : fallback;
}

function readTextCards(value: unknown, fallback: SiteTextCard[], maxLength = fallback.length || 8) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const validCards = value
    .map((entry, index) => {
      const record = readObject(entry);
      const fallbackCard = fallback[index] || fallback[0] || { title: '', description: '', icon: 'sparkles' as SiteIconKey };
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const description = typeof record.description === 'string' ? record.description.trim() : '';

      return title && description
        ? {
            title,
            description,
            icon: readIconKey(record.icon, fallbackCard.icon),
          }
        : null;
    })
    .filter((entry): entry is SiteTextCard => Boolean(entry));

  return validCards.length > 0 ? validCards.slice(0, maxLength) : fallback;
}

function readTimelineItems(value: unknown, fallback: SiteTimelineItem[], maxLength = fallback.length || 8) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const validItems = value
    .map((entry, index) => {
      const record = readObject(entry);
      const fallbackItem = fallback[index] || fallback[0] || { title: '', institution: '', period: '', description: '' };
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const institution = typeof record.institution === 'string' ? record.institution.trim() : '';
      const period = readTrimmedString(record.period, fallbackItem.period);
      const description = readTrimmedString(record.description, fallbackItem.description);

      return title && institution
        ? {
            title,
            institution,
            period,
            description,
          }
        : null;
    })
    .filter((entry): entry is SiteTimelineItem => Boolean(entry));

  return validItems.length > 0 ? validItems.slice(0, maxLength) : fallback;
}

function readBookingServices(value: unknown, fallback: SiteBookingService[], maxLength = fallback.length || 8) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const validServices = value
    .map((entry, index) => {
      const record = readObject(entry);
      const fallbackService = fallback[index] || fallback[0] || { value: '', label: '', icon: '', desc: '' };
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const valueText = typeof record.value === 'string' && record.value.trim() ? record.value.trim() : label;
      const icon = readTrimmedString(record.icon, fallbackService.icon);
      const desc = readTrimmedString(record.desc, fallbackService.desc);

      return valueText && label
        ? {
            value: valueText,
            label,
            icon,
            desc,
          }
        : null;
    })
    .filter((entry): entry is SiteBookingService => Boolean(entry));

  return validServices.length > 0 ? validServices.slice(0, maxLength) : fallback;
}

function readBookingProofItems(value: unknown, fallback: SiteBookingProofItem[], maxLength = fallback.length || 6) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const validItems = value
    .map((entry, index) => {
      const record = readObject(entry);
      const fallbackItem = fallback[index] || fallback[0] || { label: '', detail: '', icon: 'shield' as SiteIconKey };
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const detail = typeof record.detail === 'string' ? record.detail.trim() : '';

      return label && detail
        ? {
            label,
            detail,
            icon: readIconKey(record.icon, fallbackItem.icon),
          }
        : null;
    })
    .filter((entry): entry is SiteBookingProofItem => Boolean(entry));

  return validItems.length > 0 ? validItems.slice(0, maxLength) : fallback;
}

function readSceneId(value: unknown, fallback: FrameSequenceSceneId): FrameSequenceSceneId {
  return typeof value === 'string' && value in frameSequenceManifest
    ? (value as FrameSequenceSceneId)
    : fallback;
}

function readSectionOrder(value: unknown, fallback: HomepageSectionId[]): HomepageSectionId[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const seen = new Set<HomepageSectionId>();
  const nextOrder: HomepageSectionId[] = [];

  value.forEach((entry) => {
    if (typeof entry === 'string' && homepageSectionIds.includes(entry as HomepageSectionId)) {
      const sectionId = entry as HomepageSectionId;
      if (!seen.has(sectionId)) {
        seen.add(sectionId);
        nextOrder.push(sectionId);
      }
    }
  });

  homepageSectionIds.forEach((sectionId) => {
    if (!seen.has(sectionId)) {
      nextOrder.push(sectionId);
    }
  });

  return nextOrder;
}

function readSectionVisibility(value: unknown, fallback: Record<HomepageSectionId, boolean>) {
  const record = readObject(value);

  return homepageSectionIds.reduce((accumulator, sectionId) => {
    accumulator[sectionId] = readBoolean(record[sectionId], fallback[sectionId]);
    return accumulator;
  }, {} as Record<HomepageSectionId, boolean>);
}

function readSectionLabels(value: unknown, fallback: Record<HomepageSectionId, string>) {
  const record = readObject(value);

  return homepageSectionIds.reduce((accumulator, sectionId) => {
    accumulator[sectionId] = readTrimmedString(record[sectionId], fallback[sectionId]);
    return accumulator;
  }, {} as Record<HomepageSectionId, string>);
}

export function sanitizeSiteSettings(raw: unknown): SiteSettings {
  const data = readObject(raw);
  const homepage = readObject(data.homepage);
  const motion = readObject(data.motion);
  const media = readObject(data.media);
  const appCopy = readObject(data.appCopy);
  const loginModal = readObject(data.loginModal);
  const branding = readObject(data.branding);
  const hero = readObject(data.hero);
  const ethos = readObject(data.ethos);
  const services = readObject(data.services);
  const credentials = readObject(data.credentials);
  const artStudio = readObject(data.artStudio);
  const consultationExperience = readObject(data.consultationExperience);
  const consultationDesk = readObject(data.consultationDesk);
  const footer = readObject(data.footer);
  const themeCandidate =
    data.theme && typeof data.theme === 'object'
      ? (data.theme as ThemeState)
      : defaultSiteSettings.theme;

  return {
    schemaVersion: siteSettingsSchemaVersion,
    themeStudioEnabled: readBoolean(data.themeStudioEnabled, defaultSiteSettings.themeStudioEnabled),
    theme: sanitizeThemeState(themeCandidate, themePresets),
    motion: {
      heroSceneId: readSceneId(motion.heroSceneId, defaultSiteSettings.motion.heroSceneId),
      artSceneId: readSceneId(motion.artSceneId, defaultSiteSettings.motion.artSceneId),
      pointerStrength: readNumber(
        motion.pointerStrength,
        defaultSiteSettings.motion.pointerStrength,
        4,
        24
      ),
    },
    homepage: {
      sectionOrder: readSectionOrder(homepage.sectionOrder, defaultSiteSettings.homepage.sectionOrder),
      visibility: readSectionVisibility(homepage.visibility, defaultSiteSettings.homepage.visibility),
      labels: readSectionLabels(homepage.labels, defaultSiteSettings.homepage.labels),
    },
    media: {
      heroPrimaryUrl: readTrimmedString(media.heroPrimaryUrl, defaultSiteSettings.media.heroPrimaryUrl),
      heroSupportingUrls: readStringList(
        media.heroSupportingUrls,
        defaultSiteSettings.media.heroSupportingUrls,
        3
      ),
      artFeatureUrl: readTrimmedString(media.artFeatureUrl, defaultSiteSettings.media.artFeatureUrl),
      artGalleryUrls: readStringList(media.artGalleryUrls, defaultSiteSettings.media.artGalleryUrls, 6),
      consultationFeatureUrl: readTrimmedString(
        media.consultationFeatureUrl,
        defaultSiteSettings.media.consultationFeatureUrl
      ),
    },
    appCopy: {
      skipLinkLabel: readTrimmedString(appCopy.skipLinkLabel, defaultSiteSettings.appCopy.skipLinkLabel),
      routeLoaderTitle: readTrimmedString(appCopy.routeLoaderTitle, defaultSiteSettings.appCopy.routeLoaderTitle),
      routeLoaderDescription: readTrimmedString(
        appCopy.routeLoaderDescription,
        defaultSiteSettings.appCopy.routeLoaderDescription
      ),
    },
    loginModal: {
      closeAriaLabel: readTrimmedString(loginModal.closeAriaLabel, defaultSiteSettings.loginModal.closeAriaLabel),
      title: readTrimmedString(loginModal.title, defaultSiteSettings.loginModal.title),
      selectDescription: readTrimmedString(
        loginModal.selectDescription,
        defaultSiteSettings.loginModal.selectDescription
      ),
      phoneStartDescription: readTrimmedString(
        loginModal.phoneStartDescription,
        defaultSiteSettings.loginModal.phoneStartDescription
      ),
      phoneVerifyDescription: readTrimmedString(
        loginModal.phoneVerifyDescription,
        defaultSiteSettings.loginModal.phoneVerifyDescription
      ),
      googleCtaLabel: readTrimmedString(loginModal.googleCtaLabel, defaultSiteSettings.loginModal.googleCtaLabel),
      googleSuccessToast: readTrimmedString(
        loginModal.googleSuccessToast,
        defaultSiteSettings.loginModal.googleSuccessToast
      ),
      googleFailureFallback: readTrimmedString(
        loginModal.googleFailureFallback,
        defaultSiteSettings.loginModal.googleFailureFallback
      ),
      dividerLabel: readTrimmedString(loginModal.dividerLabel, defaultSiteSettings.loginModal.dividerLabel),
      phoneCtaLabel: readTrimmedString(loginModal.phoneCtaLabel, defaultSiteSettings.loginModal.phoneCtaLabel),
      phoneNumberLabel: readTrimmedString(
        loginModal.phoneNumberLabel,
        defaultSiteSettings.loginModal.phoneNumberLabel
      ),
      phonePlaceholder: readTrimmedString(
        loginModal.phonePlaceholder,
        defaultSiteSettings.loginModal.phonePlaceholder
      ),
      sendingLabel: readTrimmedString(loginModal.sendingLabel, defaultSiteSettings.loginModal.sendingLabel),
      sendCodeLabel: readTrimmedString(loginModal.sendCodeLabel, defaultSiteSettings.loginModal.sendCodeLabel),
      backOptionsLabel: readTrimmedString(
        loginModal.backOptionsLabel,
        defaultSiteSettings.loginModal.backOptionsLabel
      ),
      otpLabel: readTrimmedString(loginModal.otpLabel, defaultSiteSettings.loginModal.otpLabel),
      otpPlaceholder: readTrimmedString(loginModal.otpPlaceholder, defaultSiteSettings.loginModal.otpPlaceholder),
      verifyingLabel: readTrimmedString(loginModal.verifyingLabel, defaultSiteSettings.loginModal.verifyingLabel),
      verifyCtaLabel: readTrimmedString(loginModal.verifyCtaLabel, defaultSiteSettings.loginModal.verifyCtaLabel),
      wrongNumberLabel: readTrimmedString(
        loginModal.wrongNumberLabel,
        defaultSiteSettings.loginModal.wrongNumberLabel
      ),
      portalAgreement: readTrimmedString(
        loginModal.portalAgreement,
        defaultSiteSettings.loginModal.portalAgreement
      ),
      phoneRequiredError: readTrimmedString(
        loginModal.phoneRequiredError,
        defaultSiteSettings.loginModal.phoneRequiredError
      ),
      recaptchaError: readTrimmedString(loginModal.recaptchaError, defaultSiteSettings.loginModal.recaptchaError),
      verificationSentToast: readTrimmedString(
        loginModal.verificationSentToast,
        defaultSiteSettings.loginModal.verificationSentToast
      ),
      smsFailureFallback: readTrimmedString(
        loginModal.smsFailureFallback,
        defaultSiteSettings.loginModal.smsFailureFallback
      ),
      otpRequiredError: readTrimmedString(
        loginModal.otpRequiredError,
        defaultSiteSettings.loginModal.otpRequiredError
      ),
      otpSuccessToast: readTrimmedString(
        loginModal.otpSuccessToast,
        defaultSiteSettings.loginModal.otpSuccessToast
      ),
      invalidOtpError: readTrimmedString(
        loginModal.invalidOtpError,
        defaultSiteSettings.loginModal.invalidOtpError
      ),
    },
    branding: {
      wordmark: readTrimmedString(branding.wordmark, defaultSiteSettings.branding.wordmark),
      strapline: readTrimmedString(branding.strapline, defaultSiteSettings.branding.strapline),
      practitionerName: readTrimmedString(
        branding.practitionerName,
        defaultSiteSettings.branding.practitionerName
      ),
      clinicLabel: readTrimmedString(branding.clinicLabel, defaultSiteSettings.branding.clinicLabel),
      siteTitle: readTrimmedString(branding.siteTitle, defaultSiteSettings.branding.siteTitle),
      contactEmail: readTrimmedString(branding.contactEmail, defaultSiteSettings.branding.contactEmail),
      contactPhone: readTrimmedString(branding.contactPhone, defaultSiteSettings.branding.contactPhone),
      location: readTrimmedString(branding.location, defaultSiteSettings.branding.location),
      signInLabel: readTrimmedString(branding.signInLabel, defaultSiteSettings.branding.signInLabel),
      signInToContinueLabel: readTrimmedString(
        branding.signInToContinueLabel,
        defaultSiteSettings.branding.signInToContinueLabel
      ),
      signOutLabel: readTrimmedString(branding.signOutLabel, defaultSiteSettings.branding.signOutLabel),
      patientDashboardLabel: readTrimmedString(
        branding.patientDashboardLabel,
        defaultSiteSettings.branding.patientDashboardLabel
      ),
      adminDashboardLabel: readTrimmedString(
        branding.adminDashboardLabel,
        defaultSiteSettings.branding.adminDashboardLabel
      ),
      userFallbackLabel: readTrimmedString(branding.userFallbackLabel, defaultSiteSettings.branding.userFallbackLabel),
      mobileSignInPrompt: readTrimmedString(
        branding.mobileSignInPrompt,
        defaultSiteSettings.branding.mobileSignInPrompt
      ),
      userMenuAriaLabel: readTrimmedString(
        branding.userMenuAriaLabel,
        defaultSiteSettings.branding.userMenuAriaLabel
      ),
      toggleMenuAriaLabel: readTrimmedString(
        branding.toggleMenuAriaLabel,
        defaultSiteSettings.branding.toggleMenuAriaLabel
      ),
      closeMenuAriaLabel: readTrimmedString(
        branding.closeMenuAriaLabel,
        defaultSiteSettings.branding.closeMenuAriaLabel
      ),
      signOutSuccessToast: readTrimmedString(
        branding.signOutSuccessToast,
        defaultSiteSettings.branding.signOutSuccessToast
      ),
      signOutErrorToast: readTrimmedString(
        branding.signOutErrorToast,
        defaultSiteSettings.branding.signOutErrorToast
      ),
    },
    hero: {
      eyebrow: readTrimmedString(hero.eyebrow, defaultSiteSettings.hero.eyebrow),
      headline: readTrimmedString(hero.headline, defaultSiteSettings.hero.headline),
      description: readTrimmedString(hero.description, defaultSiteSettings.hero.description),
      primaryCtaLabel: readTrimmedString(hero.primaryCtaLabel, defaultSiteSettings.hero.primaryCtaLabel),
      secondaryCtaLabel: readTrimmedString(
        hero.secondaryCtaLabel,
        defaultSiteSettings.hero.secondaryCtaLabel
      ),
      primaryCtaHref: readTrimmedString(hero.primaryCtaHref, defaultSiteSettings.hero.primaryCtaHref),
      secondaryCtaHref: readTrimmedString(
        hero.secondaryCtaHref,
        defaultSiteSettings.hero.secondaryCtaHref
      ),
      badges: readStringList(hero.badges, defaultSiteSettings.hero.badges, 6),
      mediaAlt: readTrimmedString(hero.mediaAlt, defaultSiteSettings.hero.mediaAlt),
      mediaEyebrow: readTrimmedString(hero.mediaEyebrow, defaultSiteSettings.hero.mediaEyebrow),
      mediaHeadline: readTrimmedString(hero.mediaHeadline, defaultSiteSettings.hero.mediaHeadline),
      mediaBadge: readTrimmedString(hero.mediaBadge, defaultSiteSettings.hero.mediaBadge),
      supportingFrameAltPrefix: readTrimmedString(
        hero.supportingFrameAltPrefix,
        defaultSiteSettings.hero.supportingFrameAltPrefix
      ),
      supportingFrameBadgePrefix: readTrimmedString(
        hero.supportingFrameBadgePrefix,
        defaultSiteSettings.hero.supportingFrameBadgePrefix
      ),
      supportNote: readTrimmedString(hero.supportNote, defaultSiteSettings.hero.supportNote),
      trustCards: readTextCards(hero.trustCards, defaultSiteSettings.hero.trustCards, 6),
      noteCards: readTextCards(hero.noteCards, defaultSiteSettings.hero.noteCards, 6),
    },
    ethos: {
      eyebrow: readTrimmedString(ethos.eyebrow, defaultSiteSettings.ethos.eyebrow),
      headline: readTrimmedString(ethos.headline, defaultSiteSettings.ethos.headline),
      intro: readTrimmedString(ethos.intro, defaultSiteSettings.ethos.intro),
      panelEyebrow: readTrimmedString(ethos.panelEyebrow, defaultSiteSettings.ethos.panelEyebrow),
      panelHeadline: readTrimmedString(ethos.panelHeadline, defaultSiteSettings.ethos.panelHeadline),
      panelDescription: readTrimmedString(
        ethos.panelDescription,
        defaultSiteSettings.ethos.panelDescription
      ),
      settingLabel: readTrimmedString(ethos.settingLabel, defaultSiteSettings.ethos.settingLabel),
      settingValue: readTrimmedString(ethos.settingValue, defaultSiteSettings.ethos.settingValue),
      settingDescription: readTrimmedString(
        ethos.settingDescription,
        defaultSiteSettings.ethos.settingDescription
      ),
      approachLabel: readTrimmedString(ethos.approachLabel, defaultSiteSettings.ethos.approachLabel),
      approachValue: readTrimmedString(ethos.approachValue, defaultSiteSettings.ethos.approachValue),
      approachDescription: readTrimmedString(
        ethos.approachDescription,
        defaultSiteSettings.ethos.approachDescription
      ),
      trustTitle: readTrimmedString(ethos.trustTitle, defaultSiteSettings.ethos.trustTitle),
      trustDescription: readTrimmedString(
        ethos.trustDescription,
        defaultSiteSettings.ethos.trustDescription
      ),
      privacyTitle: readTrimmedString(ethos.privacyTitle, defaultSiteSettings.ethos.privacyTitle),
      privacyDescription: readTrimmedString(
        ethos.privacyDescription,
        defaultSiteSettings.ethos.privacyDescription
      ),
      progressTitle: readTrimmedString(ethos.progressTitle, defaultSiteSettings.ethos.progressTitle),
      progressDescription: readTrimmedString(
        ethos.progressDescription,
        defaultSiteSettings.ethos.progressDescription
      ),
    },
    services: {
      eyebrow: readTrimmedString(services.eyebrow, defaultSiteSettings.services.eyebrow),
      headline: readTrimmedString(services.headline, defaultSiteSettings.services.headline),
      intro: readTrimmedString(services.intro, defaultSiteSettings.services.intro),
      featuredEyebrow: readTrimmedString(
        services.featuredEyebrow,
        defaultSiteSettings.services.featuredEyebrow
      ),
      featuredTitle: readTrimmedString(services.featuredTitle, defaultSiteSettings.services.featuredTitle),
      featuredDescription: readTrimmedString(
        services.featuredDescription,
        defaultSiteSettings.services.featuredDescription
      ),
      benefits: readStringList(services.benefits, defaultSiteSettings.services.benefits, 8),
      toneEyebrow: readTrimmedString(services.toneEyebrow, defaultSiteSettings.services.toneEyebrow),
      toneHeadline: readTrimmedString(services.toneHeadline, defaultSiteSettings.services.toneHeadline),
      toneDescription: readTrimmedString(
        services.toneDescription,
        defaultSiteSettings.services.toneDescription
      ),
      practiceCards: readTextCards(services.practiceCards, defaultSiteSettings.services.practiceCards, 8),
    },
    credentials: {
      eyebrow: readTrimmedString(credentials.eyebrow, defaultSiteSettings.credentials.eyebrow),
      headline: readTrimmedString(credentials.headline, defaultSiteSettings.credentials.headline),
      intro: readTrimmedString(credentials.intro, defaultSiteSettings.credentials.intro),
      railEyebrow: readTrimmedString(credentials.railEyebrow, defaultSiteSettings.credentials.railEyebrow),
      railHeadline: readTrimmedString(credentials.railHeadline, defaultSiteSettings.credentials.railHeadline),
      railDescription: readTrimmedString(
        credentials.railDescription,
        defaultSiteSettings.credentials.railDescription
      ),
      highlights: readStringList(credentials.highlights, defaultSiteSettings.credentials.highlights, 6),
      professionalRailLabel: readTrimmedString(
        credentials.professionalRailLabel,
        defaultSiteSettings.credentials.professionalRailLabel
      ),
      professionalRailDescription: readTrimmedString(
        credentials.professionalRailDescription,
        defaultSiteSettings.credentials.professionalRailDescription
      ),
      educationRailLabel: readTrimmedString(
        credentials.educationRailLabel,
        defaultSiteSettings.credentials.educationRailLabel
      ),
      educationRailDescription: readTrimmedString(
        credentials.educationRailDescription,
        defaultSiteSettings.credentials.educationRailDescription
      ),
      roleLabel: readTrimmedString(credentials.roleLabel, defaultSiteSettings.credentials.roleLabel),
      studyLabel: readTrimmedString(credentials.studyLabel, defaultSiteSettings.credentials.studyLabel),
      professionalRoles: readTimelineItems(
        credentials.professionalRoles,
        defaultSiteSettings.credentials.professionalRoles,
        8
      ),
      educationTimeline: readTimelineItems(
        credentials.educationTimeline,
        defaultSiteSettings.credentials.educationTimeline,
        8
      ),
    },
    artStudio: {
      eyebrow: readTrimmedString(artStudio.eyebrow, defaultSiteSettings.artStudio.eyebrow),
      headline: readTrimmedString(artStudio.headline, defaultSiteSettings.artStudio.headline),
      intro: readTrimmedString(artStudio.intro, defaultSiteSettings.artStudio.intro),
      panelEyebrow: readTrimmedString(artStudio.panelEyebrow, defaultSiteSettings.artStudio.panelEyebrow),
      panelHeadline: readTrimmedString(artStudio.panelHeadline, defaultSiteSettings.artStudio.panelHeadline),
      panelDescription: readTrimmedString(
        artStudio.panelDescription,
        defaultSiteSettings.artStudio.panelDescription
      ),
      instagramCtaLabel: readTrimmedString(
        artStudio.instagramCtaLabel,
        defaultSiteSettings.artStudio.instagramCtaLabel
      ),
      galleryCaption: readTrimmedString(artStudio.galleryCaption, defaultSiteSettings.artStudio.galleryCaption),
      featureAlt: readTrimmedString(artStudio.featureAlt, defaultSiteSettings.artStudio.featureAlt),
      galleryAltPrefix: readTrimmedString(
        artStudio.galleryAltPrefix,
        defaultSiteSettings.artStudio.galleryAltPrefix
      ),
      featureBadge: readTrimmedString(artStudio.featureBadge, defaultSiteSettings.artStudio.featureBadge),
    },
    consultationExperience: {
      eyebrow: readTrimmedString(
        consultationExperience.eyebrow,
        defaultSiteSettings.consultationExperience.eyebrow
      ),
      headline: readTrimmedString(
        consultationExperience.headline,
        defaultSiteSettings.consultationExperience.headline
      ),
      description: readTrimmedString(
        consultationExperience.description,
        defaultSiteSettings.consultationExperience.description
      ),
      outcomeLabel: readTrimmedString(
        consultationExperience.outcomeLabel,
        defaultSiteSettings.consultationExperience.outcomeLabel
      ),
      outcomeHeadline: readTrimmedString(
        consultationExperience.outcomeHeadline,
        defaultSiteSettings.consultationExperience.outcomeHeadline
      ),
      outcomeDescription: readTrimmedString(
        consultationExperience.outcomeDescription,
        defaultSiteSettings.consultationExperience.outcomeDescription
      ),
      factCards: readStringList(
        consultationExperience.factCards,
        defaultSiteSettings.consultationExperience.factCards,
        6
      ),
      steps: readTextCards(consultationExperience.steps, defaultSiteSettings.consultationExperience.steps, 8),
      stepLabelPrefix: readTrimmedString(
        consultationExperience.stepLabelPrefix,
        defaultSiteSettings.consultationExperience.stepLabelPrefix
      ),
      featureAlt: readTrimmedString(
        consultationExperience.featureAlt,
        defaultSiteSettings.consultationExperience.featureAlt
      ),
    },
    consultationDesk: {
      eyebrow: readTrimmedString(consultationDesk.eyebrow, defaultSiteSettings.consultationDesk.eyebrow),
      headline: readTrimmedString(consultationDesk.headline, defaultSiteSettings.consultationDesk.headline),
      description: readTrimmedString(
        consultationDesk.description,
        defaultSiteSettings.consultationDesk.description
      ),
      railEyebrow: readTrimmedString(
        consultationDesk.railEyebrow,
        defaultSiteSettings.consultationDesk.railEyebrow
      ),
      railHeadline: readTrimmedString(
        consultationDesk.railHeadline,
        defaultSiteSettings.consultationDesk.railHeadline
      ),
      railDescription: readTrimmedString(
        consultationDesk.railDescription,
        defaultSiteSettings.consultationDesk.railDescription
      ),
      proofItems: readBookingProofItems(
        consultationDesk.proofItems,
        defaultSiteSettings.consultationDesk.proofItems,
        6
      ),
      currentMonthLabel: readTrimmedString(
        consultationDesk.currentMonthLabel,
        defaultSiteSettings.consultationDesk.currentMonthLabel
      ),
      selectedDayLabel: readTrimmedString(
        consultationDesk.selectedDayLabel,
        defaultSiteSettings.consultationDesk.selectedDayLabel
      ),
      nextOpeningLabel: readTrimmedString(
        consultationDesk.nextOpeningLabel,
        defaultSiteSettings.consultationDesk.nextOpeningLabel
      ),
      liveDeskLabel: readTrimmedString(consultationDesk.liveDeskLabel, defaultSiteSettings.consultationDesk.liveDeskLabel),
      noFutureDatesText: readTrimmedString(
        consultationDesk.noFutureDatesText,
        defaultSiteSettings.consultationDesk.noFutureDatesText
      ),
      nextOpeningPendingLabel: readTrimmedString(
        consultationDesk.nextOpeningPendingLabel,
        defaultSiteSettings.consultationDesk.nextOpeningPendingLabel
      ),
      nearestPublishedSuffix: readTrimmedString(
        consultationDesk.nearestPublishedSuffix,
        defaultSiteSettings.consultationDesk.nearestPublishedSuffix
      ),
      publishedDateSingularLabel: readTrimmedString(
        consultationDesk.publishedDateSingularLabel,
        defaultSiteSettings.consultationDesk.publishedDateSingularLabel
      ),
      publishedDatePluralLabel: readTrimmedString(
        consultationDesk.publishedDatePluralLabel,
        defaultSiteSettings.consultationDesk.publishedDatePluralLabel
      ),
      slotSingularLabel: readTrimmedString(
        consultationDesk.slotSingularLabel,
        defaultSiteSettings.consultationDesk.slotSingularLabel
      ),
      slotPluralLabel: readTrimmedString(
        consultationDesk.slotPluralLabel,
        defaultSiteSettings.consultationDesk.slotPluralLabel
      ),
      signInRequiredToast: readTrimmedString(
        consultationDesk.signInRequiredToast,
        defaultSiteSettings.consultationDesk.signInRequiredToast
      ),
      availabilityLoadError: readTrimmedString(
        consultationDesk.availabilityLoadError,
        defaultSiteSettings.consultationDesk.availabilityLoadError
      ),
      signInPrompt: readTrimmedString(consultationDesk.signInPrompt, defaultSiteSettings.consultationDesk.signInPrompt),
      signInCtaLabel: readTrimmedString(
        consultationDesk.signInCtaLabel,
        defaultSiteSettings.consultationDesk.signInCtaLabel
      ),
      datePanelTitle: readTrimmedString(
        consultationDesk.datePanelTitle,
        defaultSiteSettings.consultationDesk.datePanelTitle
      ),
      datePanelDescription: readTrimmedString(
        consultationDesk.datePanelDescription,
        defaultSiteSettings.consultationDesk.datePanelDescription
      ),
      openInMonthLabelPrefix: readTrimmedString(
        consultationDesk.openInMonthLabelPrefix,
        defaultSiteSettings.consultationDesk.openInMonthLabelPrefix
      ),
      loadingAvailabilityText: readTrimmedString(
        consultationDesk.loadingAvailabilityText,
        defaultSiteSettings.consultationDesk.loadingAvailabilityText
      ),
      availabilityHint: readTrimmedString(
        consultationDesk.availabilityHint,
        defaultSiteSettings.consultationDesk.availabilityHint
      ),
      nextOpenDateLabel: readTrimmedString(
        consultationDesk.nextOpenDateLabel,
        defaultSiteSettings.consultationDesk.nextOpenDateLabel
      ),
      noMonthAvailabilityText: readTrimmedString(
        consultationDesk.noMonthAvailabilityText,
        defaultSiteSettings.consultationDesk.noMonthAvailabilityText
      ),
      slotsPanelDescription: readTrimmedString(
        consultationDesk.slotsPanelDescription,
        defaultSiteSettings.consultationDesk.slotsPanelDescription
      ),
      slotsAvailableSuffix: readTrimmedString(
        consultationDesk.slotsAvailableSuffix,
        defaultSiteSettings.consultationDesk.slotsAvailableSuffix
      ),
      chooseTimeLabel: readTrimmedString(
        consultationDesk.chooseTimeLabel,
        defaultSiteSettings.consultationDesk.chooseTimeLabel
      ),
      dayOffTitle: readTrimmedString(consultationDesk.dayOffTitle, defaultSiteSettings.consultationDesk.dayOffTitle),
      noSlotsTitle: readTrimmedString(consultationDesk.noSlotsTitle, defaultSiteSettings.consultationDesk.noSlotsTitle),
      availabilityErrorTitle: readTrimmedString(
        consultationDesk.availabilityErrorTitle,
        defaultSiteSettings.consultationDesk.availabilityErrorTitle
      ),
      emptyStateHint: readTrimmedString(
        consultationDesk.emptyStateHint,
        defaultSiteSettings.consultationDesk.emptyStateHint
      ),
      jumpNextDateLabel: readTrimmedString(
        consultationDesk.jumpNextDateLabel,
        defaultSiteSettings.consultationDesk.jumpNextDateLabel
      ),
      locationDescription: readTrimmedString(
        consultationDesk.locationDescription,
        defaultSiteSettings.consultationDesk.locationDescription
      ),
      serviceTypes: readBookingServices(
        consultationDesk.serviceTypes,
        defaultSiteSettings.consultationDesk.serviceTypes,
        8
      ),
      modalConfirmTitle: readTrimmedString(
        consultationDesk.modalConfirmTitle,
        defaultSiteSettings.consultationDesk.modalConfirmTitle
      ),
      modalConfirmDescription: readTrimmedString(
        consultationDesk.modalConfirmDescription,
        defaultSiteSettings.consultationDesk.modalConfirmDescription
      ),
      modalDateLabel: readTrimmedString(
        consultationDesk.modalDateLabel,
        defaultSiteSettings.consultationDesk.modalDateLabel
      ),
      modalTimeLabel: readTrimmedString(
        consultationDesk.modalTimeLabel,
        defaultSiteSettings.consultationDesk.modalTimeLabel
      ),
      modalPatientLabel: readTrimmedString(
        consultationDesk.modalPatientLabel,
        defaultSiteSettings.consultationDesk.modalPatientLabel
      ),
      modalServiceTypeLabel: readTrimmedString(
        consultationDesk.modalServiceTypeLabel,
        defaultSiteSettings.consultationDesk.modalServiceTypeLabel
      ),
      modalNotesLabel: readTrimmedString(
        consultationDesk.modalNotesLabel,
        defaultSiteSettings.consultationDesk.modalNotesLabel
      ),
      modalNotesOptionalLabel: readTrimmedString(
        consultationDesk.modalNotesOptionalLabel,
        defaultSiteSettings.consultationDesk.modalNotesOptionalLabel
      ),
      modalNotesPlaceholder: readTrimmedString(
        consultationDesk.modalNotesPlaceholder,
        defaultSiteSettings.consultationDesk.modalNotesPlaceholder
      ),
      modalBackLabel: readTrimmedString(
        consultationDesk.modalBackLabel,
        defaultSiteSettings.consultationDesk.modalBackLabel
      ),
      modalConfirmButtonLabel: readTrimmedString(
        consultationDesk.modalConfirmButtonLabel,
        defaultSiteSettings.consultationDesk.modalConfirmButtonLabel
      ),
      modalConfirmingLabel: readTrimmedString(
        consultationDesk.modalConfirmingLabel,
        defaultSiteSettings.consultationDesk.modalConfirmingLabel
      ),
      modalSuccessTitle: readTrimmedString(
        consultationDesk.modalSuccessTitle,
        defaultSiteSettings.consultationDesk.modalSuccessTitle
      ),
      modalSuccessDescription: readTrimmedString(
        consultationDesk.modalSuccessDescription,
        defaultSiteSettings.consultationDesk.modalSuccessDescription
      ),
      modalDateTimeLabel: readTrimmedString(
        consultationDesk.modalDateTimeLabel,
        defaultSiteSettings.consultationDesk.modalDateTimeLabel
      ),
      modalServiceLabel: readTrimmedString(
        consultationDesk.modalServiceLabel,
        defaultSiteSettings.consultationDesk.modalServiceLabel
      ),
      modalEmailQueuedPrefix: readTrimmedString(
        consultationDesk.modalEmailQueuedPrefix,
        defaultSiteSettings.consultationDesk.modalEmailQueuedPrefix
      ),
      modalDashboardFallback: readTrimmedString(
        consultationDesk.modalDashboardFallback,
        defaultSiteSettings.consultationDesk.modalDashboardFallback
      ),
      modalDoneLabel: readTrimmedString(
        consultationDesk.modalDoneLabel,
        defaultSiteSettings.consultationDesk.modalDoneLabel
      ),
      modalViewAppointmentsLabel: readTrimmedString(
        consultationDesk.modalViewAppointmentsLabel,
        defaultSiteSettings.consultationDesk.modalViewAppointmentsLabel
      ),
      modalCloseAriaLabel: readTrimmedString(
        consultationDesk.modalCloseAriaLabel,
        defaultSiteSettings.consultationDesk.modalCloseAriaLabel
      ),
    },
    footer: {
      ctaEyebrow: readTrimmedString(footer.ctaEyebrow, defaultSiteSettings.footer.ctaEyebrow),
      ctaHeadline: readTrimmedString(footer.ctaHeadline, defaultSiteSettings.footer.ctaHeadline),
      ctaDescription: readTrimmedString(footer.ctaDescription, defaultSiteSettings.footer.ctaDescription),
      bookingCtaLabel: readTrimmedString(footer.bookingCtaLabel, defaultSiteSettings.footer.bookingCtaLabel),
      artCtaLabel: readTrimmedString(footer.artCtaLabel, defaultSiteSettings.footer.artCtaLabel),
      bookingCtaHref: readTrimmedString(footer.bookingCtaHref, defaultSiteSettings.footer.bookingCtaHref),
      artCtaHref: readTrimmedString(footer.artCtaHref, defaultSiteSettings.footer.artCtaHref),
      summary: readTrimmedString(footer.summary, defaultSiteSettings.footer.summary),
      affiliationLine: readTrimmedString(footer.affiliationLine, defaultSiteSettings.footer.affiliationLine),
      closingLine: readTrimmedString(footer.closingLine, defaultSiteSettings.footer.closingLine),
      ethicsLine: readTrimmedString(footer.ethicsLine, defaultSiteSettings.footer.ethicsLine),
      copyrightName: readTrimmedString(footer.copyrightName, defaultSiteSettings.footer.copyrightName),
      copyrightPrefix: readTrimmedString(footer.copyrightPrefix, defaultSiteSettings.footer.copyrightPrefix),
      copyrightSuffix: readTrimmedString(footer.copyrightSuffix, defaultSiteSettings.footer.copyrightSuffix),
      instagramUrl: readTrimmedString(footer.instagramUrl, defaultSiteSettings.footer.instagramUrl),
      instagramLabel: readTrimmedString(footer.instagramLabel, defaultSiteSettings.footer.instagramLabel),
      organizationLabel: readTrimmedString(
        footer.organizationLabel,
        defaultSiteSettings.footer.organizationLabel
      ),
      organizationUrl: readTrimmedString(footer.organizationUrl, defaultSiteSettings.footer.organizationUrl),
      exploreColumnTitle: readTrimmedString(footer.exploreColumnTitle, defaultSiteSettings.footer.exploreColumnTitle),
      visitColumnTitle: readTrimmedString(footer.visitColumnTitle, defaultSiteSettings.footer.visitColumnTitle),
    },
  };
}
