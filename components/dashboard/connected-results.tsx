import { IncidentCard } from '@/components/dashboard/incident-card';
import { CreateIncidentButton } from '@/components/dashboard/create-incident-button';
import { MondayCards } from '@/components/dashboard/monday-cards';
import { ReservationNotesCard } from '@/components/dashboard/reservation-notes-card';
import type {
  DashboardMondayRecord as MondayRecord,
  MondayUpdate,
} from '@/lib/dashboard-types';
import type { IncidentRecord as Incident } from '@/lib/incident-record';
import type { OrderNoteRecord as OrderNote } from '@/lib/order-note';

export function ConnectedResults({
  incident,
  mondayRecords,
  notes,
  notesLoading,
  mondayUpdates,
  mondayUpdatesLoading,
  noteKind,
  noteDraft,
  noteDeletingId,
  onPrintIncident,
  onPrintReservation,
  onEmailReservation,
  onNoteKindChange,
  onNoteDraftChange,
  onSaveNote,
  onDeleteNote,
  onCreateIncident,
}: {
  incident: Incident | null;
  mondayRecords: MondayRecord[];
  notes: OrderNote[];
  notesLoading: boolean;
  mondayUpdates: MondayUpdate[];
  mondayUpdatesLoading: boolean;
  noteKind: OrderNote['kind'];
  noteDraft: string;
  noteDeletingId: string;
  onPrintIncident: (incident: Incident) => void;
  onPrintReservation: (
    record: MondayRecord,
    mode?: 'label' | 'card',
  ) => void;
  onEmailReservation: (record: MondayRecord) => void;
  onNoteKindChange: (kind: OrderNote['kind']) => void;
  onNoteDraftChange: (draft: string) => void;
  onSaveNote: () => void;
  onDeleteNote: (note: OrderNote) => void;
  onCreateIncident: () => void;
}) {
  return (
    <div className="workspace">
      <CreateIncidentButton onClick={onCreateIncident} />
      <div className="result-heading">
        <div>
          <span className="result-label">Resultado encontrado</span>
          <div className="title-row">
            <h2>
              Pedido #{incident?.orderNumber || mondayRecords[0]?.reference}
            </h2>
          </div>
          <p>Registros conectados</p>
        </div>
      </div>
      {incident && (
        <IncidentCard
          incident={incident}
          onPrintIncident={onPrintIncident}
        />
      )}
      <MondayCards
        records={mondayRecords}
        onPrintReservation={onPrintReservation}
        onEmailReservation={onEmailReservation}
      />
      {mondayRecords.some((record) => record.kind === 'reserva') && (
        <ReservationNotesCard
          notes={notes}
          loading={notesLoading}
          mondayUpdates={mondayUpdates}
          mondayLoading={mondayUpdatesLoading}
          kind={noteKind}
          draft={noteDraft}
          deletingId={noteDeletingId}
          onKindChange={onNoteKindChange}
          onDraftChange={onNoteDraftChange}
          onSave={onSaveNote}
          onDelete={onDeleteNote}
        />
      )}
    </div>
  );
}
