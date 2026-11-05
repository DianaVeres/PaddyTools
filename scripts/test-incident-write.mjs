import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const service = readFileSync(resolve(root, 'lib/incident-write.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/incidents/route.ts'), 'utf8');

for (const fragment of [
  'allocateAutomaticIncidentId',
  'saveIncident',
  'IncidentValidationError',
  'auto_generate_id',
  'record_id',
  'products_json:',
  'recurrence_count:',
  'resolvedIncidentState(',
  'incidentResolutionFromRecord(saved)',
  'saved.solved = solved ? 1 : 0',
  '.insert(incidentRecords)',
  '.update(incidentRecords)',
]) {
  if (!service.includes(fragment))
    throw new Error(`El guardado de incidencias ha perdido: ${fragment}`);
}
for (const fragment of [
  '@/lib/incident-write',
  'allocateAutomaticIncidentId()',
  'saveIncident(incoming)',
  'error instanceof IncidentValidationError',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta no usa el guardado compartido: ${fragment}`);
}

console.log('Guardado de incidencias verificado.');
