import { addDoc, collection, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase-db';
import { isTodayOrFutureStoredDate } from '../utils/date';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

function sortSlots(slots: string[]): string[] {
  return [...slots].sort((left, right) => left.localeCompare(right));
}

function restoreSlot(slots: string[], slot: string): string[] {
  return slots.includes(slot) ? sortSlots(slots) : sortSlots([...slots, slot]);
}

function normalizeBookingError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes('permission')) {
    return new Error('Booking is currently blocked by Firestore permissions. Deploy the latest Firestore rules, then try again.');
  }

  return error instanceof Error ? error : new Error(message);
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
) {
  if (!clientEmail) {
    return;
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
  } catch (mailError) {
    console.warn('[bookingService] Mail queue failed:', mailError);
  }
}

async function createAppointmentBooking(
  payload: BookingPayload
): Promise<{ success: boolean; appointmentId: string }> {
  const availabilityRef = doc(db, 'availability', payload.date);
  const appointmentRef = doc(collection(db, 'appointments'));

  try {
    await runTransaction(db, async (transaction) => {
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
    });
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
): Promise<{ success: boolean; appointmentId: string }> {
  const result = await createAppointmentBooking({
    date,
    timeSlot,
    userId,
    clientName,
    clientEmail,
    serviceType,
    notes,
  });

  await queueBookingMail(
    clientEmail,
    'Consultation Booked - Aadhila M. Biswas',
    `<p>Hi ${clientName},</p><p>Your <strong>${serviceType}</strong> consultation is confirmed for <strong>${date}</strong> at <strong>${timeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${clientName},\n\nYour ${serviceType} consultation is confirmed for ${date} at ${timeSlot}.\n\nThank you!`
  );

  return result;
}

export async function bookConsultationAsAdmin(payload: BookingPayload) {
  const result = await createAppointmentBooking(payload);

  await queueBookingMail(
    payload.clientEmail,
    'Consultation Scheduled - Aadhila M. Biswas',
    `<p>Hi ${payload.clientName},</p><p>Your <strong>${payload.serviceType}</strong> consultation is confirmed for <strong>${payload.date}</strong> at <strong>${payload.timeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${payload.clientName},\n\nYour ${payload.serviceType} consultation is confirmed for ${payload.date} at ${payload.timeSlot}.\n\nThank you!`
  );

  return result;
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
): Promise<{ success: boolean }> {
  const oldAvailabilityRef = doc(db, 'availability', oldDate);
  const newAvailabilityRef = doc(db, 'availability', newDate);
  const appointmentRef = doc(db, 'appointments', appointmentId);

  try {
    await runTransaction(db, async (transaction) => {
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
    });
  } catch (error) {
    throw normalizeBookingError(error);
  }

  await queueBookingMail(
    clientEmail,
    'Consultation Rescheduled - Aadhila M. Biswas',
    `<p>Hi ${clientName},</p><p>Your <strong>${serviceType}</strong> consultation has been rescheduled to <strong>${newDate}</strong> at <strong>${newTimeSlot}</strong>.</p><p>Thank you!</p>`,
    `Hi ${clientName},\n\nYour ${serviceType} consultation has been rescheduled to ${newDate} at ${newTimeSlot}.\n\nThank you!`
  );

  return { success: true };
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
): Promise<{ success: boolean }> {
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
    await runTransaction(db, async (transaction) => {
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
    });
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
