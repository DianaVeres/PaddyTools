import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/print-sheets.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'PrintSheets',
  "incidentMode === 'label'",
  'IncidentLabel',
  'IncidentDocument',
  "reservationMode === 'label'",
  'ReservationLabel',
  'ReservationPrintCard',
  'print-label-sheet',
  'reservation-label-sheet',
  'reservation-print-sheet',
]) {
  if (!component.includes(fragment))
    throw new Error(`Las hojas de impresión han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/print-sheets"))
  throw new Error('La pantalla no usa las hojas compartidas de impresión.');
for (const prop of [
  'incident={printIncident}',
  'incidentMode={printMode}',
  'reservation={printReservation}',
  'reservationMode={reservationPrintMode}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a impresión: ${prop}`);
}

console.log('Hojas de impresión verificadas.');
