import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const page = readFileSync(resolve(root, 'app/kpis/page.tsx'), 'utf8');
const dashboard = readFileSync(resolve(root, 'components/kpis/kpi-dashboard.tsx'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/kpis/route.ts'), 'utf8');
const service = readFileSync(resolve(root, 'lib/kpi-service.ts'), 'utf8');
const client = readFileSync(resolve(root, 'lib/kpi-client.ts'), 'utf8');
const workForm = readFileSync(resolve(root, 'components/kpis/work-log-form.tsx'), 'utf8');
const productivity = readFileSync(resolve(root, 'components/kpis/productivity-dashboard.tsx'), 'utf8');
const migration = readFileSync(resolve(root, 'drizzle/0006_kpi_work_logs.sql'), 'utf8');
for (const fragment of ['Indicadores de productividad', 'Actualizar indicadores', 'KpiDashboard', 'ProductivityDashboard', 'QualityDashboard', 'WorkLogForm'])
  if (!page.includes(fragment)) throw new Error(`La pantalla KPI ha perdido: ${fragment}`);
for (const fragment of ['/api/kpis', '/api/kpi-work-logs', 'saveKpiWorkLog', 'deleteKpiWorkLog'])
  if (!client.includes(fragment)) throw new Error(`El cliente KPI ha perdido: ${fragment}`);
for (const fragment of ['Productividad', 'Calidad y mejora', 'Pedidos enviados', 'Reincidencias'])
  if (!dashboard.includes(fragment)) throw new Error(`El cuadro KPI ha perdido: ${fragment}`);
for (const fragment of ['buildKpiSnapshot', 'cache-control'])
  if (!route.includes(fragment)) throw new Error(`La API KPI ha perdido: ${fragment}`);
for (const fragment of ['listIncidents', 'listPackingLists', 'calculateKpiSnapshot', 'workerEmail'])
  if (!service.includes(fragment)) throw new Error(`El servicio KPI ha perdido: ${fragment}`);
for (const fragment of ['¿Quién ha hecho qué?', 'N.º pedidos', 'N.º productos', 'N.º PackingLists'])
  if (!workForm.includes(fragment)) throw new Error(`El registro de tiempos ha perdido: ${fragment}`);
for (const fragment of ['Personas necesarias', 'Preparación / pedido', 'Tiempo / mensaje', 'Tiempo por persona', 'Tiempo por tarea'])
  if (!productivity.includes(fragment)) throw new Error(`La productividad ha perdido: ${fragment}`);
if (!migration.includes('CREATE TABLE `kpi_work_logs`') || migration.includes('CREATE TABLE `auth_users`'))
  throw new Error('La migración KPI no está aislada correctamente.');
if (!page.includes('Todas las personas') || !page.includes('selectedWorker'))
  throw new Error('La pantalla KPI no permite la vista conjunta e individual.');
console.log('Módulo independiente de KPI verificado.');
