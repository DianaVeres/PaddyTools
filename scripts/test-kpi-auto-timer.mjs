import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const timer = readFileSync(resolve(root, 'lib/kpi-auto-timer.ts'), 'utf8');
const packing = readFileSync(
  resolve(root, 'app/packing-list/page.tsx'),
  'utf8',
);
const dashboard = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
const incidents = readFileSync(
  resolve(root, 'public/incidencias-compat.js'),
  'utf8',
);
const bridge = readFileSync(
  resolve(root, 'components/kpis/kpi-timer.tsx'),
  'utf8',
);
for (const fragment of [
  'beginAutomaticWork',
  'completeAutomaticWork',
  'maximumAge',
  'saveKpiWorkLog',
  'paddytools:kpi-saved',
])
  if (!timer.includes(fragment))
    throw new Error(
      `El servicio de medición automática ha perdido: ${fragment}`,
    );
for (const fragment of [
  "beginAutomaticWork(\n      'packing-list-create'",
  "completeAutomaticWork('packing-list-create'",
  'orders: found.length',
  'packingLists: 1',
  'PackingList generado correctamente, pero no se pudo registrar automáticamente su tiempo.',
  'Medición automática activa desde',
])
  if (!packing.includes(fragment))
    throw new Error(
      `PackingList ha perdido la medición automática: ${fragment}`,
    );
const completed = packing.indexOf(
  "completeAutomaticWork('packing-list-create'",
);
const saved = packing.indexOf('if (!response.ok || !saved.id)');
if (completed < saved)
  throw new Error(
    'El contador termina antes de confirmar el guardado del PackingList.',
  );
for (const fragment of [
  "beginAutomaticWork(\n      'incident-create'",
  "beginAutomaticWork(\n        'reservation-create'",
  "completeAutomaticWork('incident-create'",
  "completeAutomaticWork('reservation-create'",
  "'incidencias'",
  "'reservas'",
])
  if (!dashboard.includes(fragment))
    throw new Error(
      `Reservas o incidencias han perdido la medición automática: ${fragment}`,
    );
for (const fragment of [
  'paddytools:kpi-automatic-work',
  "key: 'incident-create'",
  "automaticKpiMessage('complete'",
  "automaticKpiMessage(row?.record_id ? 'cancel' : 'start'",
])
  if (!incidents.includes(fragment))
    throw new Error(
      `El módulo de incidencias ha perdido el contador automático: ${fragment}`,
    );
for (const fragment of [
  'AUTOMATIC_WORK_MESSAGE',
  "message.action === 'start'",
  "message.action === 'complete'",
  'event.origin !== window.location.origin',
])
  if (!bridge.includes(fragment))
    throw new Error(
      `El puente seguro de medición automática ha perdido: ${fragment}`,
    );
console.log('Medición automática de PackingList verificada.');
