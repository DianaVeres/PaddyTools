import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/incident-navigation.ts'), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const folder = mkdtempSync(join(tmpdir(), 'paddytools-incident-navigation-'));
const modulePath = resolve(folder, 'incident-navigation.mjs');
writeFileSync(modulePath, output);
const { createIncidentHref, openIncidentHref } = await import(
  `file:///${modulePath.replaceAll('\\', '/')}?v=${Date.now()}`
);

assert.equal(createIncidentHref(' PA50596 '), '/incidencias?createIncident=PA50596');
assert.equal(
  openIncidentHref('I11336', 'tienda'),
  '/incidencias?openIncident=I11336&source=tienda',
);

rmSync(folder, { recursive: true, force: true });
console.log('Navegación única de incidencias verificada.');
