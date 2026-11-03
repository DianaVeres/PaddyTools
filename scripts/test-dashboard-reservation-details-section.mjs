import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-details-section.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

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
  'draft={reservationDraft}',
  'options={reservationOptions}',
  'articles={reservationArticles}',
  'onChange={setReservationDraft}',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta los detalles de reserva: ${fragment}`);
}

console.log('Detalles del formulario de reservas verificados.');
