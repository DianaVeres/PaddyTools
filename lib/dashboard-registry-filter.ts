import { foldSearchText } from '@/lib/global-search';
import type { IncidentRecord as Incident } from '@/lib/incident-record';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';

export function filterIncidentRegistry(
  rows: Incident[],
  filter: string,
  pickupsOnly: boolean,
  showReceived: boolean,
) {
  const term = foldSearchText(filter);
  return rows.filter((row) => {
    // El registro operativo muestra únicamente incidencias pendientes. Las
    // solucionadas siguen conservadas y disponibles desde la consulta global.
    if (!pickupsOnly && row.solved && !term) return false;
    if (pickupsOnly && !showReceived && row.pickupReceived) return false;
    if (!term) return true;
    return foldSearchText(
      [
        row.orderNumber,
        row.customerName,
        row.school,
        row.pickupSchoolName,
        row.incidentText,
        row.pickupDetails,
      ].join(' '),
    ).includes(term);
  });
}

export function filterReservationRegistry(
  rows: MondayRecord[],
  filter: string,
) {
  const term = foldSearchText(filter);
  if (!term) return rows;
  return rows.filter((row) =>
    foldSearchText(
      [
        row.reference,
        row.customer,
        row.phone,
        row.school,
        row.articleDescription,
        row.size,
        row.status,
      ].join(' '),
    ).includes(term),
  );
}
