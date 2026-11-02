import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/incident-actions.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/incidents/route.ts'), 'utf8');

for (const fragment of [
  'findStoredIncident',
  'updateIncidentStatus',
  'deleteStoredIncident',
  'incidentReferenceCandidates',
  'pickup_received_at:',
  'solved_at:',
  'sent:',
  '.delete(incidentRecords)',
]) {
  if (!service.includes(fragment))
    throw new Error(`Las acciones de incidencias han perdido: ${fragment}`);
}
for (const fragment of [
  '@/lib/incident-actions',
  'updateIncidentStatus(body)',
  'deleteStoredIncident(body)',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa las acciones compartidas: ${fragment}`);
}

console.log('Acciones de incidencias verificadas.');
