import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const connectedResults = readFileSync(
  resolve(root, 'components/dashboard/connected-results.tsx'),
  'utf8',
);
const orderLinkedRecords = readFileSync(
  resolve(root, 'components/dashboard/order-linked-records.tsx'),
  'utf8',
);

for (const fragment of [
  'IncidentCard',
  'incident.orderNumber',
  'incident.solved',
  'incident.pickupReceived',
  'formatIncidentDateTime(incident.pickupReceivedAt)',
  'Marcada como recibida',
  'Historial de actividad',
  'entry.userName',
  'incident.recurrenceCount',
  "onPrintIncident(incident, 'label')",
  "onPrintIncident(incident, 'document')",
  'Abrir incidencia',
  'openIncidentHref(',
  "incident.sourceType || 'order'",
]) {
  if (!component.includes(fragment))
    throw new Error(`La tarjeta de incidencia ha perdido: ${fragment}`);
}
const incidentsPage = readFileSync(resolve(root, 'app/incidencias/page.tsx'), 'utf8');
const compatibility = readFileSync(resolve(root, 'public/incidencias-compat.js'), 'utf8');
for (const fragment of ['window.location.search', 'src={frameSource}'])
  if (!incidentsPage.includes(fragment))
    throw new Error(`La vista de incidencias no recibe el enlace directo: ${fragment}`);
for (const fragment of [
  "get('openIncident')",
  "get('createIncident')",
  "document.getElementById('orderInput').value = requestedCreationReference",
  'search();',
  "row.source_type === 'tienda'",
  "row.source_type === 'manual'",
  "show(row);",
])
  if (!compatibility.includes(fragment))
    throw new Error(`La incidencia no se abre directamente: ${fragment}`);
if (!page.includes("@/components/dashboard/connected-results"))
  throw new Error('La pantalla no usa los resultados conectados compartidos.');
for (const wrapper of [connectedResults, orderLinkedRecords]) {
  if (!wrapper.includes("@/components/dashboard/incident-card"))
    throw new Error('Un resultado conectado ha perdido la tarjeta de incidencia.');
}
if (page.includes('function IncidentCard('))
  throw new Error('La pantalla ha recuperado la tarjeta duplicada.');

console.log('Tarjeta de incidencia verificada.');
