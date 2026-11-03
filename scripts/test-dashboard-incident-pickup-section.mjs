import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-pickup-section.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const dialog = readFileSync(
  resolve(root, 'components/dashboard/incident-form-dialog.tsx'),
  'utf8',
);

for (const fragment of [
  'if (!draft.pickup) return null',
  'Colegio del producto',
  'Productos para recoger',
  'Cargando productos de WooCommerce',
  'No hay productos publicados para este colegio',
  'Selecciona primero el colegio al que pertenece el producto',
  'updatePick({ selected: event.target.checked })',
  'updatePick({ size: event.target.value })',
  'updatePick({ units: Number(event.target.value) })',
  'pickupNotes: event.target.value',
]) {
  if (!component.includes(fragment))
    throw new Error(`La recogida de incidencias ha perdido: ${fragment}`);
}

for (const fragment of [
  "@/components/dashboard/incident-pickup-section",
  '<IncidentPickupSection',
  'products={products}',
  'loading={productsLoading}',
  'error={productsError}',
  'onSchoolChange={onPickupSchoolChange}',
]) {
  if (!dialog.includes(fragment))
    throw new Error(`El diálogo no conecta la recogida: ${fragment}`);
}
for (const fragment of ['pickupItems: {}', 'void loadPickupProducts(school)']) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta la recogida: ${fragment}`);
}

console.log('Recogida del formulario de incidencias verificada.');
