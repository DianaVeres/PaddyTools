import { CalendarDays } from 'lucide-react';
import {
  formatIncidentDate,
  incidentLabelLines,
  incidentStatusLabel,
  type IncidentRecord as Incident,
} from '@/lib/incident-record';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';

const labelSizeFor = (text: string) =>
  text.length > 46
    ? 11
    : text.length > 40
      ? 12.5
      : text.length > 34
        ? 14.5
        : 17;

const printDate = (value: string) => {
  const raw = value?.slice(0, 10) || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`
    : value || 'No indicada';
};

export function IncidentLabel({ incident }: { incident: Incident }) {
  return (
    <article className="incident-label">
      {incidentLabelLines(incident).map((line) => (
        <p key={line} style={{ fontSize: `${labelSizeFor(line)}pt` }}>
          {line.toUpperCase()}
        </p>
      ))}
    </article>
  );
}

export function IncidentDocument({ incident }: { incident: Incident }) {
  return (
    <article className="incident-document">
      <header>
        <div>
          <span>PADDYTOOLS</span>
          <h1>Incidencia de pedido</h1>
        </div>
        <b>#{incident.orderNumber}</b>
      </header>
      <section className="document-meta">
        <div><small>Fecha</small><b>{formatIncidentDate(incident.incidentDate)}</b></div>
        <div><small>Estado</small><b>{incidentStatusLabel(incident)}</b></div>
        <div><small>Colegio</small><b>{incident.school || incident.pickupSchoolName || 'No indicado'}</b></div>
      </section>
      <section>
        <h2>Cliente</h2>
        <p><b>{incident.customerName || 'No indicado'}</b><br />
          {[incident.customerPhone, incident.customerEmail].filter(Boolean).join(' · ')}</p>
      </section>
      <section><h2>Incidencia</h2><p>{incident.incidentText || 'Sin descripción'}</p></section>
      {incident.observations && <section><h2>Observaciones</h2><p>{incident.observations}</p></section>}
      {incident.pickupSchool && (
        <section className="document-pickup">
          <h2>Recoger en el colegio</h2>
          <p><b>{incident.pickupSchoolName || 'Colegio sin indicar'} ·{' '}
            {incident.pickupReceived ? 'RECIBIDO' : 'PENDIENTE'}</b></p>
          <p>{incident.pickupDetails || 'Sin detalle de prendas'}</p>
          {incident.pickupReceivedAt && <small>Fecha de recepción: {incident.pickupReceivedAt.replace('T', ' ')}</small>}
        </section>
      )}
    </article>
  );
}

export function ReservationPrintCard({ record }: { record: MondayRecord }) {
  return (
    <article className="reservation-print-card">
      <div className="reservation-print-accent"><CalendarDays /></div>
      <div className="reservation-print-content">
        <span>MONDAY · REGISTRO RESERVAS</span>
        <h2>Reserva {record.reference || record.id || 'registrada'}</h2>
        <dl>
          <div><dt>Número de reserva</dt><dd>{record.reference || record.id || 'No indicado'}</dd></div>
          <div><dt>Estado</dt><dd>{record.status || 'Sin estado'}</dd></div>
          <div><dt>Cliente</dt><dd>{record.customer || 'No indicado'}</dd></div>
          <div><dt>Teléfono</dt><dd>{record.phone || 'No indicado'}</dd></div>
          <div><dt>Colegio</dt><dd>{record.school || 'No indicado'}</dd></div>
          <div><dt>Fecha de reserva</dt><dd>{printDate(record.date)}</dd></div>
          <div><dt>Código</dt><dd>{record.code || 'No indicado'}</dd></div>
          <div className="wide"><dt>Descripción del artículo</dt><dd>{record.articleDescription || record.article || 'No indicada'}</dd></div>
          <div><dt>Talla</dt><dd>{record.size || 'No indicada'}</dd></div>
          <div><dt>Unidades</dt><dd>{record.units || 'No indicadas'}</dd></div>
          <div><dt>Unidades pendientes</dt><dd>{record.pending || 'No indicadas'}</dd></div>
          <div><dt>Pagada</dt><dd>{record.paid || 'No indicado'}</dd></div>
          <div className="wide"><dt>Observaciones</dt><dd>{record.observations || 'Sin observaciones'}</dd></div>
          <div className="wide"><dt>Última actualización en Monday</dt><dd>{printDate(record.updatedAt)}</dd></div>
        </dl>
      </div>
    </article>
  );
}

export function ReservationLabel({ record }: { record: MondayRecord }) {
  const lines = [
    `RESERVA ${record.reference}`,
    `NOMBRE: ${record.customer || 'SIN NOMBRE'}`,
    `FECHA: ${printDate(record.updatedAt)}`,
    `COLEGIO: ${record.school || 'SIN COLEGIO'}`,
  ];
  return (
    <article className="reservation-label">
      {lines.map((line) => (
        <p key={line} style={{ fontSize: `${labelSizeFor(line)}pt` }}>{line.toUpperCase()}</p>
      ))}
    </article>
  );
}
