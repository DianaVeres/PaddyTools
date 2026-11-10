import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = readFileSync(resolve(root, 'lib/dashboard-types.ts'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'DashboardModal',
  'DashboardOrder',
  'DashboardShipment',
  'DashboardMondayRecord',
  'ReservationDraft',
  'ReservationOptions',
  'MondayUpdate',
  'OrderSearchMatch',
  'SessionUser',
]) {
  if (!types.includes(`export type ${fragment}`))
    throw new Error(`Los modelos del panel han perdido: ${fragment}`);
}
if (!page.includes("from '@/lib/dashboard-types'"))
  throw new Error('La pantalla principal no usa los modelos compartidos.');
if (page.includes('type MondayRecord =') || page.includes('type Order ='))
  throw new Error('La pantalla ha recuperado modelos duplicados.');

console.log('Modelos del panel principal verificados.');
