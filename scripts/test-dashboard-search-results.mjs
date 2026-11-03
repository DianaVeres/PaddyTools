import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/dashboard-search-results.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace("from '@/lib/global-search'", "from './global-search.js'")
  .replace(/import[^;]+incident-record';\n/, '');
const globalSource = readFileSync(resolve(root, 'lib/global-search.ts'), 'utf8');
const globalJs = ts.transpileModule(globalSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const folder = mkdtempSync(join(tmpdir(), 'paddytools-search-results-'));
writeFileSync(resolve(folder, 'global-search.js'), globalJs);
writeFileSync(resolve(folder, 'dashboard-search-results.js'), js);
const {
  emptyConnectedSearchMessage,
  hasConnectedSearchResults,
  incidentsMatchingCustomerQuery,
} = await import(
  `file:///${resolve(folder, 'dashboard-search-results.js').replaceAll('\\', '/')}?v=${Date.now()}`
);

const incidents = [
  { id: '1', customerName: 'Sandra Flórez', customerPhone: '+34 612 345 678' },
  { id: '2', customerName: 'María López', customerPhone: '961 222 333' },
];
assert.deepEqual(incidentsMatchingCustomerQuery(incidents, 'sandra florez'), [incidents[0]]);
assert.deepEqual(incidentsMatchingCustomerQuery(incidents, '612345678'), [incidents[0]]);
assert.deepEqual(incidentsMatchingCustomerQuery(incidents, '34612345678'), [incidents[0]]);
assert.deepEqual(incidentsMatchingCustomerQuery(incidents, '1234'), []);
assert.equal(hasConnectedSearchResults([], [], []), false);
assert.equal(hasConnectedSearchResults([], [{ id: 'R1' }], []), true);
assert.equal(
  emptyConnectedSearchMessage('Sandra'),
  'No se encontraron pedidos, reservas, prendas ni incidencias para “Sandra”.',
);

const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of [
  'incidentsMatchingCustomerQuery(',
  'hasConnectedSearchResults(',
  'emptyConnectedSearchMessage(',
])
  if (!page.includes(fragment)) throw new Error(`La pantalla no usa el resultado compartido: ${fragment}`);
rmSync(folder, { recursive: true, force: true });
console.log('Resultados compartidos de consulta global verificados.');
