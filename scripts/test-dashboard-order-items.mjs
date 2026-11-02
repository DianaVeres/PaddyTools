import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-items.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderItems',
  'order.items.length',
  'item.name',
  'item.sku',
  'item.size',
  'item.quantity',
  'item.total',
]) {
  if (!component.includes(fragment))
    throw new Error(`La tarjeta de artículos ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-items"))
  throw new Error('La pantalla no usa la tarjeta de artículos compartida.');
if (page.includes('function Items('))
  throw new Error('La pantalla ha recuperado la tarjeta duplicada.');

console.log('Tarjeta de artículos del pedido verificada.');
