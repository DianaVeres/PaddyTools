import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/store-ticket-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'StoreTicketCard',
  'ticket.number',
  'ticket.date',
  'ticket.store',
  'ticket.customer',
  'ticket.operator',
  'ticket.payment',
  'ticket.total',
  'ticket.items.map',
  'item.article',
  'item.color',
  'item.size',
  'item.units',
  'item.price',
]) {
  if (!component.includes(fragment))
    throw new Error(`La tarjeta de ticket ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/store-ticket-card"))
  throw new Error('La pantalla no usa la tarjeta compartida de ticket.');
if (!page.includes('<StoreTicketCard ticket={ticket} />'))
  throw new Error('El ticket cargado no se entrega a la tarjeta compartida.');

console.log('Tarjeta de ticket de tienda verificada.');
