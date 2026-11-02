import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-notes-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'ReservationNotesCard',
  'Comentarios de Monday',
  'Notas internas de PaddyTools',
  'mondayUpdates.map',
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
if (!page.includes("@/components/dashboard/reservation-notes-card"))
  throw new Error('La pantalla no usa la tarjeta compartida de notas.');
if (page.includes('function ReservationNotesCard('))
  throw new Error('La pantalla ha recuperado una tarjeta duplicada de notas.');

console.log('Tarjeta de notas de reserva verificada.');
