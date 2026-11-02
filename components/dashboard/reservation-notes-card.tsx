import { Mail, MessageSquarePlus, Phone, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { MondayUpdate } from '@/lib/dashboard-types';
import type { OrderNoteRecord as OrderNote } from '@/lib/order-note';

export function ReservationNotesCard({
  notes,
  loading,
  mondayUpdates,
  mondayLoading,
  kind,
  draft,
  deletingId,
  onKindChange,
  onDraftChange,
  onSave,
  onDelete,
}: {
  notes: OrderNote[];
  loading: boolean;
  mondayUpdates: MondayUpdate[];
  mondayLoading: boolean;
  kind: OrderNote['kind'];
  draft: string;
  deletingId: string;
  onKindChange: (kind: OrderNote['kind']) => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onDelete: (note: OrderNote) => void;
}) {
  return (
    <article className="info-card notes-card reservation-notes-card">
      <div className="card-title">
        <MessageSquarePlus />
        <div>
          <h3>Notas de la reserva</h3>
          <p>Anotaciones compartidas del equipo para esta reserva</p>
        </div>
      </div>
      <section className="monday-updates">
        <div className="notes-source-title">
          <b>Comentarios de Monday</b>
          <span>{mondayUpdates.length}</span>
        </div>
        {mondayLoading ? (
          <p className="notes-empty">Cargando comentarios de Monday…</p>
        ) : mondayUpdates.length ? (
          <div className="notes-list">
            {mondayUpdates.map((update) => (
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
          <p className="notes-empty">
            Esta reserva no tiene comentarios en Monday.
          </p>
        )}
      </section>
      <div className="notes-source-title paddytools-notes-title">
        <b>Notas internas de PaddyTools</b>
        <span>{notes.length}</span>
      </div>
      <div className="note-composer">
        <select
          value={kind}
          onChange={(event) =>
            onKindChange(event.target.value as OrderNote['kind'])
          }
          aria-label="Tipo de nota"
        >
          <option value="nota">Nota</option>
          <option value="llamada">Llamada</option>
          <option value="email">Email</option>
        </select>
        <Textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ejemplo: Ha llamado para consultar la fecha de entrega…"
          rows={3}
        />
        <Button onClick={onSave} disabled={!draft.trim()}>
          Guardar nota
        </Button>
      </div>
      <div className="notes-list">
        {loading ? (
          <p className="notes-empty">Cargando notas…</p>
        ) : notes.length ? (
          notes.map((note) => (
            <article className="note-row" key={note.id}>
              <span className={`note-icon ${note.kind}`}>
                {note.kind === 'llamada' ? (
                  <Phone />
                ) : note.kind === 'email' ? (
                  <Mail />
                ) : (
                  <MessageSquarePlus />
                )}
              </span>
              <div>
                <div className="note-head">
                  <b>
                    {note.kind === 'llamada'
                      ? 'Llamada'
                      : note.kind === 'email'
                        ? 'Email'
                        : 'Nota'}
                  </b>
                  <span className="note-head-actions">
                    <time>{fmt(note.createdAt)}</time>
                    <button
                      type="button"
                      className="note-delete"
                      onClick={() => onDelete(note)}
                      disabled={Boolean(deletingId)}
                      aria-label="Eliminar nota"
                      title="Eliminar nota"
                    >
                      {deletingId === note.id ? (
                        <RefreshCw className="spin" />
                      ) : (
                        <Trash2 />
                      )}
                    </button>
                  </span>
                </div>
                <p>{note.content}</p>
                {note.authorName && <small>Por {note.authorName}</small>}
              </div>
            </article>
          ))
        ) : (
          <p className="notes-empty">Todavía no hay notas en esta reserva.</p>
        )}
      </div>
    </article>
  );
}
