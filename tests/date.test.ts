import { describe, expect, it, vi } from 'vitest';
import {
  formatStoredDate,
  getStoredMonthBounds,
  isTodayOrFutureStoredDate,
  listStoredDatesInRange,
  parseStoredDate,
  toStoredDate,
} from '../src/utils/date';

describe('date utilities', () => {
  it('converts dates to the stored yyyy-MM-dd format', () => {
    expect(toStoredDate(new Date('2026-04-08T12:34:00Z'))).toBe('2026-04-08');
  });

  it('parses stored dates back into Date objects', () => {
    expect(toStoredDate(parseStoredDate('2026-04-08'))).toBe('2026-04-08');
  });

  it('throws for invalid stored date strings', () => {
    expect(() => parseStoredDate('not-a-date')).toThrow(/Invalid stored date/);
  });

  it('formats stored dates with a custom pattern', () => {
    expect(formatStoredDate('2026-04-08', 'MMM d, yyyy')).toBe('Apr 8, 2026');
  });

  it('returns month bounds for the supplied date', () => {
    expect(getStoredMonthBounds(new Date('2026-04-08T00:00:00Z'))).toEqual({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    });
  });

  it('lists every stored date in the requested inclusive range', () => {
    expect(listStoredDatesInRange('2026-04-08', '2026-04-10')).toEqual([
      '2026-04-08',
      '2026-04-09',
      '2026-04-10',
    ]);
  });

  it('treats today and future dates as bookable, but not past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T09:00:00Z'));

    expect(isTodayOrFutureStoredDate('2026-04-08')).toBe(true);
    expect(isTodayOrFutureStoredDate('2026-04-09')).toBe(true);
    expect(isTodayOrFutureStoredDate('2026-04-07')).toBe(false);

    vi.useRealTimers();
  });
});
