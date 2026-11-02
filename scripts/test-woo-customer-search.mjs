import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(
  resolve(root, 'lib/woo-customer-search.ts'),
  'utf8',
);
const route = readFileSync(resolve(root, 'app/api/search/route.ts'), 'utf8');

for (const fragment of [
  'wooSearchVariants',
  'searchDigits',
  'customers?search=',
  'orders?customer=',
  'Array.from({ length: 10 }',
  'phone.includes(phoneQuery)',
  'textWords.every',
]) {
  if (!service.includes(fragment))
    throw new Error(`La búsqueda de clientes ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/woo-customer-search',
  'searchWooOrdersByCustomer',
  'wooStatusLabels',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta global no usa el servicio: ${fragment}`);
}

if (route.includes('customers?search=') || route.includes('orders?customer='))
  throw new Error('La ruta ha recuperado la búsqueda duplicada de clientes.');

console.log('Búsqueda de clientes WooCommerce verificada.');
