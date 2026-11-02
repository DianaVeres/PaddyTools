import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/monday-options.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/monday/route.ts'), 'utf8');

for (const fragment of [
  'loadMondayReservationOptions',
  'MONDAY_RESERVATION_OPTIONS',
  'mondayColumnPhone',
  'mondayColumnEmail',
  "CUSTOMER_BOARD_ID = '5098189262'",
  "ARTICLE_BOARD_ID = '5098177612'",
  'DESCRIPCION ARTICULO',
]) {
  if (!service.includes(fragment))
    throw new Error(`Las opciones de reserva han perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/monday-options',
  'loadMondayReservationOptions(token)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta de Monday no usa las opciones: ${fragment}`);
}

if (route.includes("allBoardItems('5098189262'"))
  throw new Error('La ruta ha recuperado la carga duplicada de opciones.');

console.log('Opciones de reservas Monday verificadas.');
