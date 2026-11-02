import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/order-documents.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'OrderDocuments',
  'incident.orderNumber',
  'incident.incidentDate',
  'incident.solved',
  'onView(incident)',
  'onPrint(incident)',
  'Reimprimir',
  'Este pedido todavía no tiene documentos de incidencia',
]) {
  if (!component.includes(fragment))
    throw new Error(`Los documentos del pedido han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/order-documents"))
  throw new Error('La pantalla no usa los documentos compartidos del pedido.');
for (const prop of [
  'incident={incident}',
  'onView={showIncidentDocument}',
  'onPrint={printIncidentDocument}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega a documentos: ${prop}`);
}

console.log('Documentos del pedido verificados.');
