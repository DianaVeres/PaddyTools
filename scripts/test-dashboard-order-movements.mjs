import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-movements.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderMovements',
  'order.movements?.length',
  'order.movements.map',
  'movement.id',
  'movement.author',
  'movement.date',
  'movement.text',
  'movement.customerVisible',
  'Nota visible para el cliente',
  'WooCommerce no tiene movimientos',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los movimientos del pedido han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-movements"))
  throw new Error('La pantalla no usa los movimientos compartidos del pedido.');
if (!page.includes('<OrderMovements order={order} />'))
  throw new Error('El pedido no se entrega al historial de movimientos.');

console.log('Movimientos del pedido verificados.');
