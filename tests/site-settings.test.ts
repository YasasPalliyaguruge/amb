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
});
