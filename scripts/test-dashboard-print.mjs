import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/print-components.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const printSheets = readFileSync(
  resolve(root, 'components/dashboard/print-sheets.tsx'),
  'utf8',
);
const reservationResult = readFileSync(
  resolve(root, 'components/dashboard/reservation-result-dialog.tsx'),
  'utf8',
);

for (const fragment of [
  'IncidentLabel',
  'IncidentDocument',
  'ReservationLabel',
  'ReservationPrintCard',
  'incidentLabelLines',
  'formatIncidentDate',
  'incidentStatusLabel',
  'MONDAY · REGISTRO RESERVAS',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los impresos del panel han perdido: ${fragment}`);
}
if (
  !page.includes('@/components/dashboard/print-sheets') ||
  !page.includes('@/components/dashboard/reservation-result-dialog') ||
  !printSheets.includes('@/components/dashboard/print-components') ||
  !reservationResult.includes('@/components/dashboard/print-components')
)
  throw new Error('La pantalla no usa los impresos compartidos mediante sus módulos.');
if (page.includes('function IncidentDocument('))
  throw new Error('La pantalla ha recuperado impresos duplicados.');

console.log('Impresos del panel principal verificados.');
