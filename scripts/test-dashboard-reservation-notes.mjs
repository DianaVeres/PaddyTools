import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-notes-card.tsx'),
  'utf8',
);
const mondayCard = readFileSync(
  resolve(root, 'components/dashboard/monday-updates-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const connected = readFileSync(
  resolve(root, 'components/dashboard/connected-results.tsx'),
  'utf8',
);
const connectedResults = readFileSync(
  resolve(root, 'components/dashboard/connected-results.tsx'),
  'utf8',
);

for (const fragment of [
  'ReservationNotesCard',
  'Notas internas de PaddyTools',
  'MondayUpdatesCard',
  'notes.map',
  'onKindChange',
  'onDraftChange',
  'onSave',
  'onDelete(note)',
  'deletingId === note.id',
]) {
  if (!component.includes(fragment))
    throw new Error(`Las notas de reserva han perdido: ${fragment}`);
}
for (const fragment of ['Comentarios de Monday', 'updates.map', 'update.text']) {
  if (!mondayCard.includes(fragment))
    throw new Error(`Los comentarios compartidos de Monday han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/connected-results"))
  throw new Error('La pantalla no usa los resultados conectados compartidos.');
if (!connectedResults.includes("@/components/dashboard/reservation-notes-card"))
  throw new Error('Los resultados conectados han perdido las notas de reserva.');
if (page.includes('function ReservationNotesCard('))
  throw new Error('La pantalla ha recuperado una tarjeta duplicada de notas.');

console.log('Tarjeta de notas de reserva verificada.');

for (const fragment of [
  'HotlineContactsCard',
  'contacts={hotlineContacts}',
  'loading={hotlineLoading}',
  'error={hotlineError}',
]) {
  if (!connected.includes(fragment))
    throw new Error(`Las reservas han perdido su historial de Hotline: ${fragment}`);
}
if (!page.includes("mondayRecords.find((record) => record.kind === 'reserva')?.reference"))
  throw new Error('Hotline no consulta la referencia de las reservas.');
