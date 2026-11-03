import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'burgundy';
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-card-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
