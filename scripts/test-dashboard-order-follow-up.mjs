import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-follow-up.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderFollowUp',
  'order.shippingMethod',
  'Método de envío registrado en WooCommerce',
  'Avisar al cliente por email',
  'onPrepareEmail',
  'Preparar email',
]) {
  if (!component.includes(fragment))
    throw new Error(`El seguimiento del pedido ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-follow-up"))
  throw new Error('La pantalla no usa el seguimiento compartido del pedido.');
for (const prop of [
  'order={order}',
  'onPrepareEmail={() => void openOrderEmail()}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a seguimiento: ${prop}`);
}

console.log('Seguimiento del pedido verificado.');
