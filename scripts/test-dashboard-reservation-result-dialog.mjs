import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const component = readFileSync(resolve(root, 'components/dashboard/reservation-result-dialog.tsx'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of ['Reserva creada', 'guardado correctamente en Monday', '<ReservationPrintCard record={record}', 'disabled={!record}', 'onPrintLabel(record)', 'Imprimir reserva', '!nextOpen && onClose()'])
  if (!component.includes(fragment)) throw new Error(`La confirmación de reserva ha perdido: ${fragment}`);
for (const fragment of ['@/components/dashboard/reservation-result-dialog', '<ReservationResultDialog', "open={modal === 'reserva-creada'}", 'record={createdReservation}', "requestReservationPrint(record, 'label')", 'requestReservationPrint(record)'])
  if (!page.includes(fragment)) throw new Error(`La pantalla no conecta la confirmación: ${fragment}`);
console.log('Confirmación e impresión de reserva verificada.');
