import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/dashboard-feedback.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'DashboardFeedback',
  'success-toast',
  'No hemos podido mostrar el pedido',
  '!hasContent && !loading && !error',
  'Busca un pedido, reserva o prenda especial',
  'Consultando WooCommerce, Monday e incidencias',
  'Estamos buscando todos los pedidos, reservas, prendas e incidencias',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los estados de consulta han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/dashboard-feedback"))
  throw new Error('La pantalla no usa los estados compartidos de consulta.');
for (const prop of [
  'saved={saved}',
  'error={error}',
  'loading={loading}',
  'orderSearchMatches.length',
  'incidentSearchMatches.length',
  'ticket,',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a los estados: ${prop}`);
}

console.log('Estados de consulta verificados.');
