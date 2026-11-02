import {
  IncidentDocument,
  IncidentLabel,
  ReservationLabel,
  ReservationPrintCard,
} from '@/components/dashboard/print-components';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';
import type { IncidentRecord as Incident } from '@/lib/incident-record';

export function PrintSheets({
  incident,
  incidentMode,
  reservation,
  reservationMode,
}: {
  incident: Incident | null;
  incidentMode: 'document' | 'label';
  reservation: MondayRecord | null;
  reservationMode: 'card' | 'label';
}) {
  return (
    <>
      {incident && (
        <div
          className={`print-sheet ${incidentMode === 'label' ? 'print-label-sheet' : ''}`}
        >
          {incidentMode === 'label' ? (
            <IncidentLabel incident={incident} />
          ) : (
            <IncidentDocument incident={incident} />
          )}
        </div>
      )}
      {reservation && (
        <div
          className={`print-sheet ${reservationMode === 'label' ? 'reservation-label-sheet' : 'reservation-print-sheet'}`}
        >
          {reservationMode === 'label' ? (
            <ReservationLabel record={reservation} />
          ) : (
            <ReservationPrintCard record={reservation} />
          )}
        </div>
      )}
    </>
  );
}
