import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(
  resolve(root, 'lib/monday-reservations.ts'),
  'utf8',
);
const route = readFileSync(resolve(root, 'app/api/monday/route.ts'), 'utf8');

for (const fragment of [
  'loadAllMondayReservations',
  'loadMondayArticleDetails',
  'enrichMondayReservations',
  'loadMondayCustomerContacts',
  'start += 100',
  'DESCRIPCION ARTICULO',
  'customerEmail:',
  'articleDescription:',
]) {
  if (!service.includes(fragment))
    throw new Error(`La lectura de reservas ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/monday-reservations',
  'loadAllMondayReservations(token)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa el lector de reservas: ${fragment}`);
}

console.log('Lectura de reservas Monday verificada.');
