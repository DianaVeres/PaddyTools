import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/monday-lookup.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/monday/route.ts'), 'utf8');

for (const fragment of [
  'lookupMondayRecords',
  'mondayReferenceCandidates',
  'items_page_by_column_values',
  'mondayReservationBaseReference',
  'allMondayBoardItems',
  'enrichMondayReservations',
  '[...exactRecords, ...relatedRecords]',
]) {
  if (!service.includes(fragment))
    throw new Error(`La consulta exacta de Monday ha perdido: ${fragment}`);
}
for (const fragment of [
  '@/lib/monday-lookup',
  'lookupMondayRecords(number, token)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa la consulta exacta: ${fragment}`);
}
if (route.includes('items_page_by_column_values'))
  throw new Error('La ruta ha recuperado la consulta exacta duplicada.');

console.log('Consulta exacta de Monday verificada.');
