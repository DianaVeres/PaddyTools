import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-notes-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderNotesCard',
  'Notas de seguimiento',
  'onKindChange',
  'onDraftChange',
  'onSave',
  'notes.map',
  'note.kind',
  'note.createdAt',
  'note.content',
  'note.authorName',
  'onDelete(note)',
  'deletingId === note.id',
]) {
  if (!component.includes(fragment))
    throw new Error(`Las notas del pedido han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-notes-card"))
  throw new Error('La pantalla no usa la tarjeta compartida de notas del pedido.');
for (const prop of [
  'notes={orderNotes}',
  'loading={notesLoading}',
  'onSave={() => void saveOrderNote()}',
  'onDelete={(note) => void deleteOrderNote(note)}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a las notas: ${prop}`);
}

console.log('Notas del pedido verificadas.');
