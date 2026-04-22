import { eachDayOfInterval, endOfMonth, format, isValid, parse, startOfMonth } from 'date-fns';

const DATE_KEY_FORMAT = 'yyyy-MM-dd';

export function toStoredDate(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

export function parseStoredDate(value: string): Date {
  const parsed = parse(value, DATE_KEY_FORMAT, new Date());

  if (!isValid(parsed)) {
    throw new Error(`Invalid stored date: ${value}`);
  }

  return parsed;
}

export function formatStoredDate(value: string, pattern: string): string {
  return format(parseStoredDate(value), pattern);
}

export function isTodayOrFutureStoredDate(value: string): boolean {
  return value >= toStoredDate(new Date());
}

export function getStoredMonthBounds(date: Date): { startDate: string; endDate: string } {
  return {
    startDate: toStoredDate(startOfMonth(date)),
    endDate: toStoredDate(endOfMonth(date)),
  };
}

export function listStoredDatesInRange(startDate: string, endDate: string): string[] {
  return eachDayOfInterval({
    start: parseStoredDate(startDate),
    end: parseStoredDate(endDate),
  }).map(toStoredDate);
}

export const parseDateKey = parseStoredDate;
export const formatDateKey = formatStoredDate;
