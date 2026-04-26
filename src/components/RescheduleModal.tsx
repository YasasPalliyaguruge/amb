import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import { format, isBefore, isToday, parse } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-db';
import { rescheduleConsultation } from '../services/bookingService';
import { parseStoredDate, toStoredDate } from '../utils/date';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

function formatSlot(slot: string): string {
  try { return format(parse(slot, 'HH:mm', new Date()), 'h:mm a'); } catch { return slot; }
}

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  status: string;
  notes: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  userEmail: string;
}

export default function RescheduleModal({ isOpen, onClose, appointment, userEmail }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(parseStoredDate(appointment.date));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState('');
  const [settings, setSettings] = useState<{ daysOff: number[] }>({ daysOff: [0, 6] });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap({
    isOpen,
    modalRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;

    setSelectedDate(parseStoredDate(appointment.date));
    setSelectedSlot(null);

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as { daysOff: number[] });
      }
    });

    return () => unsubscribeSettings();
  }, [appointment.date, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const dateString = toStoredDate(selectedDate);
    setAvailabilityNotice('');
    const unsubscribe = onSnapshot(doc(db, 'availability', dateString), (doc) => {
      if (doc.exists()) {
        setAvailableSlots(doc.data().slots || []);
      } else {
        setAvailableSlots([]);
      }
    }, (err) => {
      console.error('Failed to load reschedule availability:', err);
      setAvailableSlots([]);
      setAvailabilityNotice('Availability could not be loaded right now. Please try again.');
    });

    return () => unsubscribe();
  }, [selectedDate, isOpen]);

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    try {
      const newDateString = toStoredDate(selectedDate);
      await rescheduleConsultation(
        appointment.id,
        appointment.date,
        appointment.timeSlot,
        newDateString,
        selectedSlot,
        appointment.clientId,
        appointment.clientName,
        userEmail,
        appointment.serviceType
      );
      toast.success('Consultation rescheduled successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-text/20 backdrop-blur-sm z-50"
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl z-50 p-6 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-modal-title"
            aria-describedby="reschedule-modal-description"
            tabIndex={-1}
          >
            <div className="theme-panel relative max-h-[calc(90vh-3rem)] overflow-y-auto rounded-[2rem] bg-[rgb(var(--theme-surface-strong-rgb)/0.96)] p-8 shadow-2xl">
              <button 
                ref={closeButtonRef}
                onClick={onClose}
                className="absolute top-5 right-5 rounded-full p-1.5 text-[rgb(var(--theme-text-rgb)/0.76)] transition-colors hover:bg-[rgb(var(--theme-secondary-rgb)/0.18)] hover:text-[rgb(var(--theme-text-rgb))]"
                aria-label="Close reschedule dialog"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 id="reschedule-modal-title" className="mb-2 text-2xl font-heading font-bold text-[rgb(var(--theme-text-rgb))]">Reschedule Appointment</h3>
              <p id="reschedule-modal-description" className="mb-8 text-[rgb(var(--theme-muted-rgb))]">
                Current: {format(parseStoredDate(appointment.date), 'MMM d, yyyy')} at {formatSlot(appointment.timeSlot)}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Calendar 
                    className="consultation-calendar consultation-calendar--compact"
                    onChange={(val) => {
                      setSelectedDate(val as Date);
                      setSelectedSlot(null);
                    }} 
                    value={selectedDate}
                    minDate={new Date()}
                    tileDisabled={({ date }) =>
                      settings.daysOff.includes(date.getDay()) ||
                      (isBefore(date, new Date()) && !isToday(date))
                    }
                  />
                </div>

                <div className="space-y-6">
                  <h4 className="font-heading font-semibold text-[rgb(var(--theme-text-rgb))]">
                    Available Slots for {format(selectedDate, 'MMM d')}
                  </h4>
                  
                  {availabilityNotice ? (
                    <div className="rounded-2xl bg-[rgb(var(--theme-bg-rgb)/0.62)] p-6 text-center">
                      <p className="font-medium text-[rgb(var(--theme-muted-rgb))]">{availabilityNotice}</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 rounded-xl font-medium transition-all text-sm ${
                            selectedSlot === slot 
                              ? 'bg-brand-primary text-white shadow-md' 
                              : 'bg-[rgb(var(--theme-secondary-rgb)/0.18)] text-[rgb(var(--theme-text-rgb))] hover:bg-[rgb(var(--theme-secondary-rgb)/0.32)]'
                          }`}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[rgb(var(--theme-bg-rgb)/0.62)] p-6 text-center">
                      <p className="font-medium text-[rgb(var(--theme-muted-rgb))]">No available slots.</p>
                    </div>
                  )}

                  <div className="border-t border-[rgb(var(--theme-line-rgb)/0.28)] pt-6">
                    <button 
                      onClick={handleConfirmReschedule}
                      disabled={isSubmitting || !selectedSlot || Boolean(availabilityNotice)}
                      className="w-full py-3 px-4 bg-brand-primary text-white rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
