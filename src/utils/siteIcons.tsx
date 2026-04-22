import {
  Activity,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  GalleryVerticalEnd,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { SiteIconKey } from '../siteSettings/siteSettings';

export const siteIconOptions: Array<{ value: SiteIconKey; label: string }> = [
  { value: 'activity', label: 'Activity' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'book', label: 'Book' },
  { value: 'brain', label: 'Brain' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'check', label: 'Check' },
  { value: 'clock', label: 'Clock' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'heart', label: 'Heart' },
  { value: 'lock', label: 'Lock' },
  { value: 'refresh', label: 'Refresh' },
  { value: 'route', label: 'Route' },
  { value: 'shield', label: 'Shield' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'users', label: 'Users' },
];

export const siteIcons = {
  activity: Activity,
  arrow: ArrowRight,
  book: BookOpenText,
  brain: BrainCircuit,
  briefcase: BriefcaseBusiness,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock,
  gallery: GalleryVerticalEnd,
  graduation: GraduationCap,
  heart: HeartHandshake,
  lock: LockKeyhole,
  refresh: RefreshCcw,
  route: Route,
  shield: ShieldCheck,
  sparkles: Sparkles,
  users: Users,
} satisfies Record<SiteIconKey, typeof Activity>;

export function getSiteIcon(icon: SiteIconKey) {
  return siteIcons[icon] || siteIcons.sparkles;
}
