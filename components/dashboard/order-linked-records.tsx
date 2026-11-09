import { Archive } from 'lucide-react';
import { IncidentCard } from '@/components/dashboard/incident-card';
import { MondayCards } from '@/components/dashboard/monday-cards';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';
import type { IncidentRecord as Incident } from '@/lib/incident-record';
import type { HotlineOrderContact } from '@/lib/hotline-order-history';
import { HotlineContactsCard } from '@/components/dashboard/hotline-contacts-card';

export function OrderLinkedRecords({
  incident,
  mondayRecords,
  onPrintIncident,
  onPrintReservation,
  onEmailReservation,
  hotlineContacts,
  hotlineLoading,
  hotlineError,
}: {
  incident: Incident | null;
  mondayRecords: MondayRecord[];
  onPrintIncident: (incident: Incident) => void;
  onPrintReservation: (
    record: MondayRecord,
    mode?: 'label' | 'card',
  ) => void;
  onEmailReservation: (record: MondayRecord) => void;
  hotlineContacts: HotlineOrderContact[];
  hotlineLoading: boolean;
  hotlineError: string;
}) {
  return (
    <>
      {incident ? (
        <IncidentCard
          incident={incident}
          onPrintIncident={onPrintIncident}
        />
      ) : (
        <article className="linked-card empty-linked">
          <div className="linked-accent">
            <Archive />
          </div>
          <div className="linked-main">
            <span className="linked-type">Incidencias</span>
            <h3>Este pedido no tiene incidencia registrada</h3>
            <p>
              No se encontró ninguna coincidencia en el registro compartido.
            </p>
          </div>
        </article>
      )}
      <MondayCards
        records={mondayRecords}
        onPrintReservation={onPrintReservation}
        onEmailReservation={onEmailReservation}
      />
      <HotlineContactsCard
        contacts={hotlineContacts}
        loading={hotlineLoading}
        error={hotlineError}
      />
    </>
  );
}
