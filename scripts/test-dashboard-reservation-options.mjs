import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/dashboard-reservation-options.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace("from '@/lib/global-search'", "from './global-search.js'")
  .replace(/import[^;]+dashboard-types';\n/, '');
const globalSource = readFileSync(resolve(root, 'lib/global-search.ts'), 'utf8');
const globalJs = ts.transpileModule(globalSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const folder = mkdtempSync(join(tmpdir(), 'paddytools-reservation-options-'));
writeFileSync(resolve(folder, 'global-search.js'), globalJs);
writeFileSync(resolve(folder, 'dashboard-reservation-options.js'), js);
const { mondayReservationUpdateItemIds, reservationArticlesForSchool } = await import(
  `file:///${resolve(folder, 'dashboard-reservation-options.js').replaceAll('\\', '/')}?v=${Date.now()}`
);

const articles = [
  { id: '1', code: '100', description: 'Polo Shackleton Web' },
  { id: '2', code: '200', description: 'Pantalón Teatinas Pinto' },
];
assert.deepEqual(reservationArticlesForSchool(articles, 'Shackleton'), [articles[0]]);
assert.deepEqual(reservationArticlesForSchool(articles, 'Colegio Teatinas Pinto Web'), [articles[1]]);
assert.deepEqual(reservationArticlesForSchool(articles, 'Centro desconocido'), articles);
assert.deepEqual(reservationArticlesForSchool(articles, ''), []);

const records = [
  { id: '9', kind: 'reserva' },
  { id: '2', kind: 'incidencia' },
  { id: '3', kind: 'reserva' },
  { id: '9', kind: 'reserva' },
];
assert.equal(mondayReservationUpdateItemIds(records), '3,9');

const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of ['mondayReservationUpdateItemIds(', 'reservationArticlesForSchool('])
  if (!page.includes(fragment)) throw new Error(`La pantalla no usa la opción compartida: ${fragment}`);
rmSync(folder, { recursive: true, force: true });
console.log('Opciones compartidas de reservas verificadas.');
