import { describe, expect, it } from 'vitest';
import {
  expandWebsiteSearchTokens,
  normalizeWebsiteSearchText,
  searchWebsiteSettings,
  type WebsiteSearchItem,
} from '../src/utils/websiteSettingsSearch';

const items: WebsiteSearchItem[] = [
  {
    id: 'hero-headline',
    sectionId: 'website-hero-profile',
    sectionTitle: 'Hero/Profile',
    groupId: 'hero',
    groupTitle: 'Hero',
    label: 'Hero headline',
    description: 'The main homepage headline.',
    valueText: 'Psychological support that stays clear, private, and grounded.',
    aliases: ['hero title', 'homepage headline'],
    breadcrumbs: ['Hero/Profile', 'Hero', 'Hero headline'],
    anchorId: 'hero-headline',
    kind: 'field',
  },
  {
    id: 'booking-modal-client',
    sectionId: 'website-art-booking',
    sectionTitle: 'Art/Booking',
    groupId: 'booking-desk',
    groupTitle: 'Booking desk',
    label: 'Modal client label',
    description: 'Label shown beside the booked person in the confirmation modal.',
    valueText: 'Client',
    aliases: ['patient label', 'booking modal label'],
    breadcrumbs: ['Art/Booking', 'Booking desk', 'Modal client label'],
    anchorId: 'booking-modal-client',
    kind: 'field',
  },
  {
    id: 'footer-instagram',
    sectionId: 'website-footer',
    sectionTitle: 'Footer',
    groupId: 'footer-details',
    groupTitle: 'Footer details',
    label: 'Instagram link label',
    description: 'Footer social label for the artwork profile.',
    valueText: '@lifeindoodless on Instagram',
    aliases: ['instagram', 'social'],
    breadcrumbs: ['Footer', 'Footer details', 'Instagram link label'],
    anchorId: 'footer-instagram',
    kind: 'field',
  },
  {
    id: 'booking-service-row-0',
    sectionId: 'website-art-booking',
    sectionTitle: 'Art/Booking',
    groupId: 'booking-desk',
    groupTitle: 'Booking desk',
    label: 'Booking service types item 1',
    description: 'General Counseling. Supportive sessions for emotional wellbeing, stress, and life transitions.',
    valueText: 'General Counseling Talk Supportive sessions for emotional wellbeing, stress, and life transitions.',
    aliases: ['service row', 'general counseling'],
    breadcrumbs: ['Art/Booking', 'Booking desk', 'Booking service types', 'Item 1'],
    anchorId: 'booking-service-row-0',
    kind: 'row',
  },
];

describe('website settings search', () => {
  it('normalizes punctuation and spacing', () => {
    expect(normalizeWebsiteSearchText('  Hero / CTA  Label ')).toBe('hero cta label');
  });

  it('expands synonyms for domain terms', () => {
    expect(expandWebsiteSearchTokens(['nav'])).toEqual(
      expect.arrayContaining(['nav', 'navigation', 'navbar', 'menu'])
    );
  });

  it('prefers exact and prefix label matches over value-only matches', () => {
    const results = searchWebsiteSettings(items, 'hero headline');
    expect(results[0]?.id).toBe('hero-headline');
  });

  it('finds fields through synonyms and aliases', () => {
    const results = searchWebsiteSettings(items, 'patient label');
    expect(results[0]?.id).toBe('booking-modal-client');
  });

  it('finds list and row-like items through value content', () => {
    const results = searchWebsiteSettings(items, 'general counseling');
    expect(results[0]?.id).toBe('booking-service-row-0');
  });

  it('supports typo-tolerant fuzzy matches for short misspellings', () => {
    const results = searchWebsiteSettings(items, 'instgram');
    expect(results[0]?.id).toBe('footer-instagram');
  });
});
