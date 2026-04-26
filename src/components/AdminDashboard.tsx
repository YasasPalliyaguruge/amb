import { startTransition, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { addDays, format, startOfWeek } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../firebase-db';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import {
  blockAvailabilityRange,
  buildGeneratedSlots,
  clearAvailabilityDate,
  duplicateAvailabilityTemplate,
  duplicateAvailabilityWeek,
  generateAvailabilityRange,
  generateRecurringAvailability,
  upsertAvailabilitySlots,
} from '../services/availabilityService';
import {
  bookConsultationAsAdmin,
  rescheduleConsultationAsAdmin,
  updateAppointmentStatus,
} from '../services/bookingService';
import {
  deleteMediaAsset,
  updateMediaAssetMetadata,
  uploadMediaAsset,
  type MediaAssetRecord,
} from '../services/mediaService';
import { logAudit } from '../utils/auditLogger';
import { parseStoredDate, toStoredDate } from '../utils/date';
import { sanitizeSiteSettings, siteSettingsDocId } from '../siteSettings/siteSettings';
import WebsiteSettingsPanel from './WebsiteSettingsPanel';
import ClientNotesModal from './ClientNotesModal';
import {
  adminTabs,
  type AdminTab,
  type AppointmentRecord,
  type AvailabilityRecord,
  type ComposerState,
  type PracticeSettings,
  type UserRecord,
  isAdminTab,
  weekdayLabels,
} from './admin/types';
import { EmptyState, formatSlot, MetricCard, ModalShell, SectionHeader, StatusBadge } from './admin/ui';

const defaultComposerState = (): ComposerState => ({
  clientId: '',
  date: toStoredDate(new Date()),
  timeSlot: '',
  serviceType: 'Consultation',
  notes: '',
});

function getInitialAdminTab(searchParams: URLSearchParams): AdminTab {
  const requestedTab = searchParams.get('tab');
  return isAdminTab(requestedTab) ? requestedTab : 'overview';
}

function getStatusTone(status: AppointmentRecord['status']) {
  return status === 'completed'
    ? 'positive'
    : status === 'cancelled'
      ? 'danger'
      : 'accent';
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => getInitialAdminTab(searchParams));
  const [dashboardNotice, setDashboardNotice] = useState('');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [availabilityDocs, setAvailabilityDocs] = useState<AvailabilityRecord[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<PracticeSettings>({ daysOff: [0, 6], bufferTime: 15, defaultDuration: 45 });
  const [filters, setFilters] = useState({ search: '', status: 'all', service: 'all', date: '' });
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(toStoredDate(new Date()));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [composerState, setComposerState] = useState<ComposerState>(defaultComposerState);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notesClient, setNotesClient] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(toStoredDate(new Date()));
  const [newSlot, setNewSlot] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [rangeStartDate, setRangeStartDate] = useState(toStoredDate(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState(toStoredDate(addDays(new Date(), 30)));
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([1, 3, 5]);
  const [blockStartDate, setBlockStartDate] = useState(toStoredDate(new Date()));
  const [blockEndDate, setBlockEndDate] = useState(toStoredDate(addDays(new Date(), 7)));
  const [blockReason, setBlockReason] = useState('');
  const [duplicateSourceDate, setDuplicateSourceDate] = useState(toStoredDate(new Date()));
  const [duplicateTargetStartDate, setDuplicateTargetStartDate] = useState(toStoredDate(addDays(new Date(), 1)));
  const [duplicateTargetEndDate, setDuplicateTargetEndDate] = useState(toStoredDate(addDays(new Date(), 21)));
  const [duplicateWeekdays, setDuplicateWeekdays] = useState<number[]>([]);
  const [sourceWeekStartDate, setSourceWeekStartDate] = useState(toStoredDate(startOfWeek(new Date(), { weekStartsOn: 1 })));
  const [targetWeekStartDate, setTargetWeekStartDate] = useState(toStoredDate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7)));
  const [clientSearch, setClientSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadCategory, setUploadCategory] = useState('hero');
  const [mediaDrafts, setMediaDrafts] = useState<Record<string, { label: string; category: string }>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const { user, role, loading } = useAuth();
  const { siteSettings } = useSiteSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const requestedTab = getInitialAdminTab(searchParams);
    if (requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => { if (!loading && (!user || role !== 'admin')) navigate('/'); }, [loading, navigate, role, user]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    const unsubscribes = [
      onSnapshot(query(collection(db, 'appointments'), orderBy('date', 'asc')), (snapshot) => setAppointments(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as AppointmentRecord))), () => setDashboardNotice('Appointments could not be loaded right now.')),
      onSnapshot(collection(db, 'users'), (snapshot) => setUsers(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as UserRecord)))),
      onSnapshot(collection(db, 'availability'), (snapshot) => setAvailabilityDocs(snapshot.docs.map((entry) => ({ id: entry.id, slots: [...((entry.data().slots as string[] | undefined) || [])].sort(), blocked: Boolean(entry.data().blocked), blockedReason: typeof entry.data().blockedReason === 'string' ? entry.data().blockedReason : null })))),
      onSnapshot(query(collection(db, 'mediaAssets'), orderBy('createdAt', 'desc')), (snapshot) => {
        const assets = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as MediaAssetRecord));
        setMediaAssets(assets);
        setMediaDrafts((current) => {
          const nextDrafts = { ...current };
          assets.forEach((asset) => {
            if (!nextDrafts[asset.id]) {
              nextDrafts[asset.id] = { label: asset.label, category: asset.category };
            }
          });
          return nextDrafts;
        });
      }),
      onSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(60)), (snapshot) => setAuditLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))),
      onSnapshot(doc(db, 'settings', 'general'), (snapshot) => { if (snapshot.exists()) setSettings(snapshot.data() as PracticeSettings); }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [role, user]);

  const userMap = useMemo(() => new Map(users.map((entry) => [entry.id, entry])), [users]);
  const availabilityMap = useMemo(() => new Map(availabilityDocs.map((entry) => [entry.id, entry])), [availabilityDocs]);
  const currentSlots = availabilityMap.get(selectedDate)?.slots || [];
  const clientUsers = useMemo(() => users.filter((entry) => entry.role !== 'admin'), [users]);
  const adminUsers = useMemo(() => users.filter((entry) => entry.role === 'admin'), [users]);
  const serviceOptions = useMemo(() => Array.from(new Set(appointments.map((entry) => entry.serviceType))).sort(), [appointments]);
  const activeTabLabel = adminTabs.find((tab) => tab.id === activeTab)?.label || 'Overview';
  const totalAppointments = appointments.length;
  const scheduledCount = appointments.filter((entry) => entry.status === 'scheduled').length;
  const completedCount = appointments.filter((entry) => entry.status === 'completed').length;
  const filteredAppointments = useMemo(() => appointments.filter((entry) => {
    const linkedUser = userMap.get(entry.clientId);
    const haystack = `${entry.clientName} ${linkedUser?.email || ''}`.toLowerCase();
    return (filters.status === 'all' || entry.status === filters.status) && (filters.service === 'all' || entry.serviceType === filters.service) && (!filters.date || entry.date === filters.date) && (!filters.search || haystack.includes(filters.search.toLowerCase()));
  }), [appointments, filters, userMap]);
  const selectedClient = clientUsers.find((entry) => entry.id === selectedClientId) || null;
  const selectedClientAppointments = appointments.filter((entry) => entry.clientId === selectedClientId);
  const composerSlots = availabilityMap.get(composerState.date)?.slots || [];
  const rescheduleSlots = availabilityMap.get(rescheduleDate)?.slots || [];
  const repeatClientCount = (Object.values(appointments.reduce<Record<string, number>>((accumulator, entry) => { accumulator[entry.clientId] = (accumulator[entry.clientId] || 0) + 1; return accumulator; }, {})) as number[]).filter((count) => count > 1).length;
  const upcomingWeekLoad = appointments.filter((entry) => entry.status === 'scheduled' && entry.date >= toStoredDate(new Date()) && entry.date <= toStoredDate(addDays(new Date(), 7))).length;
  const futureAvailability = availabilityDocs.filter((entry) => entry.id >= toStoredDate(new Date()));
  const availabilityCoverage = futureAvailability.filter((entry) => entry.slots.length > 0).length;
  const blockedDatesCount = futureAvailability.filter((entry) => entry.blocked).length;
  const serviceDemand = serviceOptions.map((serviceType) => ({ serviceType, count: appointments.filter((entry) => entry.serviceType === serviceType).length }));
  const monthlyTrend = Object.entries(appointments.reduce<Record<string, number>>((accumulator, entry) => { const monthKey = entry.date.slice(0, 7); accumulator[monthKey] = (accumulator[monthKey] || 0) + 1; return accumulator; }, {})).sort(([left], [right]) => left.localeCompare(right)).slice(-6);
  const filteredClients = useMemo(() => clientUsers.filter((entry) => `${entry.name} ${entry.email}`.toLowerCase().includes(clientSearch.toLowerCase())), [clientSearch, clientUsers]);
  const filteredUsersForAdmin = useMemo(() => users.filter((entry) => `${entry.name} ${entry.email}`.toLowerCase().includes(adminSearch.toLowerCase())), [adminSearch, users]);
  const nextPublishedDate = futureAvailability
    .filter((entry) => entry.slots.length > 0)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  const liveMediaSlots = [
    siteSettings.media.heroPrimaryUrl,
    ...siteSettings.media.heroSupportingUrls,
    siteSettings.media.artFeatureUrl,
    ...siteSettings.media.artGalleryUrls,
    siteSettings.media.consultationFeatureUrl,
  ].filter(Boolean).length;

  const getMediaAssignments = (assetUrl: string) => {
    const assignments: string[] = [];

    if (siteSettings.media.heroPrimaryUrl === assetUrl) assignments.push('Hero');
    if (siteSettings.media.heroSupportingUrls.includes(assetUrl)) assignments.push('Hero support');
    if (siteSettings.media.artFeatureUrl === assetUrl) assignments.push('Art feature');
    if (siteSettings.media.artGalleryUrls.includes(assetUrl)) assignments.push('Art gallery');
    if (siteSettings.media.consultationFeatureUrl === assetUrl) assignments.push('Consultation');

    return assignments;
  };

  useEffect(() => {
    if (!selectedClientId && clientUsers.length > 0) {
      setSelectedClientId(clientUsers[0].id);
    }
  }, [clientUsers, selectedClientId]);

  const toggleWeekday = (day: number, setter: Dispatch<SetStateAction<number[]>>) => setter((current) => current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day].sort());
  const activateTab = (tab: AdminTab) => {
    startTransition(() => setActiveTab(tab));
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }
    setSearchParams(nextParams, { replace: true });
  };
  const writeSiteSettings = async (nextSettings: typeof siteSettings, auditMessage: string) => { await setDoc(doc(db, 'settings', siteSettingsDocId), sanitizeSiteSettings(nextSettings)); if (user) void logAudit(user.uid, user.email || 'unknown', 'UPDATE_SITE_SETTINGS', auditMessage); };
  const openComposerForClient = (clientId?: string) => { setComposerState({ ...defaultComposerState(), clientId: clientId || '' }); setComposerOpen(true); };
  const handleAdminBooking = async () => {
    const client = userMap.get(composerState.clientId);
    if (!user || !client) return toast.error('Choose a client first.');
    if (!composerState.date) return toast.error('Choose a date.');
    if (!composerState.timeSlot) return toast.error('Choose an available time slot.');
    if (!composerState.serviceType.trim()) return toast.error('Enter the service type.');
    setIsBusy(true);
    try {
      const result = await bookConsultationAsAdmin({
        date: composerState.date,
        timeSlot: composerState.timeSlot,
        userId: composerState.clientId,
        clientName: client.name || client.email || 'Client',
        clientEmail: client.email || '',
        serviceType: composerState.serviceType.trim(),
        notes: composerState.notes.trim(),
      });
      toast.success(
        result.notificationState === 'failed'
          ? 'Appointment created. Confirmation email could not be queued, but the booking is saved.'
          : 'Appointment created successfully'
      );
      void logAudit(user.uid, user.email || 'unknown', 'CREATE_APPOINTMENT', `Created ${composerState.serviceType} for ${client.name || client.email}`);
      setComposerOpen(false);
      setComposerState(defaultComposerState());
    } catch (error: any) {
      toast.error(error.message || 'Failed to create appointment');
    } finally {
      setIsBusy(false);
    }
  };
  const handleStatusUpdate = async (appointmentId: string, nextStatus: AppointmentRecord['status']) => { if (!user) return; try { await updateAppointmentStatus(appointmentId, nextStatus, user.uid, true); toast.success('Appointment updated'); } catch (error: any) { toast.error(error.message || 'Failed to update appointment'); } };
  const handleAdminReschedule = async () => {
    if (!user || !selectedAppointment) return;
    if (!rescheduleDate) return toast.error('Choose a new date.');
    if (!rescheduleTime) return toast.error('Choose a new time slot.');
    if (rescheduleDate === selectedAppointment.date && rescheduleTime === selectedAppointment.timeSlot) {
      return toast.error('Choose a different slot before rescheduling.');
    }
    setIsBusy(true);
    try {
      await rescheduleConsultationAsAdmin(selectedAppointment.id, selectedAppointment.date, selectedAppointment.timeSlot, rescheduleDate, rescheduleTime, user.uid, selectedAppointment.clientName, userMap.get(selectedAppointment.clientId)?.email || '', selectedAppointment.serviceType);
      toast.success('Appointment rescheduled');
      setSelectedAppointment(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule appointment');
    } finally {
      setIsBusy(false);
    }
  };
  const handleRoleChange = async (targetUser: UserRecord, nextRole: 'client' | 'admin') => { if (!user || !window.confirm(`Change ${targetUser.email || targetUser.name} to ${nextRole}?`)) return; try { await updateDoc(doc(db, 'users', targetUser.id), { role: nextRole }); void logAudit(user.uid, user.email || 'unknown', 'UPDATE_USER_ROLE', `Changed ${targetUser.email || targetUser.name} to ${nextRole}`, targetUser.id); toast.success(`Role updated to ${nextRole}`); } catch (error: any) { toast.error(error.message || 'Failed to update role'); } };
  const handleMediaUpload = async () => {
    if (!uploadFile) return toast.error('Choose an image first.');
    setIsBusy(true);
    try {
      await uploadMediaAsset(uploadFile, {
        label: uploadLabel.trim() || uploadFile.name.replace(/\.[^.]+$/, ''),
        category: uploadCategory.trim() || 'hero',
      });
      if (user) void logAudit(user.uid, user.email || 'unknown', 'UPLOAD_MEDIA', `Uploaded ${uploadFile.name}`);
      toast.success('Media uploaded');
      setUploadFile(null);
      setUploadLabel('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload media');
    } finally {
      setIsBusy(false);
    }
  };
  const handleMediaDelete = async (asset: MediaAssetRecord) => { if (!window.confirm(`Delete ${asset.label}?`)) return; setIsBusy(true); try { await deleteMediaAsset(asset); await writeSiteSettings({ ...siteSettings, media: { ...siteSettings.media, heroPrimaryUrl: siteSettings.media.heroPrimaryUrl === asset.url ? '' : siteSettings.media.heroPrimaryUrl, heroSupportingUrls: siteSettings.media.heroSupportingUrls.filter((url) => url !== asset.url), artFeatureUrl: siteSettings.media.artFeatureUrl === asset.url ? '' : siteSettings.media.artFeatureUrl, artGalleryUrls: siteSettings.media.artGalleryUrls.filter((url) => url !== asset.url), consultationFeatureUrl: siteSettings.media.consultationFeatureUrl === asset.url ? '' : siteSettings.media.consultationFeatureUrl } }, `Removed media asset ${asset.label}`); if (user) void logAudit(user.uid, user.email || 'unknown', 'DELETE_MEDIA', `Deleted media asset ${asset.label}`, asset.id); toast.success('Media deleted'); } catch (error: any) { toast.error(error.message || 'Failed to delete media'); } finally { setIsBusy(false); } };
  const handleMediaAssign = async (slot: 'heroPrimaryUrl' | 'artFeatureUrl' | 'consultationFeatureUrl' | 'heroSupportingUrls' | 'artGalleryUrls', asset: MediaAssetRecord) => {
    setIsBusy(true);
    try {
      const nextMedia = { ...siteSettings.media };
      if (slot === 'heroSupportingUrls' || slot === 'artGalleryUrls') nextMedia[slot] = Array.from(new Set([...nextMedia[slot], asset.url]));
      else nextMedia[slot] = asset.url;
      await writeSiteSettings({ ...siteSettings, media: nextMedia }, `Assigned media to ${slot}`);
      toast.success('Media assignment updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign media');
    } finally {
      setIsBusy(false);
    }
  };
  const handleMediaMetaSave = async (assetId: string) => {
    if (!mediaDrafts[assetId]) return;
    setIsBusy(true);
    try {
      await updateMediaAssetMetadata(assetId, mediaDrafts[assetId]);
      if (user) void logAudit(user.uid, user.email || 'unknown', 'UPDATE_MEDIA', `Updated media metadata for ${assetId}`, assetId);
      toast.success('Media details updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update media');
    } finally {
      setIsBusy(false);
    }
  };
  const handleGenerateDay = async () => {
    try {
      const generated = buildGeneratedSlots(startTime, endTime, settings.defaultDuration, settings.bufferTime);
      await upsertAvailabilitySlots(selectedDate, Array.from(new Set([...currentSlots, ...generated])).sort());
      toast.success('Slots generated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate slots');
    }
  };
  const handleClearSelectedDate = async () => {
    try {
      await clearAvailabilityDate(selectedDate);
      toast.success('Availability cleared');
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear date');
    }
  };
  const handleAddSlot = async () => {
    if (!newSlot) return toast.error('Choose a time before adding a slot.');
    try {
      await upsertAvailabilitySlots(selectedDate, Array.from(new Set([...currentSlots, newSlot])).sort());
      setNewSlot('');
      toast.success('Slot added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add slot');
    }
  };
  const handleRemoveSlot = async (slot: string) => {
    try {
      await upsertAvailabilitySlots(selectedDate, currentSlots.filter((entry) => entry !== slot));
      toast.success('Slot removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove slot');
    }
  };
  const handleGenerateRange = async () => {
    if (rangeEndDate < rangeStartDate) return toast.error('The range end date must be after the start date.');
    try {
      const result = await generateAvailabilityRange({ startDate: rangeStartDate, endDate: rangeEndDate, startTime, endTime, defaultDuration: settings.defaultDuration, bufferTime: settings.bufferTime, daysOff: settings.daysOff });
      toast.success(`Generated ${result.daysUpdated} days`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate range');
    }
  };
  const handleGenerateRecurring = async () => {
    if (recurringWeekdays.length === 0) return toast.error('Select at least one weekday.');
    try {
      await generateRecurringAvailability({ startDate: rangeStartDate, endDate: rangeEndDate, startTime, endTime, defaultDuration: settings.defaultDuration, bufferTime: settings.bufferTime, weekdays: recurringWeekdays });
      toast.success('Recurring availability generated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate recurring slots');
    }
  };
  const handleBlockDates = async () => {
    if (blockEndDate < blockStartDate) return toast.error('The blocked range end date must be after the start date.');
    try {
      const result = await blockAvailabilityRange({ startDate: blockStartDate, endDate: blockEndDate, reason: blockReason.trim() });
      toast.success(`Blocked ${result.daysBlocked} dates`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to block dates');
    }
  };
  const handleSavePracticeSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      toast.success('Practice settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-shell">
        <div className="admin-frame">
          <section className="admin-hero">
            <div className="space-y-3">
              <span className="admin-hero__eyebrow">Admin dashboard</span>
              <h1 className="admin-hero__heading">Loading the control center</h1>
              <p className="admin-hero__body">Appointments, site settings, clients, and reporting are being prepared.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-frame">
        <section className="admin-hero">
          <div className="space-y-3">
            <span className="admin-hero__eyebrow">{activeTabLabel}</span>
            <h1 className="admin-hero__heading">Practice control center</h1>
            <p className="admin-hero__body">
              Review workload, publish availability, update website content, and manage client records from one focused workspace.
            </p>
          </div>
          <div className="admin-toolbar">
            <button onClick={() => navigate('/')} className="theme-button-secondary">Back to portfolio</button>
            {dashboardNotice ? (
              <div
                aria-live="polite"
                className="theme-panel-soft px-4 py-3 text-sm text-[rgb(var(--theme-muted-rgb))]"
              >
                {dashboardNotice}
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Appointments" value={totalAppointments} />
          <MetricCard label="Scheduled" value={scheduledCount} tone="positive" />
          <MetricCard label="Completed" value={completedCount} tone="accent" />
          <MetricCard label="Clients" value={clientUsers.length} />
          <MetricCard label="Repeat clients" value={repeatClientCount} />
        </div>

        <section className="admin-focus-strip" aria-label="Admin workspace summary">
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">Next open date</p>
            <p className="admin-focus-card__value">
              {nextPublishedDate ? format(parseStoredDate(nextPublishedDate.id), 'MMM d') : 'None'}
            </p>
            <p className="admin-focus-card__body">
              {nextPublishedDate ? `${nextPublishedDate.slots.length} published slot${nextPublishedDate.slots.length === 1 ? '' : 's'}` : 'Publish availability before clients can book.'}
            </p>
          </div>
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">This week</p>
            <p className="admin-focus-card__value">{upcomingWeekLoad}</p>
            <p className="admin-focus-card__body">Scheduled session{upcomingWeekLoad === 1 ? '' : 's'} in the next seven days.</p>
          </div>
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">Live media slots</p>
            <p className="admin-focus-card__value">{liveMediaSlots}</p>
            <p className="admin-focus-card__body">Images currently assigned across hero, art, and consultation sections.</p>
          </div>
        </section>

        <div className="admin-tabbar" role="tablist" aria-label="Admin modules">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`admin-tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`admin-tab-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => activateTab(tab.id)}
                className={`admin-tab ${activeTab === tab.id ? 'admin-tab--active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {activeTab === 'overview' && (
          <div
            id="admin-tab-panel-overview"
            role="tabpanel"
            aria-labelledby="admin-tab-overview"
            className="grid gap-8 xl:grid-cols-2"
          >
            <div className="theme-panel p-8 space-y-4">
              <SectionHeader
                eyebrow="Overview"
                title="Operational snapshot"
                description="A quick read on upcoming workload, published availability, blocked dates, and live media volume."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="theme-panel-soft p-5"><p className="utility-label">Upcoming week</p><p className="mt-3 text-2xl font-semibold">{upcomingWeekLoad} sessions</p></div>
                <div className="theme-panel-soft p-5"><p className="utility-label">Availability coverage</p><p className="mt-3 text-2xl font-semibold">{availabilityCoverage} open dates</p></div>
                <div className="theme-panel-soft p-5"><p className="utility-label">Blocked dates</p><p className="mt-3 text-2xl font-semibold">{blockedDatesCount}</p></div>
                <div className="theme-panel-soft p-5"><p className="utility-label">Published media</p><p className="mt-3 text-2xl font-semibold">{mediaAssets.length}</p></div>
              </div>
            </div>
            <div className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Audit"
                title="Recent activity"
                description="The latest admin actions across content, bookings, roles, and media."
              />
              <div className="admin-list">
                {auditLogs.slice(0, 6).length > 0 ? auditLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="theme-panel-soft p-4">
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">{log.details}</p>
                  </div>
                )) : (
                  <EmptyState
                    title="No recent activity"
                    description="New admin actions will appear here once bookings, settings, or roles are updated."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div
            id="admin-tab-panel-appointments"
            role="tabpanel"
            aria-labelledby="admin-tab-appointments"
            className="space-y-6"
          >
            <section className="theme-panel p-6">
              <SectionHeader
                eyebrow="Appointments"
                title="Search, manage, and create bookings"
                description="Filter by client, date, service, or status, then open an appointment to review notes, reschedule, or update status."
                actions={<button type="button" onClick={() => openComposerForClient()} className="theme-button-primary whitespace-nowrap">Create booking</button>}
              />
              <div className="admin-filter-grid">
                <label className="admin-field">
                  <span className="admin-field__label">Search</span>
                  <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Client name or email" className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Date</span>
                  <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Status</span>
                  <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="theme-select"><option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Service</span>
                  <select value={filters.service} onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))} className="theme-select"><option value="all">All services</option>{serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}</select>
                </label>
              </div>
            </section>
            <div className="admin-list">
              {filteredAppointments.length > 0 ? filteredAppointments.map((appointment) => (
                <article key={appointment.id} className="admin-appointment-card">
                  <div className="admin-date-block">
                    <span>{format(parseStoredDate(appointment.date), 'MMM')}</span>
                    <strong>{format(parseStoredDate(appointment.date), 'd')}</strong>
                  </div>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="truncate text-xl font-semibold">{appointment.clientName}</h3>
                        <StatusBadge label={appointment.status} tone={getStatusTone(appointment.status)} />
                      </div>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{userMap.get(appointment.clientId)?.email || 'No email available'}</p>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{format(parseStoredDate(appointment.date), 'MMMM d, yyyy')} - {formatSlot(appointment.timeSlot)} - {appointment.serviceType}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => { setSelectedAppointment(appointment); setRescheduleDate(appointment.date); setRescheduleTime(''); }} className="theme-button-secondary">Manage</button>
                      <button type="button" onClick={() => setNotesClient({ id: appointment.clientId, name: appointment.clientName })} className="theme-button-secondary">Notes</button>
                    </div>
                  </div>
                  {appointment.notes ? <p className="mt-4 text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">Notes: {appointment.notes}</p> : null}
                </article>
              )) : (
                <EmptyState
                  title="No appointments match these filters"
                  description="Adjust the search, date, service, or status filter to bring appointments back into view."
                  action={<button type="button" onClick={() => setFilters({ search: '', status: 'all', service: 'all', date: '' })} className="theme-button-secondary">Clear filters</button>}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div
            id="admin-tab-panel-availability"
            role="tabpanel"
            aria-labelledby="admin-tab-availability"
            className="grid gap-8 xl:grid-cols-2"
          >
            <section className="theme-panel p-8 space-y-4">
              <SectionHeader
                eyebrow="Availability"
                title="Single-day scheduling"
                description="Generate a working day, add one-off slots, or clear a date entirely."
              />
              <input aria-label="Selected availability date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="theme-input" />
              <div className="grid gap-4 md:grid-cols-2"><input aria-label="Availability start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="theme-input" /><input aria-label="Availability end time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="theme-input" /></div>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={handleGenerateDay} className="theme-button-primary">Generate day</button><button type="button" onClick={handleClearSelectedDate} className="theme-button-secondary">Clear date</button></div>
              <div className="flex gap-3"><input aria-label="New availability slot time" type="time" value={newSlot} onChange={(event) => setNewSlot(event.target.value)} className="theme-input flex-1" /><button type="button" onClick={handleAddSlot} className="theme-button-secondary">Add slot</button></div>
              <div className="grid gap-3 md:grid-cols-2">
                {currentSlots.length > 0 ? currentSlots.map((slot) => <div key={slot} className="theme-panel-soft flex items-center justify-between p-3"><span>{slot}</span><button type="button" onClick={() => handleRemoveSlot(slot)} className="text-sm text-rose-600">Remove</button></div>) : <EmptyState title="No slots published for this date" description="Generate a full day or add individual slots to make this date bookable." />}
              </div>
            </section>
            <section className="space-y-8">
              <div className="theme-panel p-8 space-y-4">
                <SectionHeader
                  eyebrow="Bulk tools"
                  title="Range, recurring, and blocking tools"
                  description="Publish dates in bulk, repeat weekly schedules, or block unavailable ranges."
                />
                <div className="grid gap-4 md:grid-cols-2"><input aria-label="Availability range start date" type="date" value={rangeStartDate} onChange={(event) => setRangeStartDate(event.target.value)} className="theme-input" /><input aria-label="Availability range end date" type="date" value={rangeEndDate} onChange={(event) => setRangeEndDate(event.target.value)} className="theme-input" /></div>
                <button type="button" onClick={handleGenerateRange} className="theme-button-primary">Generate range</button>
                <div className="flex flex-wrap gap-2">{weekdayLabels.map((label, index) => <button key={label} type="button" onClick={() => toggleWeekday(index, setRecurringWeekdays)} className={`rounded-full px-3 py-2 text-sm ${recurringWeekdays.includes(index) ? 'bg-[rgb(var(--theme-primary-rgb))] text-white' : 'theme-panel-soft'}`}>{label}</button>)}</div>
                <button type="button" onClick={handleGenerateRecurring} className="theme-button-secondary">Generate recurring</button>
                <div className="grid gap-4 md:grid-cols-2"><input aria-label="Blocked range start date" type="date" value={blockStartDate} onChange={(event) => setBlockStartDate(event.target.value)} className="theme-input" /><input aria-label="Blocked range end date" type="date" value={blockEndDate} onChange={(event) => setBlockEndDate(event.target.value)} className="theme-input" /></div>
                <textarea aria-label="Reason for blocking dates" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} rows={3} className="theme-textarea" placeholder="Reason for blocking dates" />
                <button type="button" onClick={handleBlockDates} className="theme-button-secondary">Block dates</button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'clients' && (
          <div
            id="admin-tab-panel-clients"
            role="tabpanel"
            aria-labelledby="admin-tab-clients"
            className="grid gap-8 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]"
          >
            <section className="theme-panel p-8 space-y-4">
              <SectionHeader
                eyebrow="Clients"
                title="Search the client directory"
                description="Open a client profile to see booking history, notes, and quick actions."
              />
              <input aria-label="Search clients" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Search clients..." className="theme-input" />
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={`w-full rounded-[calc(var(--theme-radius-md)+0.08rem)] border px-4 py-4 text-left ${selectedClientId === client.id ? 'border-[rgb(var(--theme-primary-rgb)/0.55)] bg-[rgb(var(--theme-primary-rgb)/0.08)]' : 'border-[rgb(var(--theme-line-rgb)/0.2)] bg-[rgb(var(--theme-surface-rgb)/0.6)]'}`}>
                  <p className="font-semibold">{client.name || 'Client'}</p>
                  <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{client.email}</p>
                </button>
              )) : <EmptyState title="No matching clients" description="Try a different name or email to find the client you need." />}
            </section>
            <section className="theme-panel p-8">
              {selectedClient ? (
                <div className="space-y-5">
                  <SectionHeader
                    eyebrow="Selected client"
                    title={selectedClient.name || 'Client profile'}
                    description="Review this client's booking history, create a new appointment, or jump into notes."
                    actions={<div className="flex flex-wrap gap-3"><button type="button" onClick={() => openComposerForClient(selectedClient.id)} className="theme-button-primary">Create booking</button><button type="button" onClick={() => setNotesClient({ id: selectedClient.id, name: selectedClient.name || 'Client' })} className="theme-button-secondary">Open notes</button></div>}
                  />
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{selectedClient.email}</p>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{selectedClient.phone || 'No phone saved'} - {selectedClient.timezone || 'No timezone saved'}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Total bookings" value={selectedClientAppointments.length} />
                    <MetricCard label="Scheduled" value={selectedClientAppointments.filter((entry) => entry.status === 'scheduled').length} tone="positive" />
                    <MetricCard label="Completed" value={selectedClientAppointments.filter((entry) => entry.status === 'completed').length} tone="accent" />
                  </div>
                  <div className="admin-list">
                    {selectedClientAppointments.length > 0 ? selectedClientAppointments.map((appointment) => (
                      <div key={appointment.id} className="theme-panel-soft p-4">
                        <p className="font-semibold">{format(parseStoredDate(appointment.date), 'MMMM d, yyyy')} - {formatSlot(appointment.timeSlot)}</p>
                        <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{appointment.serviceType} - {appointment.status}</p>
                      </div>
                    )) : <EmptyState title="No bookings for this client yet" description="Create the first appointment from this client profile when needed." />}
                  </div>
                </div>
              ) : <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">Select a client to inspect their profile and booking history.</p>}
            </section>
          </div>
        )}

        {activeTab === 'website' && (
          <div id="admin-tab-panel-website" role="tabpanel" aria-labelledby="admin-tab-website">
            <WebsiteSettingsPanel adminId={user?.uid} adminEmail={user?.email || 'unknown'} />
          </div>
        )}

        {activeTab === 'media' && (
          <div id="admin-tab-panel-media" role="tabpanel" aria-labelledby="admin-tab-media" className="space-y-8">
            <section className="theme-panel p-8">
              <SectionHeader
                eyebrow="Media"
                title="Upload and assign website media"
                description="Add images to the library, update labels, and assign assets to live website slots."
              />
              <div className="admin-media-upload-grid">
                <label className="admin-field">
                  <span className="admin-field__label">Image file</span>
                  <input type="file" accept="image/*" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Label</span>
                  <input value={uploadLabel} onChange={(event) => setUploadLabel(event.target.value)} placeholder="Homepage hero 01" className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Category</span>
                  <input value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} placeholder="hero" className="theme-input" />
                </label>
                <button type="button" onClick={handleMediaUpload} disabled={!uploadFile || isBusy} className="theme-button-primary disabled:opacity-50">Upload</button>
              </div>
            </section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mediaAssets.length > 0 ? mediaAssets.map((asset) => {
                const assignments = getMediaAssignments(asset.url);

                return (
                <article key={asset.id} className="admin-media-card">
                    <div className="overflow-hidden rounded-[calc(var(--theme-radius-lg)-0.2rem)] border border-[rgb(var(--theme-line-rgb)/0.2)]">
                      <img src={asset.url} alt={asset.label} width={640} height={400} className="aspect-[16/10] w-full object-cover" />
                    </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {assignments.length > 0 ? assignments.map((assignment) => (
                        <span key={assignment} className="admin-media-chip">{assignment}</span>
                      )) : (
                        <span className="admin-media-chip admin-media-chip--muted">Unused</span>
                      )}
                    </div>
                    <input aria-label={`Label for ${asset.label}`} value={mediaDrafts[asset.id]?.label || asset.label} onChange={(event) => setMediaDrafts((current) => ({ ...current, [asset.id]: { label: event.target.value, category: current[asset.id]?.category || asset.category } }))} className="theme-input" />
                    <input aria-label={`Category for ${asset.label}`} value={mediaDrafts[asset.id]?.category || asset.category} onChange={(event) => setMediaDrafts((current) => ({ ...current, [asset.id]: { label: current[asset.id]?.label || asset.label, category: event.target.value } }))} className="theme-input" />
                    <div className="admin-media-actions">
                      <button type="button" onClick={() => handleMediaMetaSave(asset.id)} className="theme-button-secondary">Save details</button>
                      <button type="button" onClick={() => handleMediaAssign('heroPrimaryUrl', asset)} className="theme-button-secondary">Set hero image</button>
                      <button type="button" onClick={() => handleMediaAssign('heroSupportingUrls', asset)} className="theme-button-secondary">Add hero supporting</button>
                      <button type="button" onClick={() => handleMediaAssign('artFeatureUrl', asset)} className="theme-button-secondary">Set art feature</button>
                      <button type="button" onClick={() => handleMediaAssign('artGalleryUrls', asset)} className="theme-button-secondary">Add to art gallery</button>
                      <button type="button" onClick={() => handleMediaAssign('consultationFeatureUrl', asset)} className="theme-button-secondary">Set consultation image</button>
                      <button type="button" onClick={() => handleMediaDelete(asset)} className="rounded-full bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Delete asset</button>
                    </div>
                  </div>
                </article>
              )}) : <EmptyState title="No media uploaded yet" description="Upload the first image here to start assigning hero, art, or consultation visuals." />}
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div id="admin-tab-panel-admins" role="tabpanel" aria-labelledby="admin-tab-admins" className="grid gap-8 xl:grid-cols-2">
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Admins"
                title="Current admins"
                description="Every admin has full access to bookings, publishing, settings, media, and user management."
              />
              {adminUsers.length > 0 ? adminUsers.map((entry) => (
                <div key={entry.id} className="theme-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{entry.name || 'Admin'}</p><p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{entry.email}</p></div>
                  {entry.id !== user?.uid ? <button type="button" onClick={() => handleRoleChange(entry, 'client')} className="rounded-full bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Revoke admin</button> : <span className="text-xs uppercase tracking-[0.16em] text-[rgb(var(--theme-muted-rgb))]">Current session</span>}
                </div>
              )) : <EmptyState title="No admins found" description="The bootstrap admin should appear here once the users collection is available." />}
            </section>
            <section className="theme-panel p-8 space-y-4">
              <SectionHeader
                eyebrow="Permissions"
                title="Promote signed-in users"
                description="Search by name or email, then promote a signed-in user to full admin access."
              />
              <input aria-label="Search users to promote" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search users..." className="theme-input" />
              {filteredUsersForAdmin.length > 0 ? filteredUsersForAdmin.map((entry) => (
                <div key={entry.id} className="theme-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{entry.name || 'User'}</p><p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{entry.email}</p></div>
                  {entry.role === 'admin' ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Admin</span> : <button type="button" onClick={() => handleRoleChange(entry, 'admin')} className="theme-button-primary">Promote to admin</button>}
                </div>
              )) : <EmptyState title="No users match this search" description="Try a different search term to find the user you want to promote." />}
            </section>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div id="admin-tab-panel-analytics" role="tabpanel" aria-labelledby="admin-tab-analytics" className="grid gap-8 xl:grid-cols-2">
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Analytics"
                title="Service demand"
                description="A quick breakdown of how many appointments have been booked for each service type."
              />
              {serviceDemand.length > 0 ? serviceDemand.map((entry) => <div key={entry.serviceType} className="theme-panel-soft flex items-center justify-between p-4"><p className="font-medium">{entry.serviceType}</p><p className="text-lg font-semibold">{entry.count}</p></div>) : <EmptyState title="No service data yet" description="As appointments are created, service demand will start to appear here." />}
            </section>
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Trend"
                title="Booking trend"
                description="Recent booking volume by month for a quick sense of cadence."
              />
              {monthlyTrend.length > 0 ? monthlyTrend.map(([month, count]) => <div key={month} className="theme-panel-soft flex items-center justify-between p-4"><p className="font-medium">{month}</p><p className="text-lg font-semibold">{count}</p></div>) : <EmptyState title="No trend data yet" description="Monthly booking volume will appear here as appointments accumulate." />}
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <section id="admin-tab-panel-settings" role="tabpanel" aria-labelledby="admin-tab-settings" className="theme-panel mx-auto max-w-3xl p-8">
            <SectionHeader
              eyebrow="Practice settings"
              title="Default scheduling rules"
              description="Set days off, session duration, and buffer time for future generated availability."
            />
            <form onSubmit={handleSavePracticeSettings} className="space-y-6">
              <div className="flex flex-wrap gap-3">
                {weekdayLabels.map((label, index) => <button key={label} type="button" onClick={() => setSettings((current) => ({ ...current, daysOff: current.daysOff.includes(index) ? current.daysOff.filter((entry) => entry !== index) : [...current.daysOff, index].sort() }))} className={`rounded-full px-4 py-2 text-sm font-medium ${settings.daysOff.includes(index) ? 'bg-rose-50 text-rose-600' : 'theme-panel-soft'}`}>{label}</button>)}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input aria-label="Default session duration in minutes" type="number" min="15" step="15" value={settings.defaultDuration} onChange={(event) => setSettings((current) => ({ ...current, defaultDuration: Number(event.target.value) || 45 }))} className="theme-input" />
                <input aria-label="Buffer time in minutes" type="number" min="0" step="5" value={settings.bufferTime} onChange={(event) => setSettings((current) => ({ ...current, bufferTime: Number(event.target.value) || 0 }))} className="theme-input" />
              </div>
              <button type="submit" disabled={isSavingSettings} className="theme-button-primary disabled:opacity-50">{isSavingSettings ? 'Saving...' : 'Save practice settings'}</button>
            </form>
          </section>
        )}

        {activeTab === 'audit' && (
          <section id="admin-tab-panel-audit" role="tabpanel" aria-labelledby="admin-tab-audit" className="space-y-3">
            <SectionHeader
              eyebrow="Audit"
              title="Full audit trail"
              description="Every logged admin action is listed here with timing and actor information."
            />
            {auditLogs.length > 0 ? auditLogs.map((log) => (
              <article key={log.id} className="theme-panel p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div><p className="font-semibold">{log.action}</p><p className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">{log.details}</p></div>
                  <div className="text-sm text-[rgb(var(--theme-muted-rgb))]"><p>{log.adminEmail}</p><p>{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, yyyy HH:mm') : 'Just now'}</p></div>
                </div>
              </article>
            )) : <EmptyState title="No audit entries yet" description="Once admin actions are logged, the full trail will appear here." />}
          </section>
        )}
      </div>

      {composerOpen && (
        <ModalShell title="Create booking for a client" onClose={() => setComposerOpen(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <select aria-label="Client for the new booking" value={composerState.clientId} onChange={(event) => setComposerState((current) => ({ ...current, clientId: event.target.value }))} className="theme-select"><option value="">Select client</option>{clientUsers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || entry.email} - {entry.email}</option>)}</select>
            <input aria-label="Booking date" type="date" value={composerState.date} onChange={(event) => setComposerState((current) => ({ ...current, date: event.target.value, timeSlot: '' }))} className="theme-input" />
            <select aria-label="Booking time slot" value={composerState.timeSlot} onChange={(event) => setComposerState((current) => ({ ...current, timeSlot: event.target.value }))} className="theme-select"><option value="">Select slot</option>{composerSlots.map((slot) => <option key={slot} value={slot}>{formatSlot(slot)}</option>)}</select>
            <input aria-label="Service type" value={composerState.serviceType} onChange={(event) => setComposerState((current) => ({ ...current, serviceType: event.target.value }))} placeholder="Service type" className="theme-input" />
          </div>
          <textarea aria-label="Internal booking notes" value={composerState.notes} onChange={(event) => setComposerState((current) => ({ ...current, notes: event.target.value }))} rows={4} className="theme-textarea mt-4" placeholder="Notes" />
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setComposerOpen(false)} className="theme-button-secondary">Cancel</button><button type="button" onClick={handleAdminBooking} disabled={isBusy} className="theme-button-primary disabled:opacity-50">Create booking</button></div>
        </ModalShell>
      )}

      {selectedAppointment && (
        <ModalShell title="Manage appointment" onClose={() => setSelectedAppointment(null)}>
          <div className="space-y-4">
            <div className="theme-panel-soft p-5">
              <p className="text-lg font-semibold">{selectedAppointment.clientName}</p>
              <p className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">{userMap.get(selectedAppointment.clientId)?.email || 'No email available'}</p>
              <p className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">{format(parseStoredDate(selectedAppointment.date), 'MMMM d, yyyy')} - {formatSlot(selectedAppointment.timeSlot)} - {selectedAppointment.serviceType}</p>
              {selectedAppointment.notes ? <p className="mt-3 text-sm text-[rgb(var(--theme-muted-rgb))]">Notes: {selectedAppointment.notes}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment.id, 'scheduled')} className="theme-button-secondary">Keep scheduled</button>
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment.id, 'completed')} className="theme-button-secondary">Mark completed</button>
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment.id, 'cancelled')} className="rounded-full bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600">Cancel appointment</button>
            </div>
            <div className="theme-panel-soft p-5">
              <p className="font-semibold">Reschedule</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input aria-label="New appointment date" type="date" value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleTime(''); }} className="theme-input" />
                <select aria-label="New appointment time slot" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="theme-select"><option value="">Select new slot</option>{rescheduleSlots.map((slot) => <option key={slot} value={slot}>{formatSlot(slot)}</option>)}</select>
              </div>
              <div className="mt-4 flex justify-end"><button type="button" onClick={handleAdminReschedule} disabled={!rescheduleTime || isBusy} className="theme-button-primary disabled:opacity-50">Reschedule appointment</button></div>
            </div>
          </div>
        </ModalShell>
      )}

      {notesClient && <ClientNotesModal isOpen={!!notesClient} onClose={() => setNotesClient(null)} clientId={notesClient.id} clientName={notesClient.name} />}
    </div>
  );
}
