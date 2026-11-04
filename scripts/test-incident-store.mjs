import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/incident-store.ts'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/incidents/route.ts'), 'utf8');

for (const fragment of [
  'export function mapStoredIncident',
  'export function incidentFieldsFor',
  'export async function nextAutomaticIncidentId',
  'match(/^I?INC-(\\d+)$/)',
  "padStart(6, '0')",
  'observations:',
  'pickupReceived:',
  'sent:',
  'recurrenceCount:',
  "['order', 'pedido', 'reservation', 'reserva'].includes(storedSource)",
  'explicitSource ||',
]) {
  if (!source.includes(fragment))
    throw new Error(`El almacén de incidencias ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/lib/incident-query',
  'findIncidents',
  'listIncidents',
]) {
  if (!route.includes(fragment))
    throw new Error(`La ruta de incidencias no usa el servicio: ${fragment}`);
}

if (
  route.includes('function mapIncident(') ||
  route.includes('function fieldsFor(')
)
  throw new Error('La ruta ha recuperado lógica duplicada de incidencias.');

console.log('Almacén de incidencias verificado.');
