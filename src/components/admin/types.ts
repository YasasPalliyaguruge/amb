export type AdminTab =
  | 'overview'
  | 'appointments'
  | 'availability'
  | 'clients'
  | 'website'
  | 'media'
  | 'admins'
  | 'analytics'
  | 'settings'
  | 'audit';

export interface AppointmentRecord {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  sessionMode?: 'in_person' | 'online';
  onlineSession?: OnlineSession | null;
}

export interface OnlineSession {
  provider: 'zoom' | 'teams' | 'google_meet' | 'jitsi' | 'other';
  url: string;
  visibleToClient: boolean;
  notes: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  role: 'client' | 'admin';
}

export interface AvailabilityRecord {
  id: string;
  slots: string[];
  blocked?: boolean;
  blockedReason?: string | null;
}

export interface PracticeSettings {
  daysOff: number[];
  bufferTime: number;
  defaultDuration: number;
}

export interface ComposerState {
  clientId: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  notes: string;
  sessionMode: 'in_person' | 'online';
  onlineProvider: OnlineSession['provider'];
  onlineUrl: string;
  onlineVisibleToClient: boolean;
  onlineNotes: string;
}

export const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'availability', label: 'Availability' },
  { id: 'clients', label: 'Clients' },
  { id: 'website', label: 'Website' },
  { id: 'media', label: 'Media' },
  { id: 'admins', label: 'Admins' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Practice Settings' },
  { id: 'audit', label: 'Audit' },
];

export function isAdminTab(value: string | null): value is AdminTab {
  return adminTabs.some((tab) => tab.id === value);
}

export const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
