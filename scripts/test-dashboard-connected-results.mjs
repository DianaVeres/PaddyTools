import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/connected-results.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'ConnectedResults',
  'incident?.orderNumber',
  'mondayRecords[0]?.reference',
  'IncidentCard',
  'MondayCards',
  "record.kind === 'reserva'",
  'ReservationNotesCard',
  'mondayUpdates={mondayUpdates}',
  'onSave={onSaveNote}',
  'onDelete={onDeleteNote}',
  'onCreateIncident',
  '<CreateIncidentButton onClick={onCreateIncident} />',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los resultados conectados han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/connected-results"))
  throw new Error('La pantalla no usa los resultados conectados compartidos.');
for (const prop of [
  'mondayRecords={mondayRecords}',
  'notes={orderNotes}',
  'mondayUpdates={mondayUpdates}',
  'onPrintIncident={printIncidentDocument}',
  'onPrintReservation={requestReservationPrint}',
  'onEmailReservation={openReservationEmail}',
  'onSaveNote={() => void saveOrderNote()}',
  'onDeleteNote={(note) => void deleteOrderNote(note)}',
  'onCreateIncident={openIncidentWorkspace}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a los resultados: ${prop}`);
}

console.log('Resultados conectados verificados.');
