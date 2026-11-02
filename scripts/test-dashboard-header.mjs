import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/dashboard-header.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'DashboardHeader',
  '/paddy-logo-granate.png',
  'PaddyTools',
  'PackingList',
  'Reservas',
  'Recogidas',
  '¿Envío?',
  'Incidencias',
  'Generar reserva',
  'shippingLoading',
  'userInitials(sessionUser)',
  'onLogout',
]) {
  if (!component.includes(fragment))
    throw new Error(`La cabecera principal ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/dashboard-header"))
  throw new Error('La pantalla no usa la cabecera principal compartida.');
for (const prop of [
  'sessionUser={sessionUser}',
  'shippingLoading={shippingLoading}',
  "window.location.assign('/packing-list')",
  "openRegistry('recogidas')",
  'onOpenShipping={openShipping}',
  "window.location.assign('/incidencias')",
  'void openReservation()',
  'void logout()',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a la cabecera: ${prop}`);
}

console.log('Cabecera principal verificada.');
