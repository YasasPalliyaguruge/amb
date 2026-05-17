import { addDoc, collection, doc, runTransaction } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';
import { db } from '../firebase-db';
import { BOOTSTRAP_ADMIN_EMAIL } from '../config/admin';
import { isTodayOrFutureStoredDate } from '../utils/date';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type BookingNotificationState = 'queued' | 'failed' | 'skipped';

type SessionMode = 'in_person' | 'online';

interface OnlineSessionPayload {
  provider: 'zoom' | 'teams' | 'google_meet' | 'jitsi' | 'other';
  url: string;
  visibleToClient: boolean;
  notes: string;
}

const TRANSIENT_BOOKING_ERROR_CODES = new Set([
  'aborted',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'unavailable',
]);

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
        !isBrowserOnline()
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
  sessionMode?: SessionMode;
  onlineSession?: OnlineSessionPayload | null;
}

interface AppointmentEmailDetails {
  clientName: string;
  clientEmail?: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  sessionMode?: SessionMode;
  onlineSession?: OnlineSessionPayload | null;
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

async function queueAdminMail(subject: string, html: string, text: string): Promise<void> {
  try {
    await queueBookingMail(BOOTSTRAP_ADMIN_EMAIL, subject, html, text);
  } catch (mailError) {
    console.warn('[bookingService] Admin mail queue failed:', mailError);
  }
}

function formatSessionMode(mode: SessionMode | undefined) {
  return mode === 'online' ? 'Online' : 'In person';
}

function getMeetingProviderLabel(provider: OnlineSessionPayload['provider']) {
  switch (provider) {
    case 'zoom':
      return 'Zoom';
    case 'teams':
      return 'Microsoft Teams';
    case 'google_meet':
      return 'Google Meet';
    case 'jitsi':
      return 'Jitsi';
    default:
      return 'Online meeting';
  }
}

function getClientSessionLine(details: AppointmentEmailDetails) {
  if (details.sessionMode !== 'online') {
    return 'Session: In person';
  }

  if (details.onlineSession?.visibleToClient && details.onlineSession.url) {
    return `Session: ${getMeetingProviderLabel(details.onlineSession.provider)} - ${details.onlineSession.url}`;
  }

  return 'Session: Online - meeting link will be shared in your client dashboard once confirmed.';
}

function getClientSessionHtml(details: AppointmentEmailDetails) {
  if (details.sessionMode !== 'online') {
    return '<p><strong>Session:</strong> In person</p>';
  }

  if (details.onlineSession?.visibleToClient && details.onlineSession.url) {
    const providerLabel = escapeHtml(getMeetingProviderLabel(details.onlineSession.provider));
    const safeUrl = escapeHtml(details.onlineSession.url);
    const notes = details.onlineSession.notes
      ? `<p><strong>Join notes:</strong> ${escapeHtml(details.onlineSession.notes)}</p>`
      : '';

    return `<p><strong>Session:</strong> ${providerLabel}</p><p><a href="${safeUrl}">Join session</a></p>${notes}`;
  }

  return '<p><strong>Session:</strong> Online</p><p>The meeting link will be shared in your client dashboard once confirmed.</p>';
}

function buildClientEmail(
  title: string,
  intro: string,
  details: AppointmentEmailDetails
) {
  const safeClientName = escapeHtml(details.clientName);
  const safeServiceType = escapeHtml(details.serviceType);
  const safeDate = escapeHtml(details.date);
  const safeTime = escapeHtml(details.timeSlot);
  const sessionText = getClientSessionLine(details);

  return {
    html: [
      `<p>Hi ${safeClientName},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p><strong>Service:</strong> ${safeServiceType}</p>`,
      `<p><strong>Date:</strong> ${safeDate}</p>`,
      `<p><strong>Time:</strong> ${safeTime}</p>`,
      getClientSessionHtml(details),
      '<p>You can review this appointment in your client dashboard.</p>',
      '<p>Thank you,<br/>Aadhila M. Biswas</p>',
    ].join(''),
    text: [
      `Hi ${details.clientName},`,
      '',
      intro,
      '',
      `Service: ${details.serviceType}`,
      `Date: ${details.date}`,
      `Time: ${details.timeSlot}`,
      sessionText,
      '',
      'You can review this appointment in your client dashboard.',
      '',
      'Thank you,',
      'Aadhila M. Biswas',
    ].join('\n'),
    subject: title,
  };
}

function buildAdminEmail(title: string, action: string, details: AppointmentEmailDetails) {
  const sessionLine = details.sessionMode === 'online'
    ? `Online${details.onlineSession?.url ? ` - ${details.onlineSession.url}` : ' - link pending'}`
    : 'In person';

  return {
    subject: title,
    html: [
      `<p><strong>${escapeHtml(action)}</strong></p>`,
      `<p><strong>Client:</strong> ${escapeHtml(details.clientName)}</p>`,
      `<p><strong>Email:</strong> ${escapeHtml(details.clientEmail || 'No email')}</p>`,
      `<p><strong>Service:</strong> ${escapeHtml(details.serviceType)}</p>`,
      `<p><strong>Date:</strong> ${escapeHtml(details.date)}</p>`,
      `<p><strong>Time:</strong> ${escapeHtml(details.timeSlot)}</p>`,
      `<p><strong>Session:</strong> ${escapeHtml(sessionLine)}</p>`,
    ].join(''),
    text: [
      action,
      '',
      `Client: ${details.clientName}`,
      `Email: ${details.clientEmail || 'No email'}`,
      `Service: ${details.serviceType}`,
      `Date: ${details.date}`,
      `Time: ${details.timeSlot}`,
      `Session: ${sessionLine}`,
    ].join('\n'),
  };
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
          clientEmail: payload.clientEmail,
          date: payload.date,
          timeSlot: payload.timeSlot,
          serviceType: payload.serviceType,
          status: 'scheduled',
          notes: payload.notes || '',
          sessionMode: payload.sessionMode || 'in_person',
          onlineSession: payload.sessionMode === 'online' ? payload.onlineSession || null : null,
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
  notes: string = '',
  sessionMode: BookingPayload['sessionMode'] = 'in_person'
): Promise<{ success: boolean; appointmentId: string; notificationState: BookingNotificationState }> {
  const onlineSession = sessionMode === 'online'
    ? {
        provider: 'other' as const,
        url: '',
        visibleToClient: false,
        notes: '',
      }
    : null;
  const result = await createAppointmentBooking({
    date,
    timeSlot,
    userId,
    clientName,
    clientEmail,
    serviceType,
    notes,
    sessionMode,
    onlineSession,
  });

  const appointmentDetails = {
    clientName,
    clientEmail,
    date,
    timeSlot,
    serviceType,
    sessionMode,
    onlineSession,
  };
  const clientMail = buildClientEmail(
    'Consultation Booked - Aadhila M. Biswas',
    'Your consultation has been booked.',
    appointmentDetails
  );
  const notificationState = await queueBookingMail(
    clientEmail,
    clientMail.subject,
    clientMail.html,
    clientMail.text
  );
  const adminMail = buildAdminEmail(
    'New Consultation Booking - Aadhila M. Biswas',
    'New booking received',
    appointmentDetails
  );
  void queueAdminMail(adminMail.subject, adminMail.html, adminMail.text);

  return { ...result, notificationState };
}

export async function bookConsultationAsAdmin(payload: BookingPayload) {
  const result = await createAppointmentBooking(payload);
  const appointmentDetails = {
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    date: payload.date,
    timeSlot: payload.timeSlot,
    serviceType: payload.serviceType,
    sessionMode: payload.sessionMode,
    onlineSession: payload.onlineSession,
  };
  const clientMail = buildClientEmail(
    'Consultation Scheduled - Aadhila M. Biswas',
    'Your consultation has been scheduled.',
    appointmentDetails
  );

  const notificationState = await queueBookingMail(
    payload.clientEmail,
    clientMail.subject,
    clientMail.html,
    clientMail.text
  );
  const adminMail = buildAdminEmail(
    'Admin Scheduled Consultation - Aadhila M. Biswas',
    'Admin booking created',
    appointmentDetails
  );
  void queueAdminMail(adminMail.subject, adminMail.html, adminMail.text);

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
  let sessionMode: SessionMode | undefined;
  let onlineSession: OnlineSessionPayload | null | undefined;

  try {
    await runBookingTransactionWithRecovery(() =>
      runTransaction(db, async (transaction) => {
        const appointmentDoc = await transaction.get(appointmentRef);

        if (!appointmentDoc.exists()) {
          throw new Error('Appointment not found.');
        }

        const appointment = appointmentDoc.data();
        sessionMode = appointment.sessionMode || 'in_person';
        onlineSession = appointment.onlineSession || null;
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

  const appointmentDetails = {
    clientName,
    clientEmail,
    date: newDate,
    timeSlot: newTimeSlot,
    serviceType,
    sessionMode,
    onlineSession,
  };
  const clientMail = buildClientEmail(
    'Consultation Rescheduled - Aadhila M. Biswas',
    'Your consultation has been rescheduled.',
    appointmentDetails
  );
  const notificationState = await queueBookingMail(
    clientEmail,
    clientMail.subject,
    clientMail.html,
    clientMail.text
  );
  const adminMail = buildAdminEmail(
    'Consultation Rescheduled - Aadhila M. Biswas',
    isAdmin ? 'Admin rescheduled consultation' : 'Client rescheduled consultation',
    appointmentDetails
  );
  void queueAdminMail(adminMail.subject, adminMail.html, adminMail.text);

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
  isAdmin: boolean = false,
  notificationOverride?: Partial<AppointmentEmailDetails>
): Promise<{ success: boolean; notificationState?: BookingNotificationState }> {
  const appointmentRef = doc(db, 'appointments', appointmentId);
  let statusChanged = false;
  let notificationDetails: AppointmentEmailDetails | null = null;

  try {
    await runBookingTransactionWithRecovery(() =>
      runTransaction(db, async (transaction) => {
        const appointmentDoc = await transaction.get(appointmentRef);

        if (!appointmentDoc.exists()) {
          throw new Error('Appointment not found.');
        }

        const appointment = appointmentDoc.data() as {
          clientId: string;
          clientName?: string;
          clientEmail?: string;
          date: string;
          timeSlot: string;
          serviceType?: string;
          status: AppointmentStatus;
          sessionMode?: SessionMode;
          onlineSession?: OnlineSessionPayload | null;
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
        statusChanged = true;
        notificationDetails = {
          clientName: notificationOverride?.clientName || appointment.clientName || 'Client',
          clientEmail: notificationOverride?.clientEmail || appointment.clientEmail || '',
          date: notificationOverride?.date || appointment.date,
          timeSlot: notificationOverride?.timeSlot || appointment.timeSlot,
          serviceType: notificationOverride?.serviceType || appointment.serviceType || 'Consultation',
          sessionMode: notificationOverride?.sessionMode || appointment.sessionMode || 'in_person',
          onlineSession: notificationOverride?.onlineSession || appointment.onlineSession || null,
        };
      })
    );
  } catch (error) {
    throw normalizeBookingError(error);
  }

  if (statusChanged && nextStatus === 'cancelled' && notificationDetails) {
    const clientMail = buildClientEmail(
      'Consultation Cancelled - Aadhila M. Biswas',
      'Your consultation has been cancelled.',
      notificationDetails
    );
    const notificationState = await queueBookingMail(
      notificationDetails.clientEmail || '',
      clientMail.subject,
      clientMail.html,
      clientMail.text
    );
    const adminMail = buildAdminEmail(
      'Consultation Cancelled - Aadhila M. Biswas',
      isAdmin ? 'Admin cancelled consultation' : 'Client cancelled consultation',
      notificationDetails
    );
    void queueAdminMail(adminMail.subject, adminMail.html, adminMail.text);

    return { success: true, notificationState };
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
