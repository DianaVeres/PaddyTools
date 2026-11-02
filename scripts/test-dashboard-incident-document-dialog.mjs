import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/incident-document-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'IncidentDocumentDialog',
  'open={open}',
  '!nextOpen && onClose()',
  'incident?.orderNumber',
  'Documento guardado en el registro compartido',
  '<IncidentDocument incident={incident} />',
  'onClick={onClose}',
  'incident && onPrint(incident)',
]) {
  if (!component.includes(fragment))
    throw new Error(`El diálogo de incidencia ha perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/incident-document-dialog"))
  throw new Error('La pantalla no usa el diálogo compartido de incidencia.');
for (const prop of [
  "open={modal === 'detalle-incidencia'}",
  'incident={selectedIncident}',
  'onClose={() => setModal(null)}',
  'onPrint={printIncidentDocument}',
]) {
  if (!page.includes(prop))
    throw new Error(`La pantalla no entrega al diálogo: ${prop}`);
}

console.log('Diálogo de documento de incidencia verificado.');
