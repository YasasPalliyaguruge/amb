import { useId, type ReactNode } from 'react';
import { format, parse } from 'date-fns';
import { AlertCircle } from 'lucide-react';

export function formatSlot(slot: string) {
  try {
    return format(parse(slot, 'HH:mm', new Date()), 'h:mm a');
  } catch {
    return slot;
  }
}

export function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'positive' | 'accent';
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'accent'
      ? 'text-[rgb(var(--theme-primary-rgb))]'
      : 'text-[rgb(var(--theme-text-rgb))]';

  return (
    <div className="admin-metric-card">
      <p className="admin-metric-card__label">{label}</p>
      <p className={`admin-metric-card__value ${valueClass}`}>{value}</p>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-section-header">
      <div className="space-y-2">
        {eyebrow ? <p className="admin-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="admin-section-header__title">{title}</h2>
        {description ? <p className="admin-section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-section-header__actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-state__icon">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <p className="admin-empty-state__title">{title}</p>
        <p className="admin-empty-state__description">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'positive' | 'danger' | 'accent';
}) {
  const toneClass =
    tone === 'positive'
      ? 'admin-badge--positive'
      : tone === 'danger'
        ? 'admin-badge--danger'
        : tone === 'accent'
          ? 'admin-badge--accent'
          : 'admin-badge--default';

  return <span className={`admin-badge ${toneClass}`}>{label}</span>;
}

export function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--theme-ink-rgb)/0.42)] p-4 backdrop-blur-sm">
      <div
        className="theme-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-8 shadow-[0_30px_90px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3
            id={headingId}
            className="font-heading text-2xl font-semibold text-[rgb(var(--theme-text-rgb))]"
          >
            {title}
          </h3>
          <button type="button" onClick={onClose} className="theme-button-secondary">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
