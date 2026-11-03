import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/shipping-history-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  '¿Cuándo se hizo el envío?',
  'referencia exacta',
  "event.key === 'Enter'",
  'Buscando en Paddy Packing List',
  'Buscaremos exactamente el PA, R, IPA o RPA indicado',
  "new Intl.DateTimeFormat('es-ES'",
  'Fecha de envío',
  'Pedido registrado',
  'No aparece en los PackingList',
  '!loading && onOpenChange(nextOpen)',
]) {
  if (!component.includes(fragment))
    throw new Error(`El diálogo de envíos ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/shipping-history-dialog',
  '<ShippingHistoryDialog',
  'reference={shippingReference}',
  'shipments={shipments}',
  'setShipments(null)',
  'onSearch={() => void checkShipping()}',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta el diálogo de envíos: ${fragment}`);
}

console.log('Diálogo de histórico de envíos verificado.');
