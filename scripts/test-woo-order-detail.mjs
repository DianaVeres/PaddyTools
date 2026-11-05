import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/woo-order-detail.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/search/route.ts'), 'utf8');

for (const fragment of [
  'export async function loadWooOrderDetail',
  'export function formatWooOrderDetail',
  'context=edit',
  '/notes?per_page=100',
  'const [detailResponse, notesResponse] = await Promise.all([',
  'returnAttended:',
  'schoolCandidates:',
  'wooOrderSchoolCandidates',
  'shippingMethod:',
  'movements:',
  'wp-admin/post.php',
]) {
  if (!service.includes(fragment))
    throw new Error(`El detalle WooCommerce ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/woo-order-detail',
  'loadWooOrderDetail',
  'wooStatusLabels',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa el detalle compartido: ${fragment}`);
}

if (route.includes('context=edit') || route.includes('schoolCandidates:'))
  throw new Error('La ruta ha recuperado lógica duplicada del pedido.');

console.log('Detalle de pedido WooCommerce verificado.');
