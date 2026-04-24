import { describe, expect, it } from 'vitest';
import {
  defaultSiteSettings,
  sanitizeSiteSettings,
  siteSettingsSchemaVersion,
  type SiteSettings,
} from '../src/siteSettings/siteSettings';

describe('site settings sanitizer', () => {
  it('merges old saved website settings with new editable defaults', () => {
    const legacySettings = {
      ...defaultSiteSettings,
      schemaVersion: 4,
      branding: {
        ...defaultSiteSettings.branding,
        wordmark: 'CUSTOM',
      },
      hero: {
        ...defaultSiteSettings.hero,
        headline: 'Custom headline',
      },
      homepage: {
        sectionOrder: ['booking', 'hero'],
        visibility: {
          ...defaultSiteSettings.homepage.visibility,
          art: false,
        },
      },
    };

    const sanitized = sanitizeSiteSettings(legacySettings);

    expect(sanitized.schemaVersion).toBe(siteSettingsSchemaVersion);
    expect(sanitized.branding.wordmark).toBe('CUSTOM');
    expect(sanitized.hero.headline).toBe('Custom headline');
    expect(sanitized.homepage.sectionOrder[0]).toBe('booking');
    expect(sanitized.homepage.visibility.art).toBe(false);
    expect(sanitized.homepage.labels.profile).toBe(defaultSiteSettings.homepage.labels.profile);
    expect(sanitized.hero.trustCards.length).toBeGreaterThan(0);
    expect(sanitized.consultationDesk.serviceTypes.length).toBeGreaterThan(0);
  });

  it('keeps valid structured rows and strips invalid rows', () => {
    const rawSettings: SiteSettings = {
      ...defaultSiteSettings,
      hero: {
        ...defaultSiteSettings.hero,
        trustCards: [
          { title: 'Kept', description: 'This row is valid.', icon: 'shield' },
          { title: '', description: 'Missing a title.', icon: 'heart' },
        ],
      },
      consultationDesk: {
        ...defaultSiteSettings.consultationDesk,
        serviceTypes: [
          { value: 'Custom Service', label: 'Custom Service', icon: 'CS', desc: 'Valid service.' },
          { value: '', label: '', icon: 'Bad', desc: 'Invalid service.' },
        ],
      },
    };

    const sanitized = sanitizeSiteSettings(rawSettings);

    expect(sanitized.hero.trustCards).toEqual([
      { title: 'Kept', description: 'This row is valid.', icon: 'shield' },
    ]);
    expect(sanitized.consultationDesk.serviceTypes).toEqual([
      { value: 'Custom Service', label: 'Custom Service', icon: 'CS', desc: 'Valid service.' },
    ]);
  });

  it('upgrades legacy patient wording while preserving custom content', () => {
    const legacySettings = {
      ...defaultSiteSettings,
      schemaVersion: 4,
      loginModal: {
        ...defaultSiteSettings.loginModal,
        portalAgreement: 'By continuing, you agree to confidential use of the patient portal.',
      },
      branding: {
        ...defaultSiteSettings.branding,
        patientDashboardLabel: 'Patient Dashboard',
        userFallbackLabel: 'Patient',
      },
      hero: {
        ...defaultSiteSettings.hero,
        trustCards: [
          ...defaultSiteSettings.hero.trustCards.slice(0, 2),
          {
            ...defaultSiteSettings.hero.trustCards[2],
            description: 'Review availability, choose a slot, and manage bookings from the patient desk.',
          },
        ],
      },
      consultationExperience: {
        ...defaultSiteSettings.consultationExperience,
        factCards: [
          defaultSiteSettings.consultationExperience.factCards[0],
          'Once booked, appointments stay visible in the patient dashboard so future changes do not create extra friction.',
        ],
        steps: [
          ...defaultSiteSettings.consultationExperience.steps.slice(0, 3),
          {
            ...defaultSiteSettings.consultationExperience.steps[3],
            description: 'The patient dashboard lets you review future appointments, reschedule, or cancel when plans shift.',
          },
        ],
      },
      consultationDesk: {
        ...defaultSiteSettings.consultationDesk,
        railDescription:
          'The desk is designed to stay simple and quiet: secure sign-in, clear choices, and later access through the patient dashboard whenever you need to return.',
        proofItems: [
          {
            ...defaultSiteSettings.consultationDesk.proofItems[0],
            detail: 'Handled inside the same secure patient system.',
          },
          ...defaultSiteSettings.consultationDesk.proofItems.slice(1),
        ],
        signInPrompt:
          'Sign in once to confirm the slot, then manage future changes from your patient dashboard.',
        modalPatientLabel: 'Patient',
        modalDashboardFallback: 'You can review this appointment in your patient dashboard.',
      },
    } satisfies SiteSettings;

    const sanitized = sanitizeSiteSettings(legacySettings);

    expect(sanitized.loginModal.portalAgreement).toContain('client portal');
    expect(sanitized.branding.patientDashboardLabel).toBe('Client Dashboard');
    expect(sanitized.branding.userFallbackLabel).toBe('Client');
    expect(sanitized.hero.trustCards[2].description).toContain('client dashboard');
    expect(sanitized.consultationExperience.factCards[1]).toContain('client dashboard');
    expect(sanitized.consultationExperience.steps[3].description).toContain('client dashboard');
    expect(sanitized.consultationDesk.railDescription).toContain('client dashboard');
    expect(sanitized.consultationDesk.proofItems[0].detail).toContain('client system');
    expect(sanitized.consultationDesk.signInPrompt).toContain('client dashboard');
    expect(sanitized.consultationDesk.modalPatientLabel).toBe('Client');
    expect(sanitized.consultationDesk.modalDashboardFallback).toContain('client dashboard');

    const customSettings = {
      ...legacySettings,
      branding: {
        ...legacySettings.branding,
        patientDashboardLabel: 'Care Dashboard',
      },
    } satisfies SiteSettings;

    expect(sanitizeSiteSettings(customSettings).branding.patientDashboardLabel).toBe('Care Dashboard');
  });
});
