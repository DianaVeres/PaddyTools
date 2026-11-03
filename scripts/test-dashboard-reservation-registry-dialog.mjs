import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(resolve(root, 'components/dashboard/reservation-registry-dialog.tsx'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'Consulta las reservas de Monday',
  'Generar reserva libre',
  'Cargando reservas',
  "'Nº RESERVA'",
  "'ENTREGA ESTIMADA PRODUCCIÓN'",
  'row.articleDescription || row.article',
  'Completar / editar',
  'Imprimir etiqueta',
  'No hay reservas para mostrar',
  '!nextOpen && onClose()',
]) {
  if (!component.includes(fragment)) throw new Error(`El registro de reservas ha perdido: ${fragment}`);
}
for (const fragment of [
  '@/components/dashboard/reservation-registry-dialog',
  '<ReservationRegistryDialog',
  "open={modal === 'reservas'}",
  'rows={visibleReservationRows}',
  'onCreate={() => void openReservation()}',
  'onEdit={(row) => void openReservation(row)}',
  "requestReservationPrint(row, 'label')",
]) {
  if (!page.includes(fragment)) throw new Error(`La pantalla no conecta el registro de reservas: ${fragment}`);
}
console.log('Registro de reservas verificado.');
