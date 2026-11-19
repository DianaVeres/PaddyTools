import { MessageSquarePlus } from 'lucide-react';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { MondayUpdate } from '@/lib/dashboard-types';

export function MondayUpdatesCard({
  updates,
  loading,
  emptyMessage = 'No hay comentarios en Monday para este registro.',
}: {
  updates: MondayUpdate[];
  loading: boolean;
  emptyMessage?: string;
}) {
  return (
    <section className="monday-updates">
      <div className="notes-source-title">
        <b>Comentarios de Monday</b>
        <span>{updates.length}</span>
      </div>
      {loading ? (
        <p className="notes-empty">Cargando comentarios de Monday…</p>
      ) : updates.length ? (
        <div className="notes-list">
          {updates.map((update) => (
            <article className="note-row monday-note" key={update.id}>
              <span className="note-icon monday">
                <MessageSquarePlus />
              </span>
              <div>
                <div className="note-head">
                  <b>{update.author || 'Monday'}</b>
                  <time>{fmt(update.createdAt)}</time>
                </div>
                <p>{update.text}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="notes-empty">{emptyMessage}</p>
      )}
    </section>
  );
}
