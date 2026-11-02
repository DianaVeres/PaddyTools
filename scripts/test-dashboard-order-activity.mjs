import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-activity.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderActivity',
  'notes.map',
  'note.createdAt',
  'note.kind',
  'note.content',
  'incident.incidentDate',
  'incident.solved',
  'incident.incidentText',
  'order.dateModified',
  'order.statusLabel',
  'order.dateCreated',
  'Pedido recibido',
]) {
  if (!component.includes(fragment))
    throw new Error(`La actividad del pedido ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-activity"))
  throw new Error('La pantalla no usa la actividad compartida del pedido.');
for (const prop of ['order={order}', 'notes={orderNotes}', 'incident={incident}']) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a la actividad: ${prop}`);
}

console.log('Actividad del pedido verificada.');
