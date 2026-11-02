import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-card.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'IncidentCard',
  'incident.orderNumber',
  'incident.solved',
  'incident.pickupReceived',
  'incident.recurrenceCount',
  "onPrintIncident(incident, 'label')",
  "onPrintIncident(incident, 'document')",
]) {
  if (!component.includes(fragment))
    throw new Error(`La tarjeta de incidencia ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/incident-card"))
  throw new Error('La pantalla no usa la tarjeta de incidencia compartida.');
if (page.includes('function IncidentCard('))
  throw new Error('La pantalla ha recuperado la tarjeta duplicada.');

console.log('Tarjeta de incidencia verificada.');
