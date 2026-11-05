import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const registry = readFileSync(
  resolve(root, 'public/incidencias-app.html'),
  'utf8',
);

const pendingFilters = registry.match(/rows\.filter\(r=>!r\.solved\)\.map/g) || [];
if (pendingFilters.length < 2) {
  throw new Error(
    'La hoja de registro vuelve a mostrar incidencias solucionadas.',
  );
}

const openStoredOrderIncident =
  "else{const r=await api('/api/incident-record?number='+encodeURIComponent(tr.dataset.id));show(r);showView('main')}";
if (!registry.includes(openStoredOrderIncident)) {
  throw new Error(
    'La hoja de registro no abre directamente la incidencia guardada.',
  );
}

console.log('Apertura y filtro de la hoja de incidencias verificados.');
