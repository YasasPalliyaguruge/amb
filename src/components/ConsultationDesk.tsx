import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Calendar from 'react-calendar';
import { format, isBefore, isToday, parse } from 'date-fns';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Video, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase-db';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { fetchAvailabilityRange } from '../services/availabilityService';
import { bookConsultation } from '../services/bookingService';
import { getStoredMonthBounds, parseStoredDate, toStoredDate } from '../utils/date';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getSiteIcon } from '../utils/siteIcons';
import 'react-calendar/dist/Calendar.css';

interface ConsultationDeskProps {
  onLoginClick: () => void;
}

type Step = 'select' | 'confirm' | 'success';
type NotificationState = 'queued' | 'failed' | 'skipped';

function formatSlot(slot: string): string {
  try {
    return format(parse(slot, 'HH:mm', new Date()), 'h:mm a');
  } catch {
    return slot;
  }
}

export default function ConsultationDesk({ onLoginClick }: ConsultationDeskProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, string[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [sessionMode, setSessionMode] = useState<'in_person' | 'online'>('in_person');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [notificationState, setNotificationState] = useState<NotificationState>('skipped');
  const [settings, setSettings] = useState<{ daysOff: number[] }>({ daysOff: [0, 6] });
  const [shouldResumeAfterAuth, setShouldResumeAfterAuth] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement>(null);

  const { user, profile } = useAuth();
  const { siteSettings } = useSiteSettings();
  const serviceTypes = siteSettings.consultationDesk.serviceTypes;
  const clientDisplayName = profile?.name || user?.displayName || siteSettings.branding.userFallbackLabel;
  const clientEmail = profile?.email || user?.email || '';

  useEffect(() => {
    if (!serviceType && serviceTypes[0]) {
      setServiceType(serviceTypes[0].value);
    }
  }, [serviceType, serviceTypes]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as { daysOff: number[] });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const { startDate, endDate } = getStoredMonthBounds(visibleMonth);
    setSlotsLoading(true);
    setAvailabilityNotice('');

    let isActive = true;

    const loadAvailability = async () => {
      try {
        const availability = await fetchAvailabilityRange(startDate, endDate);

        if (!isActive) return;
        setAvailabilityByDate(availability);
      } catch (snapshotError) {
        console.error('Failed to load monthly availability:', snapshotError);

        if (!isActive) return;
        setAvailabilityByDate({});
        setAvailabilityNotice(siteSettings.consultationDesk.availabilityLoadError);
      } finally {
        if (isActive) {
          setSlotsLoading(false);
        }
      }
    };

    void loadAvailability();

    return () => {
      isActive = false;
    };
  }, [siteSettings.consultationDesk.availabilityLoadError, visibleMonth]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  useEffect(() => {
    if (user && shouldResumeAfterAuth && selectedSlot) {
      setStep('confirm');
      setShouldResumeAfterAuth(false);
    }
  }, [selectedSlot, shouldResumeAfterAuth, user]);

  const selectedDateKey = toStoredDate(selectedDate);
  const availableSlots = availabilityByDate[selectedDateKey] || [];
  const availableDateKeys = Object.keys(availabilityByDate).sort();
  const nextAvailableDateKey =
    availableDateKeys.find((dateKey) => dateKey >= selectedDateKey) || availableDateKeys[0] || null;

  const handleSlotClick = useCallback(
    (slot: string) => {
      if (!user) {
        setSelectedSlot(slot);
        setShouldResumeAfterAuth(true);
        toast(siteSettings.consultationDesk.signInRequiredToast, { icon: 'i' });
        onLoginClick();
        return;
      }

      setSelectedSlot(slot);
      setStep('confirm');
    },
    [onLoginClick, siteSettings.consultationDesk.signInRequiredToast, user]
  );

  const handleConfirmBooking = async () => {
    if (!user || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      const result = await bookConsultation(
        selectedDateKey,
        selectedSlot,
        user.uid,
        clientDisplayName,
        clientEmail,
        serviceType || serviceTypes[0]?.value || 'Consultation',
        notes,
        sessionMode
      );
      setNotificationState(result.notificationState);
      setStep('success');
      setNotes('');
    } catch (bookingError: any) {
      toast.error(bookingError.message || 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (step === 'success') {
      setSelectedSlot(null);
      setNotificationState('skipped');
      setSessionMode('in_person');
    }
    setStep('select');
  };

  const selectedService = serviceTypes.find((service) => service.value === serviceType) || serviceTypes[0];
  const isModalOpen = step === 'confirm' || step === 'success';
  const visibleMonthLabel = format(visibleMonth, 'MMMM yyyy');

  useModalFocusTrap({
    isOpen: isModalOpen,
    modalRef,
    initialFocusRef: modalCloseButtonRef,
    onEscape: handleCloseModal,
  });

  return (
    <section className="booking-section relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="editorial-divider absolute inset-x-0 top-0 h-px" />
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(106,157,144,0.12),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-9rem] bottom-16 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(184,95,61,0.14),transparent_72%)] blur-3xl" />

      <div id="consultation-desk" className="booking-shell mx-auto max-w-7xl space-y-8">
        <div className="booking-intro-grid grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-end">
          <div className="space-y-5">
            <span className="editorial-eyebrow">{siteSettings.consultationDesk.eyebrow}</span>
            <div className="space-y-4">
              <h2 className="max-w-4xl font-heading text-[clamp(2.6rem,4.9vw,4.6rem)] font-semibold leading-[0.98] text-brand-text">
                {siteSettings.consultationDesk.headline}
              </h2>
              <p className="max-w-2xl text-base leading-8 text-brand-text/72">
                {siteSettings.consultationDesk.description}
              </p>
            </div>
          </div>

          <div className="booking-proof-strip editorial-segmented md:grid-cols-3">
            {siteSettings.consultationDesk.proofItems.map((item) => {
              const Icon = getSiteIcon(item.icon);

              return (
              <div key={item.label}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--theme-primary-rgb)/0.12)] text-[rgb(var(--theme-primary-rgb))]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-[rgb(var(--theme-text-rgb))]">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">{item.detail}</p>
              </div>
            )})}
          </div>
        </div>

        <div className="booking-panel theme-panel overflow-hidden">
          <div className="consultation-desk-grid">
            <aside className="booking-rail theme-panel-dark consultation-desk-panel consultation-desk-panel--dark relative overflow-hidden rounded-none border-0 px-6 py-8 sm:px-8 lg:px-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(106,157,144,0.18),transparent_32%)]" />
              <div className="booking-rail__inner relative space-y-4">
                <div className="booking-rail__copy space-y-3">
                  <span className="booking-rail__eyebrow inline-flex items-center rounded-full border px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em]">
                    {siteSettings.consultationDesk.railEyebrow}
                  </span>
                  <h3 className="booking-rail__headline max-w-lg font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                    {siteSettings.consultationDesk.railHeadline}
                  </h3>
                  <p className="booking-rail__description max-w-xl text-xs leading-6">
                    {siteSettings.consultationDesk.railDescription}
                  </p>
                </div>

                <div className="booking-rail__stats editorial-segmented sm:grid-cols-2">
                  <div>
                    <p className="booking-rail__stats-label text-[0.62rem] font-semibold uppercase tracking-[0.2em]">{siteSettings.consultationDesk.currentMonthLabel}</p>
                    <p className="booking-rail__stats-value mt-2 font-heading text-2xl">{visibleMonthLabel}</p>
                    <p className="booking-rail__stats-meta mt-1.5 text-xs">
                      {availableDateKeys.length}{' '}
                      {availableDateKeys.length === 1
                        ? siteSettings.consultationDesk.publishedDateSingularLabel
                        : siteSettings.consultationDesk.publishedDatePluralLabel}
                    </p>
                  </div>

                  <div>
                    <p className="booking-rail__stats-label text-[0.62rem] font-semibold uppercase tracking-[0.2em]">{siteSettings.consultationDesk.selectedDayLabel}</p>
                    <p className="booking-rail__stats-value mt-2 font-heading text-2xl">{format(selectedDate, 'd')}</p>
                    <p className="booking-rail__stats-meta mt-1.5 text-xs">{format(selectedDate, 'EEEE, MMMM yyyy')}</p>
                  </div>
                </div>

                <div className="booking-rail__next rounded-[1.8rem] border p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="booking-rail__stats-label text-[0.62rem] font-semibold uppercase tracking-[0.2em]">{siteSettings.consultationDesk.nextOpeningLabel}</p>
                    <span className="booking-rail__badge rounded-full border px-2.5 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em]">
                      {siteSettings.consultationDesk.liveDeskLabel}
                    </span>
                  </div>
                  <p className="booking-rail__next-value mt-3 font-heading text-2xl">
                    {nextAvailableDateKey ? format(parseStoredDate(nextAvailableDateKey), 'MMM d') : siteSettings.consultationDesk.nextOpeningPendingLabel}
                  </p>
                  <p className="booking-rail__next-copy mt-1.5 text-xs leading-5">
                    {nextAvailableDateKey
                      ? `${format(parseStoredDate(nextAvailableDateKey), 'EEEE, MMMM d')} ${siteSettings.consultationDesk.nearestPublishedSuffix}`
                      : siteSettings.consultationDesk.noFutureDatesText}
                  </p>
                </div>

                <div className="booking-service-list space-y-2">
                  {serviceTypes.map((service, index) => (
                    <div
                      key={service.value}
                      className={`booking-service-card flex items-start justify-between gap-4 rounded-[1.2rem] border px-4 py-3 ${
                        index === 0 ? 'booking-service-card--emphasis' : 'booking-service-card--subtle'
                      }`}
                    >
                      <div>
                        <p className="booking-service-card__title text-sm font-semibold">{service.label}</p>
                        <p className="booking-service-card__desc mt-1 text-xs leading-5">{service.desc}</p>
                      </div>
                      <span className="booking-service-card__badge shrink-0 rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.18em]">
                        {service.icon}
                      </span>
                    </div>
                  ))}
                </div>

                {!user && (
                  <div className="booking-rail__signin rounded-[1.8rem] border px-5 py-4 text-xs leading-5">
                    {siteSettings.consultationDesk.signInPrompt}
                    <button
                      onClick={onLoginClick}
                      className="booking-rail__signin-link ml-2 font-semibold"
                    >
                      {siteSettings.consultationDesk.signInCtaLabel}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            <div className="booking-calendar-panel consultation-desk-panel border-y border-[rgb(var(--theme-line-rgb)/0.2)] px-6 py-7 sm:px-8 xl:border-x xl:border-y-0 xl:px-10 xl:py-10">
              <div className="booking-panel-body consultation-desk-panel__body space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--theme-primary-rgb)/0.12)] text-brand-primary">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-[clamp(1.9rem,3vw,2.5rem)] font-semibold text-brand-text">{siteSettings.consultationDesk.datePanelTitle}</h3>
                    <p className="text-sm text-brand-text/55">{siteSettings.consultationDesk.datePanelDescription}</p>
                  </div>
                </div>
                <Calendar
                  className="consultation-calendar"
                  onChange={(value) => setSelectedDate(value as Date)}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) {
                      setVisibleMonth(activeStartDate);
                    }
                  }}
                  value={selectedDate}
                  minDate={new Date()}
                  tileDisabled={({ date }) =>
                    settings.daysOff.includes(date.getDay()) ||
                    (isBefore(date, new Date()) && !isToday(date))
                  }
                  tileClassName={({ date, view }) => {
                    if (view !== 'month') {
                      return null;
                    }

                    const classes = [];
                    if (isToday(date)) {
                      classes.push('font-bold');
                    }
                    if ((availabilityByDate[toStoredDate(date)] || []).length > 0) {
                      classes.push('availability-calendar__tile--available');
                    }

                    return classes.join(' ') || null;
                  }}
                  tileContent={({ date, view }) =>
                    view === 'month' && (availabilityByDate[toStoredDate(date)] || []).length > 0 ? (
                      <span className="availability-calendar__dot" aria-hidden="true" />
                    ) : null
                  }
                />

                <div className="booking-month-summary editorial-segmented md:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text/55">
                      {siteSettings.consultationDesk.openInMonthLabelPrefix} {visibleMonthLabel}
                    </p>
                    {slotsLoading ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-brand-text/58">{siteSettings.consultationDesk.loadingAvailabilityText}</p>
                        <div className="h-4 w-40 animate-pulse rounded-full bg-brand-secondary/18" />
                        <div className="h-4 w-52 animate-pulse rounded-full bg-brand-secondary/18" />
                      </div>
                    ) : availabilityNotice ? (
                      <p className="mt-3 text-sm text-brand-text/58">{availabilityNotice}</p>
                    ) : availableDateKeys.length > 0 ? (
                      <div className="mt-3 space-y-2 text-sm text-brand-text/62">
                        <p>{siteSettings.consultationDesk.availabilityHint}</p>
                        <p>
                          {siteSettings.consultationDesk.nextOpenDateLabel}:{' '}
                          <span className="font-semibold text-brand-text">
                            {nextAvailableDateKey ? format(parseStoredDate(nextAvailableDateKey), 'EEEE, MMM d') : siteSettings.consultationDesk.noFutureDatesText}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-brand-text/58">
                        {siteSettings.consultationDesk.noMonthAvailabilityText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-start md:justify-end">
                    <span className="editorial-chip">
                      {availableDateKeys.length} date{availableDateKeys.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="booking-slots-panel consultation-desk-panel px-6 py-7 sm:px-8 xl:px-10 xl:py-10">
              <div className="booking-panel-body consultation-desk-panel__body space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--theme-accent-rgb)/0.14)] text-brand-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                      <h3 className="font-heading text-[clamp(1.9rem,3vw,2.5rem)] font-semibold text-brand-text">{format(selectedDate, 'MMMM d, yyyy')}</h3>
                    <p className="text-sm text-brand-text/55">{siteSettings.consultationDesk.slotsPanelDescription}</p>
                  </div>
                </div>

                {slotsLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-14 animate-pulse rounded-[1.4rem] bg-brand-secondary/18"
                        style={{ animationDelay: `${index * 0.08}s` }}
                      />
                    ))}
                  </div>
                ) : availableSlots.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-brand-text/52">
                        {availableSlots.length}{' '}
                        {availableSlots.length === 1
                          ? siteSettings.consultationDesk.slotSingularLabel
                          : siteSettings.consultationDesk.slotPluralLabel}{' '}
                        {siteSettings.consultationDesk.slotsAvailableSuffix}
                      </p>
                        <span className="editorial-chip">{selectedSlot ? formatSlot(selectedSlot) : siteSettings.consultationDesk.chooseTimeLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSlotClick(slot)}
                          className={`rounded-[1.35rem] px-4 py-3.5 text-sm font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-brand-primary text-white shadow-[0_16px_34px_rgba(184,95,61,0.25)]'
                              : 'border border-[rgb(var(--theme-line-rgb)/0.35)] bg-[rgb(var(--theme-surface-rgb)/0.62)] text-[rgb(var(--theme-text-rgb))] hover:border-[rgb(var(--theme-primary-rgb)/0.35)] hover:bg-[rgb(var(--theme-primary-rgb)/0.08)]'
                          }`}
                        >
                          {formatSlot(slot)}
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="booking-empty-state space-y-4 rounded-[1.7rem] border border-dashed border-brand-secondary/40 bg-brand-bg/55 px-5 py-6">
                    <div className="text-center">
                      <p className="font-medium text-brand-text/68">
                        {availabilityNotice
                          ? siteSettings.consultationDesk.availabilityErrorTitle
                          : settings.daysOff.includes(selectedDate.getDay())
                          ? siteSettings.consultationDesk.dayOffTitle
                          : siteSettings.consultationDesk.noSlotsTitle}
                      </p>
                      <p className="mt-2 text-sm text-brand-text/52">
                        {availabilityNotice || siteSettings.consultationDesk.emptyStateHint}
                      </p>
                    </div>

                    {!availabilityNotice &&
                      !settings.daysOff.includes(selectedDate.getDay()) &&
                      nextAvailableDateKey &&
                      nextAvailableDateKey !== selectedDateKey && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(parseStoredDate(nextAvailableDateKey))}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-primary/25 bg-white px-4 py-3 text-sm font-semibold text-brand-primary transition hover:-translate-y-0.5 hover:border-brand-primary/40"
                        >
                          {siteSettings.consultationDesk.jumpNextDateLabel}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                  </div>
                )}

                <div className="booking-location-card rounded-[calc(var(--theme-radius-lg)-0.1rem)] border border-[rgb(var(--theme-accent-rgb)/0.18)] bg-[linear-gradient(180deg,rgb(var(--theme-accent-rgb)/0.12),rgb(var(--theme-surface-rgb)/0.72))] px-5 py-5 text-sm text-[rgb(var(--theme-muted-rgb))]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[rgb(var(--theme-text-rgb))]">{siteSettings.branding.clinicLabel}</p>
                      <p className="mt-1">{siteSettings.consultationDesk.locationDescription}</p>
                    </div>
                    <span className="editorial-chip">{siteSettings.consultationDesk.liveDeskLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              key="consultation-desk-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-brand-text/25 backdrop-blur-sm"
              onClick={step === 'success' ? handleCloseModal : () => setStep('select')}
            />

            <motion.div
              key="consultation-desk-modal"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4"
            >
              <div
                ref={modalRef}
                className="theme-panel relative max-h-[88vh] overflow-y-auto bg-[rgb(var(--theme-surface-strong-rgb)/0.96)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consultation-desk-title"
                tabIndex={-1}
              >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#b85f3d,#d7c4ae,#6a9d90)]" />
                <button
                  ref={modalCloseButtonRef}
                  onClick={handleCloseModal}
                  className="absolute right-5 top-5 rounded-full p-1.5 text-brand-text/40 transition hover:bg-brand-secondary/25 hover:text-brand-text"
                  aria-label={siteSettings.consultationDesk.modalCloseAriaLabel}
                >
                  <X className="h-5 w-5" />
                </button>

                {step === 'confirm' && (
                  <div className="space-y-6 p-8 pt-9">
                    <div>
                      <h3 id="consultation-desk-title" className="font-heading text-2xl font-bold text-brand-text">{siteSettings.consultationDesk.modalConfirmTitle}</h3>
                      <p className="mt-1 text-sm text-brand-text/52">{siteSettings.consultationDesk.modalConfirmDescription}</p>
                    </div>

                    <div className="space-y-3 rounded-[1.5rem] bg-brand-bg/62 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-text/58">{siteSettings.consultationDesk.modalDateLabel}</span>
                        <span className="font-semibold text-brand-text">{format(selectedDate, 'MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-text/58">{siteSettings.consultationDesk.modalTimeLabel}</span>
                        <span className="font-semibold text-brand-text">{selectedSlot ? formatSlot(selectedSlot) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-text/58">{siteSettings.consultationDesk.modalPatientLabel}</span>
                        <span className="truncate text-right font-semibold text-brand-text">
                          {clientDisplayName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-brand-text/58">Session</span>
                        <span className="font-semibold text-brand-text">{sessionMode === 'online' ? 'Online' : 'In person'}</span>
                      </div>
                    </div>

                    <div className="space-y-3" role="group" aria-labelledby="booking-service-type-label">
                      <p id="booking-service-type-label" className="text-sm font-semibold text-brand-text/82">{siteSettings.consultationDesk.modalServiceTypeLabel}</p>
                      <div className="grid gap-2">
                        {serviceTypes.map((service) => (
                          <button
                            key={service.value}
                            type="button"
                            onClick={() => setServiceType(service.value)}
                            className={`rounded-[1.4rem] border p-4 text-left transition ${
                              serviceType === service.value
                                ? 'border-brand-primary/45 bg-brand-primary/8 shadow-[0_14px_32px_rgba(184,95,61,0.08)]'
                                : 'border-brand-secondary/30 bg-white hover:border-brand-primary/28 hover:bg-brand-bg/55'
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-3">
                              <span className="inline-flex rounded-full bg-brand-secondary/22 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text/72">
                                {service.icon}
                              </span>
                              <span className={`text-sm font-semibold ${serviceType === service.value ? 'text-brand-primary' : 'text-brand-text'}`}>
                                {service.label}
                              </span>
                            </div>
                            <p className="text-xs leading-5 text-brand-text/55">{service.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3" role="group" aria-labelledby="booking-session-type-label">
                      <p id="booking-session-type-label" className="text-sm font-semibold text-brand-text/82">Session type</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setSessionMode('in_person')}
                          className={`rounded-[1.4rem] border p-4 text-left transition ${
                            sessionMode === 'in_person'
                              ? 'border-brand-primary/45 bg-brand-primary/8 shadow-[0_14px_32px_rgba(184,95,61,0.08)]'
                              : 'border-brand-secondary/30 bg-white hover:border-brand-primary/28 hover:bg-brand-bg/55'
                          }`}
                        >
                          <span className="text-sm font-semibold text-brand-text">In person</span>
                          <p className="mt-1 text-xs leading-5 text-brand-text/55">Clinic or agreed location.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionMode('online')}
                          className={`rounded-[1.4rem] border p-4 text-left transition ${
                            sessionMode === 'online'
                              ? 'border-brand-primary/45 bg-brand-primary/8 shadow-[0_14px_32px_rgba(184,95,61,0.08)]'
                              : 'border-brand-secondary/30 bg-white hover:border-brand-primary/28 hover:bg-brand-bg/55'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text">
                            <Video className="h-4 w-4" />
                            Online
                          </span>
                          <p className="mt-1 text-xs leading-5 text-brand-text/55">Meeting link added after confirmation.</p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="booking-notes" className="text-sm font-semibold text-brand-text/82">
                        {siteSettings.consultationDesk.modalNotesLabel}{' '}
                        <span className="font-normal text-brand-text/38">({siteSettings.consultationDesk.modalNotesOptionalLabel})</span>
                      </label>
                      <textarea
                        id="booking-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder={siteSettings.consultationDesk.modalNotesPlaceholder}
                        maxLength={500}
                        className="theme-textarea h-24 resize-none"
                      />
                      <p className="text-right text-xs text-brand-text/35">{notes.length}/500</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => setStep('select')}
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-brand-secondary/40 bg-white px-5 py-3 text-sm font-medium text-brand-text transition hover:bg-brand-bg/55"
                      >
                        {siteSettings.consultationDesk.modalBackLabel}
                      </button>
                      <button
                        onClick={handleConfirmBooking}
                        disabled={isSubmitting}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(184,95,61,0.28)] transition hover:-translate-y-0.5 hover:bg-brand-primary/92 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? siteSettings.consultationDesk.modalConfirmingLabel : siteSettings.consultationDesk.modalConfirmButtonLabel}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'success' && (
                  <div className="space-y-6 p-10 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent/18">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>

                    <div className="space-y-2">
                      <h3 id="consultation-desk-title" className="font-heading text-2xl font-bold text-brand-text">{siteSettings.consultationDesk.modalSuccessTitle}</h3>
                      <p className="text-brand-text/58">{siteSettings.consultationDesk.modalSuccessDescription}</p>
                    </div>

                    <div className="space-y-3 rounded-[1.5rem] bg-brand-bg/62 p-4 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text/58">{siteSettings.consultationDesk.modalDateTimeLabel}</span>
                        <span className="font-semibold text-brand-text">
                          {format(selectedDate, 'MMM d, yyyy')} at {selectedSlot ? formatSlot(selectedSlot) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text/58">{siteSettings.consultationDesk.modalServiceLabel}</span>
                        <span className="font-semibold text-brand-text">{selectedService?.label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text/58">Session</span>
                        <span className="font-semibold text-brand-text">{sessionMode === 'online' ? 'Online' : 'In person'}</span>
                      </div>
                    </div>

                    <p className="text-sm text-brand-text/54">
                      {notificationState === 'failed'
                        ? 'Your session is saved. Email confirmation may take a little longer, but the booking is already visible in your client dashboard.'
                        : user?.email
                        ? `${siteSettings.consultationDesk.modalEmailQueuedPrefix} ${user.email}.`
                        : siteSettings.consultationDesk.modalDashboardFallback}
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={handleCloseModal}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(184,95,61,0.28)] transition hover:-translate-y-0.5 hover:bg-brand-primary/92"
                      >
                        {siteSettings.consultationDesk.modalDoneLabel}
                      </button>
                      <Link
                        to="/client-dashboard"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-brand-secondary/40 bg-white px-5 py-3 text-sm font-medium text-brand-text transition hover:bg-brand-bg/55"
                      >
                        {siteSettings.consultationDesk.modalViewAppointmentsLabel}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
