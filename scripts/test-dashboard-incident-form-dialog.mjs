import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-form-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'IncidentDetailsSection',
  'IncidentPickupSection',
  'Incidencia del pedido #{reference}',
  "onPrint('label')",
  "onPrint('document')",
  'onSave(true)',
  'onSave()',
  '!nextOpen && onClose()',
]) {
  if (!component.includes(fragment))
    throw new Error(`El formulario de incidencias ha perdido: ${fragment}`);
}

for (const fragment of [
  "@/components/dashboard/incident-form-dialog",
  '<IncidentFormDialog',
  "open={modal === 'incidencia'}",
  'draft={incidentDraft}',
  'products={pickupProducts}',
  'onPrint={printIncidentDraft}',
  "onSave={(solved) => void save('incidencia', solved)}",
  'void loadPickupProducts(school)',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta el formulario: ${fragment}`);
}

console.log('Formulario completo de incidencias verificado.');
