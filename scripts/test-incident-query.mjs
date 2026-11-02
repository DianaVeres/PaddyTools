import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/incident-query.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/incidents/route.ts'), 'utf8');

for (const fragment of [
  'listIncidents',
  'findIncidents',
  'readAllIncidentRows',
  'incidentReferenceCandidates',
  'pickup_school',
  'row.id === id',
  'incidents: matches.map',
]) {
  if (!service.includes(fragment))
    throw new Error(`La consulta de incidencias ha perdido: ${fragment}`);
}
for (const fragment of [
  '@/lib/incident-query',
  'listIncidents(scope)',
  "findIncidents(id || '', number)",
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa la consulta compartida: ${fragment}`);
}

console.log('Consulta de incidencias verificada.');
