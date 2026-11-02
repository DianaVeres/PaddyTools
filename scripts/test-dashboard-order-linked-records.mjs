import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-linked-records.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderLinkedRecords',
  'incident={incident}',
  'onPrintIncident={onPrintIncident}',
  'Este pedido no tiene incidencia registrada',
  'No se encontró ninguna coincidencia',
  'records={mondayRecords}',
  'onPrintReservation={onPrintReservation}',
  'onEmailReservation={onEmailReservation}',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los registros conectados han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-linked-records"))
  throw new Error('La pantalla no usa los registros conectados compartidos.');
for (const prop of [
  'incident={incident}',
  'mondayRecords={mondayRecords}',
  'onPrintIncident={printIncidentDocument}',
  'onPrintReservation={requestReservationPrint}',
  'onEmailReservation={openReservationEmail}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a los registros conectados: ${prop}`);
}

console.log('Registros conectados del pedido verificados.');
