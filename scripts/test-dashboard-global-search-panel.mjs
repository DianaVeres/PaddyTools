import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/global-search-panel.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'GlobalSearchPanel',
  'Número de pedido, nombre o teléfono',
  'onSubmit={onSubmit}',
  "onQueryChange('')",
  'orderMatches.map',
  'match.customerName',
  'match.phone',
  'match.email',
  'incidentMatches.map',
  'match.customerPhone',
  'match.customerEmail',
  'match.solved',
  'onSelectOrder(match)',
  'onSelectIncident(match)',
  'search-quick-actions',
  'onOpenPackingList',
  'onOpenPickups',
  'onOpenShipping',
  'onOpenIncidents',
  'PackingList',
  'Recogidas',
  '¿Envío?',
  'Incidencias',
]) {
  if (!component.includes(fragment))
    throw new Error(`La consulta global ha perdido: ${fragment}`);
}
for (const hiddenIndicator of [
  'WooCommerce conectado',
  'Incidencias conectado',
  'Monday Reservas conectado',
  'Monday Prendas conectado',
  'DetalWPF sincronizado',
]) {
  if (component.includes(hiddenIndicator))
    throw new Error(`La consulta global vuelve a mostrar: ${hiddenIndicator}`);
}
if (!page.includes("@/components/dashboard/global-search-panel"))
  throw new Error('La pantalla no usa la consulta global compartida.');
for (const prop of [
  'orderMatches={orderSearchMatches}',
  'incidentMatches={incidentSearchMatches}',
  'onQueryChange={setQuery}',
  'onSubmit={search}',
  'void search(undefined, match.number)',
  'void search(undefined, match.orderNumber, match.id)',
  "window.location.assign('/packing-list')",
  "openRegistry('recogidas')",
  'onOpenShipping={openShipping}',
  "window.location.assign('/incidencias')",
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a la consulta global: ${prop}`);
}

console.log('Consulta global verificada.');
