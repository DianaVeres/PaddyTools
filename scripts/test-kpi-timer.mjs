import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const timer = readFileSync(
  resolve(root, 'components/kpis/kpi-timer.tsx'),
  'utf8',
);
const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8');
const workLog = readFileSync(resolve(root, 'lib/kpi-work-log.ts'), 'utf8');
const timerStyles = readFileSync(
  resolve(root, 'components/kpis/kpi-timer.module.css'),
  'utf8',
);
for (const fragment of [
  'paddytools-kpi-active-timer',
  'KPI_ACTIVITIES',
  'MANUAL_KPI_ACTIVITIES',
  'startedIso',
  'measuredMinutes',
  'Guardar y terminar',
  'paddytools:kpi-saved',
  'canManageMaintenance(data.user)',
  'MAINTENANCE_KPI_ACTIVITY',
  'timerActivities.map(',
])
  if (!timer.includes(fragment))
    throw new Error(`El contador KPI ha perdido: ${fragment}`);
if (timer.includes('>{KPI_ACTIVITIES.map('))
  throw new Error('El selector manual vuelve a mostrar tareas automatizadas.');
for (const fragment of [
  "['estado_inicial', 'Cambiar estado inicial']",
  "['reservas', 'Preparar reservas']",
  "['preparacion_reservas', 'Gestionar preparación de reservas']",
  "['avisos_colegios', 'Avisos llegada colegios']",
  "'mantenimiento'",
  "'Mantenimiento'",
  "ADMIN_ONLY_KPI_ACTIVITIES = ['mantenimiento']",
  "RETIRED_KPI_ACTIVITIES = ['comprobacion']",
])
  if (!workLog.includes(fragment))
    throw new Error(`El catálogo manual de KPI ha perdido: ${fragment}`);
for (const fragment of [
  'box-sizing:border-box',
  '.closed select { flex:1 1 0; min-width:0',
  '.closed button { flex:0 0 auto;',
])
  if (!timerStyles.includes(fragment))
    throw new Error(`El contador puede desbordar la pantalla: ${fragment}`);
for (const fragment of ['@/components/kpis/kpi-timer', '<KpiTimer />'])
  if (!layout.includes(fragment))
    throw new Error(`El layout no conecta el contador: ${fragment}`);
console.log('Contador automático de productividad verificado.');
