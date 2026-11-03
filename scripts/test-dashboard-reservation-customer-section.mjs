import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/reservation-customer-section.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'Nº reserva o pedido',
  'value.toUpperCase()',
  'Selecciona un cliente de Monday',
  'foldSearchText(item.name) === foldSearchText(name)',
  "phone: match?.phone || ''",
  "customerEmail: match?.email || ''",
  "school: match?.school || ''",
  "newCustomer ? 'Usar existente' : 'Nuevo'",
  'Nombre del nuevo cliente',
  'Selecciona un colegio',
  "articleId: ''",
]) {
  if (!component.includes(fragment))
    throw new Error(`Los datos de cliente de la reserva han perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/reservation-customer-section',
  '<ReservationCustomerSection',
  'draft={reservationDraft}',
  'options={reservationOptions}',
  'newCustomer={newReservationCustomer}',
  'editing={Boolean(editingReservationId)}',
  'onNewCustomerChange={setNewReservationCustomer}',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta los datos de cliente: ${fragment}`);
}

console.log('Datos de cliente del formulario de reservas verificados.');
