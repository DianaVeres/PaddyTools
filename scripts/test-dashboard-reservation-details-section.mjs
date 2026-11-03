import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-details-section.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const dialog = readFileSync(
  resolve(root, 'components/dashboard/reservation-form-dialog.tsx'),
  'utf8',
);

for (const fragment of [
  'Fecha reserva',
  'Código / artículo',
  'disabled={!draft.school}',
  'Selecciona primero un colegio',
  'Talla',
  'U. enviadas',
  'U. pendientes',
  'options?.paid.map',
  'options?.observations.map',
  'options?.status.map',
  'Fecha fin',
  'Entrega estimada producción',
  'Fórmula (calculada por Monday)',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los detalles de la reserva han perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/reservation-details-section',
  '<ReservationDetailsSection',
  'draft={draft}',
  'options={options}',
  'articles={articles}',
  'onChange={onDraftChange}',
]) {
  if (!dialog.includes(fragment))
    throw new Error(`El diálogo no conecta los detalles de reserva: ${fragment}`);
}
if (!page.includes('@/components/dashboard/reservation-form-dialog'))
  throw new Error('La pantalla no conecta el diálogo de reservas.');

console.log('Detalles del formulario de reservas verificados.');
