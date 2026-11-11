import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/print-sheets.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const styles = readFileSync(resolve(root, 'app/globals.css'), 'utf8');

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

const reservationPrintStyles = styles.match(
  /\.reservation-print-sheet\s*\{([\s\S]*?)\}\s*\.reservation-print-sheet \.reservation-print-card\s*\{([\s\S]*?)\}/,
);
if (!reservationPrintStyles)
  throw new Error('Faltan los estilos de impresión de la tarjeta de reserva.');
if (!reservationPrintStyles[1].includes('padding: 0'))
  throw new Error('La hoja de reserva vuelve a añadir relleno fuera del área imprimible.');
if (!reservationPrintStyles[2].includes('width: 100%'))
  throw new Error('La tarjeta de reserva ya no se ajusta al ancho imprimible.');
if (/width:\s*180mm/.test(reservationPrintStyles[2]))
  throw new Error('La tarjeta de reserva vuelve a desbordar una hoja A4.');

console.log('Hojas de impresión verificadas.');
