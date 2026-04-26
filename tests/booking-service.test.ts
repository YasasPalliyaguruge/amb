import { describe, expect, it } from 'vitest';
import {
  isRetryableBookingError,
  normalizeBookingError,
} from '../src/services/bookingService';

describe('booking service resilience helpers', () => {
  it('treats transient firestore failures as retryable', () => {
    expect(isRetryableBookingError({ code: 'firestore/unavailable' })).toBe(true);
    expect(isRetryableBookingError({ code: 'aborted' })).toBe(true);
    expect(isRetryableBookingError(new Error('Network request failed while saving booking'))).toBe(true);
  });

  it('does not retry booking conflicts or permission issues forever', () => {
    expect(isRetryableBookingError(new Error('This time slot is no longer available. Please pick another.'))).toBe(false);
    expect(isRetryableBookingError({ code: 'firestore/permission-denied' })).toBe(false);
  });

  it('normalizes permission errors into calm recovery guidance', () => {
    expect(normalizeBookingError({ code: 'firestore/permission-denied' }).message).toContain('permissions are being updated');
  });

  it('normalizes transient network errors into connection guidance', () => {
    expect(normalizeBookingError({ code: 'firestore/unavailable' }).message).toContain('could not reach the booking system');
  });

  it('preserves slot conflict messages so people can act on them', () => {
    const message = 'This time slot is no longer available. Please pick another.';
    expect(normalizeBookingError(new Error(message)).message).toBe(message);
  });
});
