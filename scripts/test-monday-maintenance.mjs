import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(
  resolve(root, 'lib/monday-maintenance.ts'),
  'utf8',
);
const route = readFileSync(resolve(root, 'app/api/monday/route.ts'), 'utf8');

for (const fragment of [
  'MONDAY_MAINTENANCE_KEY',
  'isMondayMaintenanceKey',
  'removeMondayLabelColumn',
  'delete_column',
  "searchKey(candidate.title) === 'ETIQUETA'",
]) {
  if (!service.includes(fragment))
    throw new Error(`El mantenimiento de Monday ha perdido: ${fragment}`);
}
for (const fragment of [
  '@/lib/monday-maintenance',
  "request.headers.get('x-maintenance-key')",
  'removeMondayLabelColumn(token)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa el mantenimiento compartido: ${fragment}`);
}
if ((route.match(/delete_column/g) || []).length)
  throw new Error('La ruta ha recuperado mantenimiento duplicado.');

console.log('Mantenimiento de Monday verificado.');
