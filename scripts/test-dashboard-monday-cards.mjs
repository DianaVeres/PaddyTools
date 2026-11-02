import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(resolve(root, 'components/dashboard/monday-cards.tsx'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const connectedResults = readFileSync(
  resolve(root, 'components/dashboard/connected-results.tsx'),
  'utf8',
);
const orderLinkedRecords = readFileSync(
  resolve(root, 'components/dashboard/order-linked-records.tsx'),
  'utf8',
);

for (const fragment of [
  'MondayCards', 'record.reference', 'record.customer', 'record.phone',
  'record.school', 'record.articleDescription', 'record.specialDetails',
  "onPrintReservation(record, 'label')", "onPrintReservation(record, 'card')",
  'onEmailReservation(record)',
]) {
  if (!component.includes(fragment))
    throw new Error(`Las tarjetas de Monday han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/connected-results"))
  throw new Error('La pantalla no usa los resultados conectados compartidos.');
for (const wrapper of [connectedResults, orderLinkedRecords]) {
  if (!wrapper.includes("@/components/dashboard/monday-cards"))
    throw new Error('Un resultado conectado ha perdido las tarjetas de Monday.');
}
if (page.includes('function MondayCards('))
  throw new Error('La pantalla ha recuperado tarjetas duplicadas de Monday.');

console.log('Tarjetas de Monday verificadas.');
