import { addDoc, collection, doc, runTransaction } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { db } from '../firebase-db';
import { isTodayOrFutureStoredDate } from '../utils/date';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type BookingNotificationState = 'queued' | 'failed' | 'skipped';

const TRANSIENT_BOOKING_ERROR_CODES = new Set([
  'aborted',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'unavailable',
]);

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sortSlots(slots: string[]): string[] {
  return [...slots].sort((left, right) => left.localeCompare(right));
}

function restoreSlot(slots: string[], slot: string): string[] {
  return slots.includes(slot) ? sortSlots(slots) : sortSlots([...slots, slot]);
}

function getFirebaseErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const code = (error as FirebaseError).code;
  return typeof code === 'string' ? code : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isBookingConflictMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('no longer available') ||
    normalized.includes('appointment not found') ||
    normalized.includes('no availability found') ||
    normalized.includes('only scheduled appointments can be rescheduled') ||
    normalized.includes('cannot be reopened') ||
    normalized.includes('unauthorized to')
  );
}

export function isRetryableBookingError(error: unknown): boolean {
  const code = getFirebaseErrorCode(error);
  if (code) {
    return TRANSIENT_BOOKING_ERROR_CODES.has(code.replace(/^firestore\//, ''));
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to get document because the client is offline') ||
    message.includes('temporarily unavailable')
  );
}

export function normalizeBookingError(error: unknown): Error {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const code = getFirebaseErrorCode(error);

  if (isBookingConflictMessage(message)) {
    return new Error(message);
  }

  if (normalized.includes('permission') || code === 'permission-denied' || code === 'firestore/permission-denied') {
    return new Error('Booking is temporarily unavailable because the schedule permissions are being updated. Please try again in a moment.');
  }

  if (
    code === 'unavailable' ||
    code === 'firestore/unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'firestore/deadline-exceeded' ||
    normalized.includes('offline') ||
    normalized.includes('network')
  ) {
    return new Error('We could not reach the booking system just now. Please check your connection and try again.');
  }

  if (code === 'aborted' || code === 'firestore/aborted') {
    return new Error('This booking changed while we were saving it. Please choose the slot again and retry.');
  }

  return error instanceof Error
    ? new Error(message || 'Something interrupted the booking request. Please try again.')
    : new Error(message || 'Something interrupted the booking request. Please try again.');
}

async function runBookingTransactionWithRecovery<T>(
  task: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await task();
    } catch (error) {
      attempt += 1;

      if (
        !isRetryableBookingError(error) ||
        attempt >= maxAttempts ||
        !navigator.onLine
      ) {
        throw normalizeBookingError(error);
      }

      await wait(180 * attempt);
    }
  }

  throw new Error('Booking could not be completed. Please try again.');
}

interface BookingPayload {
  date: string;
  timeSlot: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  notes?: string;
}

async function queueBookingMail(
  clientEmail: string,
  subject: string,
  html: string,
  text: string
): Promise<BookingNotificationState> {
  if (!clientEmail) {
    return 'skipped';
  }

  try {
    await addDoc(collection(db, 'mail'), {
      to: clientEmail,
      message: {
        subject,
        html,
        text,
      },
    });
    return 'queued';
  } catch (mailError) {
    console.warn('[bookingService] Mail queue failed:', mailError);
    return 'failed';
  }
}

async function createAppointmentBooking(
  payload: BookingPayload
): Promise<{ success: boolean; appointmentId: string }> {
  const availabilityRef = doc(db, 'availability', payload.date);
  const appointmentRef = doc(collection(db, 'appointments'));

  try {
    await runBookingTransactionWithRecovery(() =>
      runTransaction(db, async (transaction) => {
        const availabilityDoc = await transaction.get(availabilityRef);

        if (!availabilityDoc.exists()) {
          throw new Error('No availability found for this date.');
        }

        const slots: string[] = availabilityDoc.data().slots || [];
        if (!slots.includes(payload.timeSlot)) {
          throw new Error('This time slot is no longer available. Please pick another.');
        }

        transaction.update(availabilityRef, {
          slots: slots.filter((slot) => slot !== payload.timeSlot),
        });

        transaction.set(appointmentRef, {
          clientId: payload.userId,
          clientName: payload.clientName,
          date: payload.date,
          timeSlot: payload.timeSlot,
          serviceType: payload.serviceType,
          status: 'scheduled',
          notes: payload.notes || '',
        });
      })
    );
  } catch (error) {
    throw normalizeBookingError(error);
  }

  return { success: true, appointmentId: appointmentRef.id };
}

export async function bookConsultation(
  date: string,
  timeSlot: string,
  userId: string,
  clientName: string,
  clientEmail: string,
  serviceType: string,
  notes: string = ''
): Promise<{ success: boolean; appointmentId: string; notificationState: BookingNotificationState }> {
  const result = await createAppointmentBooking({
    date,
    timeSlot,
    userId,
    clientName,
    clientEmail,
    serviceType,
    notes,
  });

  const notificationState = await queueBookingMail(
    clientEmail,
    'Consultation Booked - Aadhila M. Biswas',
    `<p>Hi ${clientName},</p><p>Your <strong>${serviceType}</strong> consultation is confirmed for <strong>${date}</strong> at <strong>${timeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${clientName},\n\nYour ${serviceType} consultation is confirmed for ${date} at ${timeSlot}.\n\nThank you!`
  );

  return { ...result, notificationState };
}

export async function bookConsultationAsAdmin(payload: BookingPayload) {
  const result = await createAppointmentBooking(payload);

  const notificationState = await queueBookingMail(
    payload.clientEmail,
    'Consultation Scheduled - Aadhila M. Biswas',
    `<p>Hi ${payload.clientName},</p><p>Your <strong>${payload.serviceType}</strong> consultation is confirmed for <strong>${payload.date}</strong> at <strong>${payload.timeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${payload.clientName},\n\nYour ${payload.serviceType} consultation is confirmed for ${payload.date} at ${payload.timeSlot}.\n\nThank you!`
  );

  return { ...result, notificationState };
}

async function rescheduleAppointmentInternal(
  appointmentId: string,
  oldDate: string,
  oldTimeSlot: string,
  newDate: string,
  newTimeSlot: string,
  actorId: string,
  clientName: string,
  clientEmail: string,
  serviceType: string,
  isAdmin: boolean
): Promise<{ success: boolean; notificationState: BookingNotificationState }> {
  const oldAvailabilityRef = doc(db, 'availability', oldDate);
  const newAvailabilityRef = doc(db, 'availability', newDate);
  const appointmentRef = doc(db, 'appointments', appointmentId);

  try {
    await runBookingTransactionWithRecovery(() =>
      runTransaction(db, async (transaction) => {
        const appointmentDoc = await transaction.get(appointmentRef);

        if (!appointmentDoc.exists()) {
          throw new Error('Appointment not found.');
        }

        const appointment = appointmentDoc.data();
        if (!isAdmin && appointment.clientId !== actorId) {
          throw new Error('Unauthorized to reschedule this appointment.');
        }

        if (appointment.status !== 'scheduled') {
          throw new Error('Only scheduled appointments can be rescheduled.');
        }

        const newAvailabilityDoc = await transaction.get(newAvailabilityRef);
        if (!newAvailabilityDoc.exists()) {
          throw new Error('No availability found for the new date.');
        }

        const newSlots: string[] = newAvailabilityDoc.data().slots || [];
        if (!newSlots.includes(newTimeSlot)) {
          throw new Error('The new time slot is no longer available.');
        }

        if (oldDate === newDate) {
          const updatedSlots = restoreSlot(
            newSlots.filter((slot) => slot !== newTimeSlot),
            oldTimeSlot
          );
          transaction.update(newAvailabilityRef, {
            slots: updatedSlots,
          });
        } else {
          const oldAvailabilityDoc = await transaction.get(oldAvailabilityRef);
          const oldSlots: string[] = oldAvailabilityDoc.exists() ? oldAvailabilityDoc.data().slots || [] : [];

          transaction.update(newAvailabilityRef, {
            slots: newSlots.filter((slot) => slot !== newTimeSlot),
          });

          const restoredOldSlots = restoreSlot(oldSlots, oldTimeSlot);
          if (oldAvailabilityDoc.exists()) {
            transaction.update(oldAvailabilityRef, { slots: restoredOldSlots });
          } else {
            transaction.set(oldAvailabilityRef, { slots: restoredOldSlots });
          }
        }

        transaction.update(appointmentRef, { date: newDate, timeSlot: newTimeSlot });
      })
    );
  } catch (error) {
    throw normalizeBookingError(error);
  }

  const notificationState = await queueBookingMail(
    clientEmail,
    'Consultation Rescheduled - Aadhila M. Biswas',
    `<p>Hi ${clientName},</p><p>Your <strong>${serviceType}</strong> consultation has been rescheduled to <strong>${newDate}</strong> at <strong>${newTimeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${clientName},\n\nYour ${serviceType} consultation has been rescheduled to ${newDate} at ${newTimeSlot}.\n\nThank you!`
  );

  return { success: true, notificationState };
}

export async function rescheduleConsultation(
  appointmentId: string,
  oldDate: string,
  oldTimeSlot: string,
  newDate: string,
  newTimeSlot: string,
  userId: string,
  clientName: string,
  clientEmail: string,
  serviceType: string
): Promise<{ success: boolean; notificationState: BookingNotificationState }> {
  return rescheduleAppointmentInternal(
    appointmentId,
    oldDate,
    oldTimeSlot,
    newDate,
    newTimeSlot,
    userId,
    clientName,
    clientEmail,
    serviceType,
    false
  );
}

export async function rescheduleConsultationAsAdmin(
  appointmentId: string,
  oldDate: string,
  oldTimeSlot: string,
  newDate: string,
  newTimeSlot: string,
  adminId: string,
  clientName: string,
  clientEmail: string,
  serviceType: string
) {
  return rescheduleAppointmentInternal(
    appointmentId,
    oldDate,
    oldTimeSlot,
    newDate,
    newTimeSlot,
    adminId,
    clientName,
    clientEmail,
    serviceType,
    true
  );
}

export async function updateAppointmentStatus(
  appointmentId: string,
  nextStatus: AppointmentStatus,
  actorId: string,
  isAdmin: boolean = false
): Promise<{ success: boolean }> {
  const appointmentRef = doc(db, 'appointments', appointmentId);

  try {
    await runBookingTransactionWithRecovery(() =>
      runTransaction(db, async (transaction) => {
        const appointmentDoc = await transaction.get(appointmentRef);

        if (!appointmentDoc.exists()) {
          throw new Error('Appointment not found.');
        }

        const appointment = appointmentDoc.data() as {
          clientId: string;
          date: string;
          timeSlot: string;
          status: AppointmentStatus;
        };

        if (!isAdmin && appointment.clientId !== actorId) {
          throw new Error('Unauthorized to update this appointment.');
        }

        if (appointment.status === nextStatus) {
          return;
        }

        if (appointment.status !== 'scheduled' && nextStatus === 'scheduled') {
          throw new Error('Cancelled or completed appointments cannot be reopened without rebooking.');
        }

        if (appointment.status === 'scheduled' && nextStatus === 'cancelled' && isTodayOrFutureStoredDate(appointment.date)) {
          const availabilityRef = doc(db, 'availability', appointment.date);
          const availabilityDoc = await transaction.get(availabilityRef);
          const currentSlots: string[] = availabilityDoc.exists() ? availabilityDoc.data().slots || [] : [];
          const updatedSlots = restoreSlot(currentSlots, appointment.timeSlot);

          if (availabilityDoc.exists()) {
            transaction.update(availabilityRef, { slots: updatedSlots });
          } else {
            transaction.set(availabilityRef, { slots: updatedSlots });
          }
        }

        transaction.update(appointmentRef, { status: nextStatus });
      })
    );
  } catch (error) {
    throw normalizeBookingError(error);
  }

  return { success: true };
}

export async function cancelConsultation(
  appointmentId: string,
  actorId: string,
  isAdmin: boolean = false
): Promise<{ success: boolean }> {
  return updateAppointmentStatus(appointmentId, 'cancelled', actorId, isAdmin);
}
