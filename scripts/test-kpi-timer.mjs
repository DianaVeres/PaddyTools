import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const timer = readFileSync(resolve(root, 'components/kpis/kpi-timer.tsx'), 'utf8');
const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8');
for (const fragment of ['paddytools-kpi-active-timer', 'KPI_ACTIVITIES', 'startedIso', 'measuredMinutes', 'Guardar y terminar', 'paddytools:kpi-saved'])
  if (!timer.includes(fragment)) throw new Error(`El contador KPI ha perdido: ${fragment}`);
for (const fragment of ["@/components/kpis/kpi-timer", '<KpiTimer />'])
  if (!layout.includes(fragment)) throw new Error(`El layout no conecta el contador: ${fragment}`);
console.log('Contador automático de productividad verificado.');
