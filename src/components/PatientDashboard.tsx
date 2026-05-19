import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
  Video,
  XCircle,
} from 'lucide-react';
import { db } from '../firebase-db';
import { useAuth } from '../contexts/AuthContext';
import { updateAppointmentStatus } from '../services/bookingService';
import { isTodayOrFutureStoredDate, parseStoredDate } from '../utils/date';
import RescheduleModal from './RescheduleModal';

function formatSlot(slot: string): string {
  try {
    return format(parse(slot, 'HH:mm', new Date()), 'h:mm a');
  } catch {
    return slot;
  }
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
  sessionMode?: 'in_person' | 'online';
  onlineSession?: {
    provider: 'zoom' | 'teams' | 'google_meet' | 'jitsi' | 'other';
    url: string;
    visibleToClient: boolean;
    notes: string;
  } | null;
}

const onlineProviderLabels = {
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  google_meet: 'Google Meet',
  jitsi: 'Jitsi',
  other: 'Online',
} as const;

function canJoinOnlineSession(appointment: Appointment) {
  return Boolean(
    appointment.status === 'scheduled' &&
    appointment.sessionMode === 'online' &&
    appointment.onlineSession?.visibleToClient &&
    appointment.onlineSession.url
  );
}

function compareAppointmentsOldestFirst(left: Appointment, right: Appointment) {
  const dateComparison = left.date.localeCompare(right.date);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return left.timeSlot.localeCompare(right.timeSlot);
}

function compareAppointmentsNewestFirst(left: Appointment, right: Appointment) {
  return compareAppointmentsOldestFirst(right, left);
}

function getStatusStyles(status: string) {
  switch (status) {
    case 'scheduled':
      return 'border-emerald-500/18 bg-emerald-50 text-emerald-700';
    case 'completed':
      return 'border-[rgb(var(--theme-secondary-rgb)/0.2)] bg-[rgb(var(--theme-secondary-rgb)/0.18)] text-[rgb(var(--theme-text-rgb)/0.9)]';
    case 'cancelled':
      return 'border-rose-500/16 bg-rose-50 text-rose-700';
    default:
      return 'border-[rgb(var(--theme-line-rgb)/0.22)] bg-[rgb(var(--theme-surface-rgb)/0.7)] text-[rgb(var(--theme-muted-rgb))]';
  }
}

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsNotice, setAppointmentsNotice] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === 'scheduled' && isTodayOrFutureStoredDate(appointment.date))
        .sort(compareAppointmentsOldestFirst),
    [appointments]
  );
  const pastAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== 'scheduled' || !isTodayOrFutureStoredDate(appointment.date)),
    [appointments]
  );
  const nextAppointment = upcomingAppointments[0] ?? null;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }

    if (!user) return;

    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('clientId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        const nextAppointments: Appointment[] = [];
        snapshot.forEach((appointmentDoc) => {
          nextAppointments.push({ id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment);
        });
        nextAppointments.sort(compareAppointmentsNewestFirst);
        setAppointments(nextAppointments);
        setAppointmentsNotice('');
      },
      (snapshotError) => {
        if (snapshotError.message.includes('permission')) {
          navigate('/');
          return;
        }
        console.error('Error fetching client appointments:', snapshotError);
        setAppointments([]);
        setAppointmentsNotice('We could not load your bookings right now. Please refresh and try again.');
      }
    );

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (profileDoc) => {
        if (!profileDoc.exists()) return;

        const profile = profileDoc.data();
        setPhone(profile.phone || '');
        setTimezone(profile.timezone || '');
      },
      (profileError) => {
        console.error('Error fetching profile:', profileError);
      }
    );

    return () => {
      unsubscribeAppointments();
      unsubscribeProfile();
    };
  }, [user, loading, navigate]);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!user) return;
    const appointment = appointments.find((entry) => entry.id === appointmentId);

    try {
      await updateAppointmentStatus(appointmentId, 'cancelled', user.uid, false, appointment ? {
        clientName: appointment.clientName,
        clientEmail: user.email || '',
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        serviceType: appointment.serviceType,
        sessionMode: appointment.sessionMode,
        onlineSession: appointment.onlineSession,
      } : { clientEmail: user.email || '' });
      toast.success('Appointment cancelled successfully');
      setCancellingId(null);
    } catch (cancelError: any) {
      toast.error(cancelError.message || 'Failed to cancel appointment');
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: phone.trim(),
        timezone: timezone.trim(),
      });
      toast.success('Profile updated successfully');
    } catch (updateError: any) {
      toast.error(updateError.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="theme-panel w-full max-w-sm px-8 py-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[rgb(var(--theme-line-rgb)/0.6)] border-t-[rgb(var(--theme-primary-rgb))]" />
          <div className="mt-4 space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[rgb(var(--theme-muted-rgb))]">Opening portal</p>
            <p className="text-sm text-[rgb(var(--theme-text-rgb)/0.88)]">Loading your appointments.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-shell min-h-screen bg-brand-bg px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="patient-hero">
          <div className="space-y-4">
            <span className="theme-chip">Client Portal</span>
            <div className="space-y-3">
              <h1 className="patient-hero__title">Bookings and care details</h1>
              <p className="patient-hero__body">
                Upcoming sessions, contact details, and appointment actions.
              </p>
            </div>
          </div>

          <div className="patient-hero__actions">
            <a href="/#consultation-desk" className="theme-button-primary">
              <CalendarPlus className="h-4 w-4" />
              Book Session
            </a>
            <button onClick={() => navigate('/')} className="theme-button-secondary">
              <ArrowLeft className="h-4 w-4" />
              Portfolio
            </button>
          </div>
        </section>

        <div className="patient-overview-grid">
          <section className="patient-next-panel theme-panel-dark">
            <div className="space-y-3">
              <span className="patient-next-panel__eyebrow inline-flex w-fit items-center rounded-full border px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em]">
                Next Appointment
              </span>
              {nextAppointment ? (
                <>
                  <div className="space-y-2">
                    <p className="patient-next-panel__title font-heading text-4xl font-semibold leading-none">
                      {format(parseStoredDate(nextAppointment.date), 'MMM d')}
                    </p>
                    <p className="patient-next-panel__meta text-sm leading-6">
                      {format(parseStoredDate(nextAppointment.date), 'EEEE, MMMM d, yyyy')} at {formatSlot(nextAppointment.timeSlot)}
                    </p>
                  </div>
                  <p className="patient-next-panel__service text-sm font-semibold">{nextAppointment.serviceType}</p>
                  {nextAppointment.notes && <p className="patient-next-panel__notes text-sm leading-6">{nextAppointment.notes}</p>}
                  {nextAppointment.sessionMode === 'online' ? (
                    <p className="patient-next-panel__meta text-sm leading-6">
                      {nextAppointment.onlineSession?.url && nextAppointment.onlineSession.visibleToClient ? `${onlineProviderLabels[nextAppointment.onlineSession.provider]} session` : 'Online session'}
                    </p>
                  ) : null}
                  {nextAppointment.onlineSession?.notes && nextAppointment.onlineSession.visibleToClient ? (
                    <p className="patient-next-panel__notes text-sm leading-6">{nextAppointment.onlineSession.notes}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {canJoinOnlineSession(nextAppointment) ? (
                      <a
                        href={nextAppointment.onlineSession?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="patient-next-panel__action rounded-full border px-4 py-2 text-sm font-semibold transition"
                      >
                        Join session
                      </a>
                    ) : null}
                    <button
                      onClick={() => setReschedulingAppt(nextAppointment)}
                      className="patient-next-panel__action rounded-full border px-4 py-2 text-sm font-semibold transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancellingId(nextAppointment.id)}
                      className="patient-next-panel__danger rounded-full border px-4 py-2 text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="patient-next-panel__title font-heading text-3xl font-semibold leading-tight">No upcoming session yet.</p>
                  <p className="patient-next-panel__meta text-sm leading-6">
                    No scheduled upcoming session.
                  </p>
                  <a href="/#consultation-desk" className="patient-next-panel__ghost inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold">
                    Book a session
                    <CalendarPlus className="h-4 w-4" />
                  </a>
                </>
              )}
            </div>

            <div className="patient-metric-row">
              <div>
                <p className="patient-next-panel__metric-label text-[0.62rem] font-semibold uppercase tracking-[0.18em]">Upcoming</p>
                <p className="patient-next-panel__metric-value mt-1 font-heading text-2xl">{upcomingAppointments.length}</p>
              </div>
              <div>
                <p className="patient-next-panel__metric-label text-[0.62rem] font-semibold uppercase tracking-[0.18em]">History</p>
                <p className="patient-next-panel__metric-value mt-1 font-heading text-2xl">{pastAppointments.length}</p>
              </div>
            </div>
          </section>

          <section className="patient-profile-panel theme-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-[rgb(var(--theme-text-rgb))]">Profile</h2>
                <p className="mt-1 text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">
                  Contact details for confirmations and schedule changes.
                </p>
              </div>
              <UserRound className="h-5 w-5 text-[rgb(var(--theme-primary-rgb))]" />
            </div>

            <form onSubmit={handleUpdateProfile} className="patient-profile-form">
              <div className="patient-readonly-field">
                <UserRound className="h-4 w-4" />
                <div>
                  <label htmlFor="client-name" className="patient-field-label">Name</label>
                  <input
                    id="client-name"
                    type="text"
                    value={user?.displayName || ''}
                    disabled
                    className="patient-plain-input"
                  />
                </div>
              </div>

              <div className="patient-readonly-field">
                <Mail className="h-4 w-4" />
                <div>
                  <label htmlFor="client-email" className="patient-field-label">Email</label>
                  <input
                    id="client-email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="patient-plain-input"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="client-phone" className="patient-field-label">Phone Number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--theme-muted-rgb)/0.92)]" />
                    <input
                      id="client-phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+94 77 000 0000"
                      autoComplete="tel"
                      className="theme-input pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="client-timezone" className="patient-field-label">Timezone</label>
                  <select
                    id="client-timezone"
                    name="timezone"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className="theme-select"
                  >
                    <option value="">Select Timezone</option>
                    <option value="Asia/Colombo">Sri Lanka (IST)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                    <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="theme-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </section>
        </div>

        <section className="patient-appointments-panel theme-panel">
          <div className="patient-section-heading">
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-semibold text-[rgb(var(--theme-text-rgb))]">Appointments</h2>
              <p className="text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">
                Scheduled, completed, and cancelled sessions.
              </p>
            </div>
            <a href="/#consultation-desk" className="theme-button-secondary">
              <CalendarPlus className="h-4 w-4" />
              Book Another
            </a>
          </div>

          {appointmentsNotice ? (
            <div className="patient-empty-state">
              <AlertCircle className="h-7 w-7 text-[rgb(var(--theme-primary-rgb))]" />
              <p className="font-semibold text-[rgb(var(--theme-text-rgb))]">{appointmentsNotice}</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="patient-empty-state">
              <CalendarDays className="h-7 w-7 text-[rgb(var(--theme-primary-rgb))]" />
              <p className="font-semibold text-[rgb(var(--theme-text-rgb))]">No appointments booked yet.</p>
              <p className="max-w-xl text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">
                No appointment records.
              </p>
            </div>
          ) : (
            <div className="patient-appointment-list">
              {appointments.map((appointment) => {
                const canManage = appointment.status === 'scheduled' && isTodayOrFutureStoredDate(appointment.date);
                const isConfirmingCancel = cancellingId === appointment.id;

                return (
                  <article key={appointment.id} className="patient-appointment-row">
                    <div className="patient-date-block">
                      <span>{format(parseStoredDate(appointment.date), 'MMM')}</span>
                      <strong>{format(parseStoredDate(appointment.date), 'd')}</strong>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[rgb(var(--theme-text-rgb))]">
                          {appointment.serviceType}
                        </h3>
                        <span className={`patient-status-badge ${getStatusStyles(appointment.status)}`}>
                          {appointment.status === 'scheduled' ? <CheckCircle2 className="h-3.5 w-3.5" /> : appointment.status === 'cancelled' ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {appointment.status}
                        </span>
                        {appointment.sessionMode === 'online' ? (
                          <span className="patient-status-badge border-[rgb(var(--theme-primary-rgb)/0.18)] bg-[rgb(var(--theme-primary-rgb)/0.08)] text-[rgb(var(--theme-primary-rgb))]">
                            <Video className="h-3.5 w-3.5" />
                            online
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[rgb(var(--theme-muted-rgb))]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {format(parseStoredDate(appointment.date), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {formatSlot(appointment.timeSlot)}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="line-clamp-2 text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">{appointment.notes}</p>
                      )}
                      {appointment.sessionMode === 'online' && appointment.onlineSession?.notes && appointment.onlineSession.visibleToClient ? (
                        <p className="line-clamp-2 text-sm leading-6 text-[rgb(var(--theme-muted-rgb))]">{appointment.onlineSession.notes}</p>
                      ) : null}
                    </div>

                    <div className="patient-row-actions">
                      {canManage ? (
                        isConfirmingCancel ? (
                          <div className="patient-cancel-confirm">
                            <p>Cancel this session?</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleCancelAppointment(appointment.id)} className="patient-danger-button">
                                Cancel it
                              </button>
                              <button onClick={() => setCancellingId(null)} className="patient-neutral-button">
                                Keep session
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {canJoinOnlineSession(appointment) ? (
                              <a href={appointment.onlineSession?.url} target="_blank" rel="noreferrer" className="patient-action-button">
                                <Video className="h-4 w-4" />
                                Join
                              </a>
                            ) : null}
                            <button onClick={() => setReschedulingAppt(appointment)} className="patient-action-button">
                              <RefreshCw className="h-4 w-4" />
                              Reschedule
                            </button>
                            <button onClick={() => setCancellingId(appointment.id)} className="patient-danger-link">
                              Cancel
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-sm text-[rgb(var(--theme-muted-rgb)/0.92)]">Closed</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {reschedulingAppt && user && (
        <RescheduleModal
          isOpen={!!reschedulingAppt}
          onClose={() => setReschedulingAppt(null)}
          appointment={reschedulingAppt}
          userEmail={user.email || ''}
        />
      )}
    </div>
  );
}
