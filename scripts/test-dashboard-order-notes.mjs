import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-notes-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const hotlineCard = readFileSync(
  resolve(root, 'components/dashboard/hotline-contacts-card.tsx'),
  'utf8',
);

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
  '<HotlineContactsCard',
  'contacts={hotlineContacts}',
  'loading={hotlineLoading}',
  'error={hotlineError}',
  'orderNotes.length + hotlineContacts.length',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a las notas: ${prop}`);
}
for (const fragment of ['Mensaje recibido', 'Respuesta enviada', 'contact.consulta', 'contact.respuesta']) {
  if (!hotlineCard.includes(fragment))
    throw new Error(`Los emails de Hotline han perdido: ${fragment}`);
}

console.log('Notas del pedido verificadas.');
