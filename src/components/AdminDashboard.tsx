import { lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  collection,
  doc,
  documentId,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
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

const WebsiteSettingsPanel = lazy(() => import('./WebsiteSettingsPanel'));
const ClientNotesModal = lazy(() => import('./ClientNotesModal'));

const defaultComposerState = (): ComposerState => ({
  clientId: '',
  date: toStoredDate(new Date()),
  timeSlot: '',
  serviceType: 'Consultation',
  notes: '',
  sessionMode: 'in_person',
  onlineProvider: 'zoom',
  onlineUrl: '',
  onlineVisibleToClient: true,
  onlineNotes: '',
});

const onlineProviderLabels = {
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  google_meet: 'Google Meet',
  jitsi: 'Jitsi',
  other: 'Other',
} as const;

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

function formatAuditTimestamp(timestamp: any) {
  if (timestamp?.toDate) {
    return format(timestamp.toDate(), 'MMM d, yyyy HH:mm');
  }

  if (timestamp instanceof Date) {
    return format(timestamp, 'MMM d, yyyy HH:mm');
  }

  return 'Just now';
}

function sortAppointmentsNewestFirst(left: AppointmentRecord, right: AppointmentRecord) {
  const dateComparison = right.date.localeCompare(left.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return right.timeSlot.localeCompare(left.timeSlot);
}

function normalizeOnlineUrl(value: string) {
  return value.trim();
}

function isValidOnlineUrl(value: string) {
  if (!value) return true;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabbarRef = useRef<HTMLDivElement | null>(null);
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
  const [sessionModeDraft, setSessionModeDraft] = useState<'in_person' | 'online'>('in_person');
  const [onlineProviderDraft, setOnlineProviderDraft] = useState<NonNullable<AppointmentRecord['onlineSession']>['provider']>('zoom');
  const [onlineUrlDraft, setOnlineUrlDraft] = useState('');
  const [onlineVisibleDraft, setOnlineVisibleDraft] = useState(true);
  const [onlineNotesDraft, setOnlineNotesDraft] = useState('');
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
  }, [activeTab, searchParams]);

  useEffect(() => {
    const activeTabButton = tabbarRef.current?.querySelector<HTMLButtonElement>(`#admin-tab-${activeTab}`);
    activeTabButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  useEffect(() => { if (!loading && (!user || role !== 'admin')) navigate('/'); }, [loading, navigate, role, user]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    const unsubscribes = [
      onSnapshot(query(collection(db, 'appointments'), orderBy('date', 'desc')), (snapshot) => setAppointments(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as AppointmentRecord))), () => setDashboardNotice('Appointments could not be loaded right now.')),
      onSnapshot(collection(db, 'users'), (snapshot) => setUsers(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as UserRecord)))),
      onSnapshot(doc(db, 'settings', 'general'), (snapshot) => { if (snapshot.exists()) setSettings(snapshot.data() as PracticeSettings); }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [role, user]);

  useEffect(() => {
    if (!user || role !== 'admin') return;

    const today = toStoredDate(new Date());
    const availabilitySource =
      activeTab === 'availability'
        ? collection(db, 'availability')
        : query(collection(db, 'availability'), where(documentId(), '>=', today));

    return onSnapshot(availabilitySource, (snapshot) => {
      setAvailabilityDocs(snapshot.docs.map((entry) => ({
        id: entry.id,
        slots: [...((entry.data().slots as string[] | undefined) || [])].sort(),
        blocked: Boolean(entry.data().blocked),
        blockedReason: typeof entry.data().blockedReason === 'string' ? entry.data().blockedReason : null,
      })));
    });
  }, [activeTab, role, user]);

  useEffect(() => {
    if (!user || role !== 'admin' || (activeTab !== 'overview' && activeTab !== 'media')) return;

    return onSnapshot(query(collection(db, 'mediaAssets'), orderBy('createdAt', 'desc')), (snapshot) => {
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
    });
  }, [activeTab, role, user]);

  useEffect(() => {
    if (!user || role !== 'admin' || (activeTab !== 'overview' && activeTab !== 'audit')) return;

    return onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(60)),
      (snapshot) => setAuditLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })))
    );
  }, [activeTab, role, user]);

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
  const filteredAppointments = useMemo(() => appointments
    .filter((entry) => {
      const linkedUser = userMap.get(entry.clientId);
      const haystack = `${entry.clientName} ${linkedUser?.email || ''}`.toLowerCase();
      return (filters.status === 'all' || entry.status === filters.status) && (filters.service === 'all' || entry.serviceType === filters.service) && (!filters.date || entry.date === filters.date) && (!filters.search || haystack.includes(filters.search.toLowerCase()));
    })
    .sort(sortAppointmentsNewestFirst), [appointments, filters, userMap]);
  const selectedClient = clientUsers.find((entry) => entry.id === selectedClientId) || null;
  const selectedClientAppointments = appointments
    .filter((entry) => entry.clientId === selectedClientId)
    .sort(sortAppointmentsNewestFirst);
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
  const openAppointmentManager = (appointment: AppointmentRecord) => {
    setSelectedAppointment(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime('');
    setSessionModeDraft(appointment.sessionMode || 'in_person');
    setOnlineProviderDraft(appointment.onlineSession?.provider || 'zoom');
    setOnlineUrlDraft(appointment.onlineSession?.url || '');
    setOnlineVisibleDraft(appointment.onlineSession?.visibleToClient ?? true);
    setOnlineNotesDraft(appointment.onlineSession?.notes || '');
  };
  const handleAdminBooking = async () => {
    const client = userMap.get(composerState.clientId);
    if (!user || !client) return toast.error('Choose a client first.');
    if (!composerState.date) return toast.error('Choose a date.');
    if (!composerState.timeSlot) return toast.error('Choose an available time slot.');
    if (!composerState.serviceType.trim()) return toast.error('Enter the service type.');
    const onlineUrl = normalizeOnlineUrl(composerState.onlineUrl);
    if (composerState.sessionMode === 'online' && !isValidOnlineUrl(onlineUrl)) {
      return toast.error('Enter a valid https meeting link.');
    }
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
        sessionMode: composerState.sessionMode,
        onlineSession: composerState.sessionMode === 'online'
          ? {
              provider: composerState.onlineProvider,
              url: onlineUrl,
              visibleToClient: composerState.onlineVisibleToClient,
              notes: composerState.onlineNotes.trim(),
            }
          : null,
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
  const handleStatusUpdate = async (appointment: AppointmentRecord, nextStatus: AppointmentRecord['status']) => {
    if (!user) return;

    try {
      await updateAppointmentStatus(appointment.id, nextStatus, user.uid, true, {
        clientName: appointment.clientName,
        clientEmail: userMap.get(appointment.clientId)?.email || '',
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        serviceType: appointment.serviceType,
        sessionMode: appointment.sessionMode,
        onlineSession: appointment.onlineSession,
      });
      toast.success('Appointment updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update appointment');
    }
  };
  const handleOnlineSessionSave = async () => {
    if (!user || !selectedAppointment) return;

    const onlineUrl = normalizeOnlineUrl(onlineUrlDraft);
    if (sessionModeDraft === 'online' && !isValidOnlineUrl(onlineUrl)) {
      return toast.error('Enter a valid https meeting link.');
    }

    const nextOnlineSession = sessionModeDraft === 'online'
      ? {
          provider: onlineProviderDraft,
          url: onlineUrl,
          visibleToClient: onlineVisibleDraft,
          notes: onlineNotesDraft.trim(),
        }
      : null;

    setIsBusy(true);
    try {
      await updateDoc(doc(db, 'appointments', selectedAppointment.id), {
        sessionMode: sessionModeDraft,
        onlineSession: nextOnlineSession,
      });
      setSelectedAppointment((current) => current ? {
        ...current,
        sessionMode: sessionModeDraft,
        onlineSession: nextOnlineSession,
      } : current);
      void logAudit(user.uid, user.email || 'unknown', 'UPDATE_ONLINE_SESSION', `Updated online session for ${selectedAppointment.clientName}`, selectedAppointment.id);
      toast.success('Online session updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update online session');
    } finally {
      setIsBusy(false);
    }
  };
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
              <p className="admin-hero__body">Appointments, availability, clients, website content, and reporting.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-shell admin-shell--${activeTab}`}>
      <div className="admin-frame">
        <section className="admin-hero">
          <div className="space-y-3">
            <span className="admin-hero__eyebrow">{activeTabLabel}</span>
            <h1 className="admin-hero__heading">Practice control center</h1>
            <p className="admin-hero__body">
              Appointments, availability, clients, website content, and admin controls.
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

        <div className="admin-summary-grid grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Appointments" value={totalAppointments} />
          <MetricCard label="Scheduled" value={scheduledCount} tone="positive" />
          <MetricCard label="Completed" value={completedCount} tone="accent" />
          <MetricCard label="Clients" value={clientUsers.length} />
          <MetricCard label="Repeat clients" value={repeatClientCount} />
        </div>

        <section className="admin-focus-strip" aria-label="Admin summary">
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">Next open date</p>
            <p className="admin-focus-card__value">
              {nextPublishedDate ? format(parseStoredDate(nextPublishedDate.id), 'MMM d') : 'None'}
            </p>
            <p className="admin-focus-card__body">
              {nextPublishedDate ? `${nextPublishedDate.slots.length} published slot${nextPublishedDate.slots.length === 1 ? '' : 's'}` : 'No published slots'}
            </p>
          </div>
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">This week</p>
            <p className="admin-focus-card__value">{upcomingWeekLoad}</p>
            <p className="admin-focus-card__body">Next seven days</p>
          </div>
          <div className="admin-focus-card">
            <p className="admin-focus-card__label">Live media slots</p>
            <p className="admin-focus-card__value">{liveMediaSlots}</p>
            <p className="admin-focus-card__body">Hero, art, and consultation sections</p>
          </div>
        </section>

        <div ref={tabbarRef} className="admin-tabbar" role="tablist" aria-label="Admin modules">
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
                description="Upcoming workload, published availability, blocked dates, and live media."
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
                description="Content, bookings, roles, and media changes."
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
                    description="No logged admin actions."
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
                title="Appointment management"
                description="Client, date, service, and status filters."
                actions={<button type="button" onClick={() => openComposerForClient()} className="theme-button-primary whitespace-nowrap">Create booking</button>}
              />
              <div className="admin-filter-grid">
                <label className="admin-field">
                  <span className="admin-field__label">Appointment search</span>
                  <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Client name or email" className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Appointment date</span>
                  <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Appointment status</span>
                  <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="theme-select"><option value="all">All statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Service type</span>
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
                        {appointment.sessionMode === 'online' ? <StatusBadge label="online" tone="accent" /> : null}
                      </div>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{userMap.get(appointment.clientId)?.email || 'No email available'}</p>
                      <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{format(parseStoredDate(appointment.date), 'MMMM d, yyyy')} - {formatSlot(appointment.timeSlot)} - {appointment.serviceType}</p>
                      {appointment.sessionMode === 'online' ? (
                        <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">
                          {appointment.onlineSession?.url ? `${onlineProviderLabels[appointment.onlineSession.provider]} link ${appointment.onlineSession.visibleToClient ? 'visible' : 'hidden'}` : 'Online link pending'}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => openAppointmentManager(appointment)} className="theme-button-secondary">Manage</button>
                      <button type="button" onClick={() => setNotesClient({ id: appointment.clientId, name: appointment.clientName })} className="theme-button-secondary">Notes</button>
                    </div>
                  </div>
                  {appointment.notes ? <p className="mt-4 text-sm leading-7 text-[rgb(var(--theme-muted-rgb))]">Notes: {appointment.notes}</p> : null}
                </article>
              )) : (
                <EmptyState
                  title="No appointments match these filters"
                  description="No results for the selected filters."
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
                description="Working hours, one-off slots, and date clearing."
              />
              <label className="admin-field">
                <span className="admin-field__label">Date to edit</span>
                <input aria-label="Selected availability date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="theme-input" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="admin-field">
                  <span className="admin-field__label">Day start time</span>
                  <input aria-label="Availability start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Day end time</span>
                  <input aria-label="Availability end time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="theme-input" />
                </label>
              </div>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={handleGenerateDay} className="theme-button-primary">Generate day</button><button type="button" onClick={handleClearSelectedDate} className="theme-button-secondary">Clear date</button></div>
              <div className="flex items-end gap-3">
                <label className="admin-field flex-1">
                  <span className="admin-field__label">Single slot time</span>
                  <input aria-label="New availability slot time" type="time" value={newSlot} onChange={(event) => setNewSlot(event.target.value)} className="theme-input" />
                </label>
                <button type="button" onClick={handleAddSlot} className="theme-button-secondary">Add slot</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {currentSlots.length > 0 ? currentSlots.map((slot) => <div key={slot} className="theme-panel-soft flex items-center justify-between p-3"><span>{slot}</span><button type="button" onClick={() => handleRemoveSlot(slot)} className="text-sm text-rose-600">Remove</button></div>) : <EmptyState title="No slots published for this date" description="No available times on the selected date." />}
              </div>
            </section>
            <section className="space-y-8">
              <div className="theme-panel p-8 space-y-4">
                <SectionHeader
                  eyebrow="Bulk tools"
                  title="Range and recurring schedules"
                  description="Bulk dates, weekly repeats, and blocked ranges."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="admin-field">
                    <span className="admin-field__label">Availability range start</span>
                    <input aria-label="Availability range start date" type="date" value={rangeStartDate} onChange={(event) => setRangeStartDate(event.target.value)} className="theme-input" />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field__label">Availability range end</span>
                    <input aria-label="Availability range end date" type="date" value={rangeEndDate} onChange={(event) => setRangeEndDate(event.target.value)} className="theme-input" />
                  </label>
                </div>
                <button type="button" onClick={handleGenerateRange} className="theme-button-primary">Generate range</button>
                <div className="space-y-2">
                  <p className="admin-field__label">Weekdays for recurring availability</p>
                <div className="flex flex-wrap gap-2">{weekdayLabels.map((label, index) => <button key={label} type="button" onClick={() => toggleWeekday(index, setRecurringWeekdays)} className={`rounded-full px-3 py-2 text-sm ${recurringWeekdays.includes(index) ? 'bg-[rgb(var(--theme-primary-rgb))] text-white' : 'theme-panel-soft'}`}>{label}</button>)}</div>
                </div>
                <button type="button" onClick={handleGenerateRecurring} className="theme-button-secondary">Generate recurring</button>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="admin-field">
                    <span className="admin-field__label">Blocked range start</span>
                    <input aria-label="Blocked range start date" type="date" value={blockStartDate} onChange={(event) => setBlockStartDate(event.target.value)} className="theme-input" />
                  </label>
                  <label className="admin-field">
                    <span className="admin-field__label">Blocked range end</span>
                    <input aria-label="Blocked range end date" type="date" value={blockEndDate} onChange={(event) => setBlockEndDate(event.target.value)} className="theme-input" />
                  </label>
                </div>
                <label className="admin-field">
                  <span className="admin-field__label">Block reason</span>
                  <textarea aria-label="Reason for blocking dates" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} rows={3} className="theme-textarea" placeholder="Reason for blocking dates" />
                </label>
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
                title="Client directory"
                description="Profiles, booking history, notes, and actions."
              />
              <label className="admin-field">
                <span className="admin-field__label">Client search</span>
                <input aria-label="Search clients" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Search clients..." className="theme-input" />
              </label>
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={`w-full rounded-[calc(var(--theme-radius-md)+0.08rem)] border px-4 py-4 text-left ${selectedClientId === client.id ? 'border-[rgb(var(--theme-primary-rgb)/0.55)] bg-[rgb(var(--theme-primary-rgb)/0.08)]' : 'border-[rgb(var(--theme-line-rgb)/0.2)] bg-[rgb(var(--theme-surface-rgb)/0.6)]'}`}>
                  <p className="font-semibold">{client.name || 'Client'}</p>
                  <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{client.email}</p>
                </button>
              )) : <EmptyState title="No matching clients" description="No clients match this search." />}
            </section>
            <section className="theme-panel p-8">
              {selectedClient ? (
                <div className="space-y-5">
                  <SectionHeader
                    eyebrow="Selected client"
                    title={selectedClient.name || 'Client profile'}
                    description="Booking history, appointments, and notes."
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
                        <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{appointment.serviceType} - {appointment.status}{appointment.sessionMode === 'online' ? ' - online' : ''}</p>
                      </div>
                    )) : <EmptyState title="No bookings for this client yet" description="No client appointment records." />}
                  </div>
                </div>
              ) : <p className="text-sm text-[rgb(var(--theme-muted-rgb))]">Select a client.</p>}
            </section>
          </div>
        )}

        {activeTab === 'website' && (
          <div id="admin-tab-panel-website" role="tabpanel" aria-labelledby="admin-tab-website">
            <Suspense
              fallback={
                <section className="theme-panel p-8">
                  <div className="theme-panel-soft min-h-[8rem] animate-pulse" />
                </section>
              }
            >
              <WebsiteSettingsPanel adminId={user?.uid} adminEmail={user?.email || 'unknown'} />
            </Suspense>
          </div>
        )}

        {activeTab === 'media' && (
          <div id="admin-tab-panel-media" role="tabpanel" aria-labelledby="admin-tab-media" className="space-y-8">
            <section className="theme-panel p-8">
              <SectionHeader
                eyebrow="Media"
                title="Website media"
                description="Library uploads, labels, and live media slots."
              />
              <div className="admin-media-upload-grid">
                <label className="admin-field">
                  <span className="admin-field__label">Image file</span>
                  <input type="file" accept="image/*" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Media display label</span>
                  <input value={uploadLabel} onChange={(event) => setUploadLabel(event.target.value)} placeholder="Homepage hero 01" className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Media category</span>
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
                    <label className="admin-field">
                      <span className="admin-field__label">Media label</span>
                      <input aria-label={`Label for ${asset.label}`} value={mediaDrafts[asset.id]?.label || asset.label} onChange={(event) => setMediaDrafts((current) => ({ ...current, [asset.id]: { label: event.target.value, category: current[asset.id]?.category || asset.category } }))} className="theme-input" />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field__label">Media category</span>
                      <input aria-label={`Category for ${asset.label}`} value={mediaDrafts[asset.id]?.category || asset.category} onChange={(event) => setMediaDrafts((current) => ({ ...current, [asset.id]: { label: current[asset.id]?.label || asset.label, category: event.target.value } }))} className="theme-input" />
                    </label>
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
              )}) : <EmptyState title="No media uploaded yet" description="No media library assets." />}
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div id="admin-tab-panel-admins" role="tabpanel" aria-labelledby="admin-tab-admins" className="grid gap-8 xl:grid-cols-2">
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Admins"
                title="Current admins"
                description="Full access accounts."
              />
              {adminUsers.length > 0 ? adminUsers.map((entry) => (
                <div key={entry.id} className="theme-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{entry.name || 'Admin'}</p><p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{entry.email}</p></div>
                  {entry.id !== user?.uid ? <button type="button" onClick={() => handleRoleChange(entry, 'client')} className="rounded-full bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Revoke admin</button> : <span className="text-xs uppercase tracking-[0.16em] text-[rgb(var(--theme-muted-rgb))]">Current session</span>}
                </div>
              )) : <EmptyState title="No admins found" description="No admin accounts found." />}
            </section>
            <section className="theme-panel p-8 space-y-4">
              <SectionHeader
                eyebrow="Permissions"
                title="User permissions"
                description="Signed-in user role management."
              />
              <label className="admin-field">
                <span className="admin-field__label">User search</span>
                <input aria-label="Search users to promote" value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search users..." className="theme-input" />
              </label>
              {filteredUsersForAdmin.length > 0 ? filteredUsersForAdmin.map((entry) => (
                <div key={entry.id} className="theme-panel-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold">{entry.name || 'User'}</p><p className="text-sm text-[rgb(var(--theme-muted-rgb))]">{entry.email}</p></div>
                  {entry.role === 'admin' ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Admin</span> : <button type="button" onClick={() => handleRoleChange(entry, 'admin')} className="theme-button-primary">Promote to admin</button>}
                </div>
              )) : <EmptyState title="No users match this search" description="No users match this search." />}
            </section>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div id="admin-tab-panel-analytics" role="tabpanel" aria-labelledby="admin-tab-analytics" className="grid gap-8 xl:grid-cols-2">
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Analytics"
                title="Service demand"
                description="Appointments by service type."
              />
              {serviceDemand.length > 0 ? serviceDemand.map((entry) => <div key={entry.serviceType} className="theme-panel-soft flex items-center justify-between p-4"><p className="font-medium">{entry.serviceType}</p><p className="text-lg font-semibold">{entry.count}</p></div>) : <EmptyState title="No service data yet" description="No appointment service records." />}
            </section>
            <section className="theme-panel p-8 space-y-3">
              <SectionHeader
                eyebrow="Trend"
                title="Booking trend"
                description="Monthly booking volume."
              />
              {monthlyTrend.length > 0 ? monthlyTrend.map(([month, count]) => <div key={month} className="theme-panel-soft flex items-center justify-between p-4"><p className="font-medium">{month}</p><p className="text-lg font-semibold">{count}</p></div>) : <EmptyState title="No trend data yet" description="No monthly booking records." />}
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <section id="admin-tab-panel-settings" role="tabpanel" aria-labelledby="admin-tab-settings" className="theme-panel mx-auto max-w-3xl p-8">
            <SectionHeader
              eyebrow="Practice settings"
              title="Default scheduling rules"
              description="Days off, session duration, and buffer time."
            />
            <form onSubmit={handleSavePracticeSettings} className="space-y-6">
              <div className="space-y-2">
                <p className="admin-field__label">Days off</p>
                <div className="flex flex-wrap gap-3">
                {weekdayLabels.map((label, index) => <button key={label} type="button" onClick={() => setSettings((current) => ({ ...current, daysOff: current.daysOff.includes(index) ? current.daysOff.filter((entry) => entry !== index) : [...current.daysOff, index].sort() }))} className={`rounded-full px-4 py-2 text-sm font-medium ${settings.daysOff.includes(index) ? 'bg-rose-50 text-rose-600' : 'theme-panel-soft'}`}>{label}</button>)}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="admin-field">
                  <span className="admin-field__label">Session duration minutes</span>
                  <input aria-label="Default session duration in minutes" type="number" min="15" step="15" value={settings.defaultDuration} onChange={(event) => setSettings((current) => ({ ...current, defaultDuration: Number(event.target.value) || 45 }))} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Buffer time minutes</span>
                  <input aria-label="Buffer time in minutes" type="number" min="0" step="5" value={settings.bufferTime} onChange={(event) => setSettings((current) => ({ ...current, bufferTime: Number(event.target.value) || 0 }))} className="theme-input" />
                </label>
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
              description="Logged admin actions, timestamps, and actor details."
            />
            {auditLogs.length > 0 ? auditLogs.map((log) => (
              <article key={log.id} className="theme-panel p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-semibold">{log.action}</p>
                    <p className="mt-2 text-sm text-[rgb(var(--theme-muted-rgb))]">{log.details}</p>
                  </div>
                  <div className="text-sm text-[rgb(var(--theme-muted-rgb))]"><p>{log.adminEmail}</p><p>{formatAuditTimestamp(log.timestamp)}</p></div>
                </div>
              </article>
            )) : <EmptyState title="No audit entries yet" description="No logged admin actions." />}
          </section>
        )}

      </div>

      {composerOpen && (
        <ModalShell title="Create booking for a client" onClose={() => setComposerOpen(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="admin-field">
              <span className="admin-field__label">Client</span>
              <select aria-label="Client for the new booking" value={composerState.clientId} onChange={(event) => setComposerState((current) => ({ ...current, clientId: event.target.value }))} className="theme-select"><option value="">Select client</option>{clientUsers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || entry.email} - {entry.email}</option>)}</select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Appointment date</span>
              <input aria-label="Booking date" type="date" value={composerState.date} onChange={(event) => setComposerState((current) => ({ ...current, date: event.target.value, timeSlot: '' }))} className="theme-input" />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Available time slot</span>
              <select aria-label="Booking time slot" value={composerState.timeSlot} onChange={(event) => setComposerState((current) => ({ ...current, timeSlot: event.target.value }))} className="theme-select"><option value="">Select slot</option>{composerSlots.map((slot) => <option key={slot} value={slot}>{formatSlot(slot)}</option>)}</select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Service type</span>
              <input aria-label="Service type" value={composerState.serviceType} onChange={(event) => setComposerState((current) => ({ ...current, serviceType: event.target.value }))} placeholder="Service type" className="theme-input" />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Session type</span>
              <select aria-label="Session type" value={composerState.sessionMode} onChange={(event) => setComposerState((current) => ({ ...current, sessionMode: event.target.value as ComposerState['sessionMode'] }))} className="theme-select">
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
            </label>
          </div>
          {composerState.sessionMode === 'online' ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="admin-field">
                <span className="admin-field__label">Meeting provider</span>
                <select aria-label="Meeting provider" value={composerState.onlineProvider} onChange={(event) => setComposerState((current) => ({ ...current, onlineProvider: event.target.value as ComposerState['onlineProvider'] }))} className="theme-select">
                  {Object.entries(onlineProviderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Meeting link</span>
                <input aria-label="Meeting link" type="url" value={composerState.onlineUrl} onChange={(event) => setComposerState((current) => ({ ...current, onlineUrl: event.target.value }))} placeholder="https://..." className="theme-input" />
              </label>
              <label className="admin-field md:col-span-2">
                <span className="admin-field__label">Join notes</span>
                <textarea aria-label="Join notes" value={composerState.onlineNotes} onChange={(event) => setComposerState((current) => ({ ...current, onlineNotes: event.target.value }))} rows={3} className="theme-textarea" placeholder="Optional joining details" />
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--theme-text-rgb))] md:col-span-2">
                <input type="checkbox" checked={composerState.onlineVisibleToClient} onChange={(event) => setComposerState((current) => ({ ...current, onlineVisibleToClient: event.target.checked }))} />
                Show meeting link in client dashboard
              </label>
            </div>
          ) : null}
          <label className="admin-field mt-4">
            <span className="admin-field__label">Internal booking notes</span>
            <textarea aria-label="Internal booking notes" value={composerState.notes} onChange={(event) => setComposerState((current) => ({ ...current, notes: event.target.value }))} rows={4} className="theme-textarea" placeholder="Notes" />
          </label>
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
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment, 'scheduled')} className="theme-button-secondary">Keep scheduled</button>
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment, 'completed')} className="theme-button-secondary">Mark completed</button>
              <button type="button" onClick={() => handleStatusUpdate(selectedAppointment, 'cancelled')} className="rounded-full bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600">Cancel appointment</button>
            </div>
            <div className="theme-panel-soft p-5">
              <p className="font-semibold">Online session</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="admin-field">
                  <span className="admin-field__label">Session type</span>
                  <select aria-label="Managed appointment session type" value={sessionModeDraft} onChange={(event) => setSessionModeDraft(event.target.value as AppointmentRecord['sessionMode'])} className="theme-select">
                    <option value="in_person">In person</option>
                    <option value="online">Online</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Meeting provider</span>
                  <select aria-label="Managed appointment meeting provider" value={onlineProviderDraft} onChange={(event) => setOnlineProviderDraft(event.target.value as typeof onlineProviderDraft)} disabled={sessionModeDraft !== 'online'} className="theme-select disabled:opacity-60">
                    {Object.entries(onlineProviderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="admin-field md:col-span-2">
                  <span className="admin-field__label">Meeting link</span>
                  <input aria-label="Managed appointment meeting link" type="url" value={onlineUrlDraft} onChange={(event) => setOnlineUrlDraft(event.target.value)} disabled={sessionModeDraft !== 'online'} placeholder="https://..." className="theme-input disabled:opacity-60" />
                </label>
                <label className="admin-field md:col-span-2">
                  <span className="admin-field__label">Join notes</span>
                  <textarea aria-label="Managed appointment join notes" value={onlineNotesDraft} onChange={(event) => setOnlineNotesDraft(event.target.value)} disabled={sessionModeDraft !== 'online'} rows={3} className="theme-textarea disabled:opacity-60" placeholder="Optional joining details" />
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--theme-text-rgb))] md:col-span-2">
                  <input type="checkbox" checked={onlineVisibleDraft} onChange={(event) => setOnlineVisibleDraft(event.target.checked)} disabled={sessionModeDraft !== 'online'} />
                  Show meeting link in client dashboard
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={handleOnlineSessionSave} disabled={isBusy} className="theme-button-secondary disabled:opacity-50">Save online session</button>
              </div>
            </div>
            <div className="theme-panel-soft p-5">
              <p className="font-semibold">Reschedule</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="admin-field">
                  <span className="admin-field__label">New appointment date</span>
                  <input aria-label="New appointment date" type="date" value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleTime(''); }} className="theme-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">New available time slot</span>
                  <select aria-label="New appointment time slot" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="theme-select"><option value="">Select new slot</option>{rescheduleSlots.map((slot) => <option key={slot} value={slot}>{formatSlot(slot)}</option>)}</select>
                </label>
              </div>
              <div className="mt-4 flex justify-end"><button type="button" onClick={handleAdminReschedule} disabled={!rescheduleTime || isBusy} className="theme-button-primary disabled:opacity-50">Reschedule appointment</button></div>
            </div>
          </div>
        </ModalShell>
      )}

      {notesClient && (
        <Suspense fallback={null}>
          <ClientNotesModal isOpen={!!notesClient} onClose={() => setNotesClient(null)} clientId={notesClient.id} clientName={notesClient.name} />
        </Suspense>
      )}
    </div>
  );
}
