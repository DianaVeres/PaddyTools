import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-registry-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of [
  'Prendas para recoger en colegios',
  'Registro de incidencias',
  'Mostrar también las recibidas',
  'row.school ||',
  'row.pickupSchoolName ||',
  "'Colegio sin indicar'",
  'incidentStatusLabel(row)',
  'Cerrar incidencia',
  '!row.pickupSchool &&',
  '!row.shippingRequired',
  'Reimprimir',
  "? 'Eliminando…'",
  'canDelete &&',
  'Volver a pendiente',
  'Marcar recibida',
  'No hay registros para mostrar',
])
  if (!component.includes(fragment))
    throw new Error(`El registro ha perdido: ${fragment}`);
for (const fragment of [
  '@/components/dashboard/incident-registry-dialog',
  '<IncidentRegistryDialog',
  "modal === 'registro' || modal === 'recogidas'",
  'rows={visibleRegistryRows}',
  'canDelete={canDeleteIncidents(sessionUser)}',
  'onView={showIncidentDocument}',
  'onPrint={printIncidentDocument}',
  'setIncidentSolved(row, true)',
  'deleteIncident(row)',
  'setPickupReceived(row, received)',
])
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta el registro: ${fragment}`);
console.log('Registro de incidencias y recogidas verificado.');
