import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-heading.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderHeading',
  'order.number',
  'order.status',
  'order.statusLabel',
  'order.dateModified',
  "onDownloadDocument('invoice')",
  "onDownloadDocument('packing-slip')",
  "documentLoading === 'invoice'",
  "documentLoading === 'packing-slip'",
  'onRefresh',
  'onOpenWooCommerce',
  'onCreateIncident',
  'Crear incidencia',
  'Albarán devolución',
]) {
  if (!component.includes(fragment))
    throw new Error(`La cabecera del pedido ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-heading"))
  throw new Error('La pantalla no usa la cabecera compartida del pedido.');
for (const prop of [
  'documentLoading={documentLoading}',
  'void downloadOrderDocument(type)',
  'onRefresh={() => void search()}',
  "window.open(order.wooUrl, '_blank')",
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a la cabecera: ${prop}`);
}

console.log('Cabecera del pedido verificada.');
