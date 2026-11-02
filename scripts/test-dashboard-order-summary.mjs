import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-summary.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderSummary',
  'order.customer.name',
  'order.customer.phone',
  'order.customer.email',
  'order.customer.address',
  'order.dateCreated',
  'order.statusLabel',
  'order.payment',
  'order.total',
  'order.returnAttended',
  'returnUpdating',
  'onReturnAttendedChange(event.target.checked)',
  'Sincronizado con WooCommerce',
]) {
  if (!component.includes(fragment))
    throw new Error(`El resumen del pedido ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-summary"))
  throw new Error('La pantalla no usa el resumen compartido del pedido.');
for (const prop of [
  'order={order}',
  'returnUpdating={returnUpdating}',
  'void updateReturnAttended(attended)',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega al resumen: ${prop}`);
}

console.log('Resumen del pedido verificado.');
