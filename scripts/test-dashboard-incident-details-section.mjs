import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-details-section.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const dialog = readFileSync(
  resolve(root, 'components/dashboard/incident-form-dialog.tsx'),
  'utf8',
);

for (const fragment of [
  "customerName || 'Cliente sin nombre'",
  'Email del cliente',
  'Fecha de recepción de la incidencia',
  'Colegio de la incidencia',
  'Descripción de la incidencia',
  'Observaciones',
  "['recurrence', 'Es una reincidencia']",
  "['pickup', 'Recoger en el cole']",
  "['shippingRequired', 'Requiere envío']",
  "['solved', 'Incidencia solucionada']",
  "['sent', 'Enviado']",
  "field === 'sent' && !draft.shippingRequired",
  'draft.pickup || draft.shippingRequired',
  'se solucionará automáticamente',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los datos de incidencia han perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/incident-details-section',
  '<IncidentDetailsSection',
  'draft={draft}',
  'schools={schools}',
  'onChange={onDraftChange}',
]) {
  if (!dialog.includes(fragment))
    throw new Error(
      `El diálogo no conecta los datos de incidencia: ${fragment}`,
    );
}
if (!page.includes('@/components/dashboard/incident-form-dialog'))
  throw new Error('La pantalla no conecta el diálogo de incidencias.');

console.log('Datos y estados del formulario de incidencias verificados.');
