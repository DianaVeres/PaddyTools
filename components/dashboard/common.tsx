import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function formatDashboardDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function DashboardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SourceBadge({
  color,
  children,
  active = true,
}: {
  color: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span className="source-badge" style={{ opacity: active ? 1 : 0.62 }}>
      <i style={{ background: color }} />
      {children}
      {active && <Check size={13} />}
    </span>
  );
}
