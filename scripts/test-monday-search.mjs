import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/monday-search.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/monday/route.ts'), 'utf8');

for (const fragment of [
  'searchMondayRecords',
  'MONDAY_BOARDS.map',
  'normalizeMondayItem',
  'loadMondayCustomerContacts',
  'searchKey(record.customer)',
  'searchDigits(record.phone)',
  'phoneNeedle.length >= 5',
  'customerEmail:',
]) {
  if (!service.includes(fragment))
    throw new Error(`La búsqueda en Monday ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/monday-search',
  'searchMondayRecords(searchText, token)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa la búsqueda compartida: ${fragment}`);
}

console.log('Búsqueda de registros Monday verificada.');
