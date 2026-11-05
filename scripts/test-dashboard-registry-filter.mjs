import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/dashboard-registry-filter.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace("from '@/lib/global-search'", "from './global-search.js'");
const globalSource = readFileSync(resolve(root, 'lib/global-search.ts'), 'utf8');
const globalJs = ts.transpileModule(globalSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const folder = mkdtempSync(join(tmpdir(), 'paddytools-registry-filter-'));
writeFileSync(resolve(folder, 'global-search.js'), globalJs);
writeFileSync(resolve(folder, 'dashboard-registry-filter.js'), js);
const { filterIncidentRegistry, filterReservationRegistry } = await import(`file:///${resolve(folder, 'dashboard-registry-filter.js').replaceAll('\\', '/')}?v=${Date.now()}`);

const incidents = [
  { orderNumber: 'IPA1', customerName: 'María Pérez', school: 'Teatinas Pinto', pickupReceived: false, solved: false, incidentText: 'Chaqueta' },
  { orderNumber: 'IPA2', customerName: 'Ana', school: 'Purísima', pickupReceived: true, solved: false, pickupDetails: 'Pantalón' },
  { orderNumber: 'IPA3', customerName: 'Lucía', school: 'Teatinas Pinto', pickupReceived: false, solved: true, incidentText: 'Incidencia cerrada' },
];
assert.equal(filterIncidentRegistry(incidents, 'maria perez', false, true).length, 1);
assert.equal(filterIncidentRegistry(incidents, '', true, false).length, 2);
assert.equal(filterIncidentRegistry(incidents, '', true, true).length, 3);
assert.equal(filterIncidentRegistry(incidents, '', false, true).length, 2);
assert.equal(filterIncidentRegistry(incidents, 'incidencia cerrada', false, true).length, 0);
const reservations = [{ reference: 'R100', customer: 'José López', school: 'Shackleton Web', status: 'ANULADA' }];
assert.equal(filterReservationRegistry(reservations, 'jose lopez').length, 1);
assert.equal(filterReservationRegistry(reservations, 'shackleton').length, 1);
assert.equal(filterReservationRegistry(reservations, 'activa').length, 0);

const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of ['filterIncidentRegistry(', 'filterReservationRegistry('])
  if (!page.includes(fragment)) throw new Error(`La pantalla no usa el filtro compartido: ${fragment}`);
rmSync(folder, { recursive: true, force: true });
console.log('Filtros compartidos de registros verificados.');
