import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const page = readFileSync(resolve(root, 'app/kpis/page.tsx'), 'utf8');
const dashboard = readFileSync(resolve(root, 'components/kpis/kpi-dashboard.tsx'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/kpis/route.ts'), 'utf8');
const service = readFileSync(resolve(root, 'lib/kpi-service.ts'), 'utf8');
for (const fragment of ['/api/kpis', 'Indicadores de productividad', 'Actualizar indicadores', 'KpiDashboard'])
  if (!page.includes(fragment)) throw new Error(`La pantalla KPI ha perdido: ${fragment}`);
for (const fragment of ['Productividad', 'Calidad y mejora', 'Pedidos enviados', 'Reincidencias'])
  if (!dashboard.includes(fragment)) throw new Error(`El cuadro KPI ha perdido: ${fragment}`);
for (const fragment of ['buildKpiSnapshot', 'cache-control'])
  if (!route.includes(fragment)) throw new Error(`La API KPI ha perdido: ${fragment}`);
for (const fragment of ['listIncidents', 'listPackingLists', 'calculateKpiSnapshot'])
  if (!service.includes(fragment)) throw new Error(`El servicio KPI ha perdido: ${fragment}`);
console.log('Módulo independiente de KPI verificado.');
