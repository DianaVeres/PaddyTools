import { Mail, MessageSquarePlus, Phone, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDashboardDate as fmt } from '@/components/dashboard/common';
import type { OrderNoteRecord as OrderNote } from '@/lib/order-note';

export function OrderNotesCard({
  notes,
  loading,
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
  kind: OrderNote['kind'];
  draft: string;
  deletingId: string;
  onKindChange: (kind: OrderNote['kind']) => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onDelete: (note: OrderNote) => void;
}) {
  return (
    <article className="info-card notes-card">
      <div className="card-title">
        <MessageSquarePlus />
        <div>
          <h3>Notas de seguimiento</h3>
          <p>Llamadas, emails y otras gestiones de este pedido</p>
        </div>
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
          placeholder="Ejemplo: Ha llamado para consultar cuándo estará preparado…"
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
          <p className="notes-empty">Todavía no hay notas en este pedido.</p>
        )}
      </div>
    </article>
  );
}
