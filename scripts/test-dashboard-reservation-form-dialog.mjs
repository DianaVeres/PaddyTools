import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-form-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'ReservationCustomerSection',
  'ReservationDetailsSection',
  "editing ? 'Completar reserva' : 'Generar reserva'",
  'Cargando campos de Monday',
  'onPointerDown={onDragStart}',
  'onPointerMove={onDragMove}',
  'onPointerUp={onDragStop}',
  'disabled={loading || saving}',
  "? 'Guardar cambios'",
  ": 'Crear en Monday'",
  '!nextOpen && onClose()',
]) {
  if (!component.includes(fragment))
    throw new Error(`El formulario de reservas ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/reservation-form-dialog',
  '<ReservationFormDialog',
  "open={modal === 'reserva'}",
  'editing={Boolean(editingReservationId)}',
  'articles={reservationArticles}',
  "onSave={() => void save('reserva')}",
  'onDragStart={reservationDialog.start}',
  'onDragStop={reservationDialog.stop}',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta el formulario de reservas: ${fragment}`);
}

console.log('Formulario completo de reservas verificado.');
