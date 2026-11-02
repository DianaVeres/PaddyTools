import { ClipboardList } from 'lucide-react';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { DashboardOrder as Order } from '@/lib/dashboard-types';
import type { IncidentRecord as Incident } from '@/lib/incident-record';
import type { OrderNoteRecord as OrderNote } from '@/lib/order-note';

export function OrderActivity({
  order,
  notes,
  incident,
}: {
  order: Order;
  notes: OrderNote[];
  incident: Incident | null;
}) {
  return (
    <aside className="side-column">
      <section className="side-card">
        <div className="side-title">
          <ClipboardList />
          <div>
            <h3>Actividad</h3>
            <p>Información disponible</p>
          </div>
        </div>
        <div className="timeline">
          {notes.map((note) => (
            <div className="timeline-row" key={note.id}>
              <i className="blue" />
              <div>
                <time>{fmt(note.createdAt)}</time>
                <b>
                  {note.kind === 'llamada'
                    ? 'Llamada'
                    : note.kind === 'email'
                      ? 'Email'
                      : 'Nota de seguimiento'}
                </b>
                <span>{note.content}</span>
                {note.authorName && <small>Por {note.authorName}</small>}
              </div>
            </div>
          ))}
          {incident && (
            <div className="timeline-row">
              <i className="amber" />
              <div>
                <time>{incident.incidentDate}</time>
                <b>Incidencia {incident.solved ? 'resuelta' : 'pendiente'}</b>
                <span>{incident.incidentText}</span>
              </div>
            </div>
          )}
          <div className="timeline-row">
            <i className="green" />
            <div>
              <time>{fmt(order.dateModified)}</time>
              <b>{order.statusLabel}</b>
              <span>Última actualización en WooCommerce</span>
            </div>
          </div>
          <div className="timeline-row">
            <i className="slate" />
            <div>
              <time>{fmt(order.dateCreated)}</time>
              <b>Pedido recibido</b>
              <span>WooCommerce</span>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
