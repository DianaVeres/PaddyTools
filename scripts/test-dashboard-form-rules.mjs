import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'lib/dashboard-form-rules.ts'), 'utf8');
const contactSource = readFileSync(resolve(root, 'lib/contact-links.ts'), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace("from '@/lib/contact-links'", "from './contact-links.js'")
  .replace(/import[^;]+dashboard-types';\n/, '');
const contactJs = ts.transpileModule(contactSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const folder = mkdtempSync(join(tmpdir(), 'paddytools-form-rules-'));
writeFileSync(resolve(folder, 'contact-links.js'), contactJs);
writeFileSync(resolve(folder, 'dashboard-form-rules.js'), js);
const { validateReservationDraft } =
  await import(`file:///${resolve(folder, 'dashboard-form-rules.js').replaceAll('\\', '/')}?v=${Date.now()}`);

const reservation = {
  reference: 'R100', customerId: '', customerName: 'Ana', phone: '612345678',
  customerEmail: 'ana@example.com', school: 'Shackleton', date: '2026-11-03', articleId: 'A1',
  size: '10', units: 1, sentUnits: 0, pending: 1, paid: 'SÍ', observations: '', status: '',
  endDate: '', productionDate: '', estimatedProduction: '', formula: '',
};
assert.equal(validateReservationDraft(reservation, { newCustomer: true, linkedCustomer: false }), '');
assert.equal(
  validateReservationDraft({ ...reservation, customerEmail: 'incorrecto' }, { newCustomer: true, linkedCustomer: false }),
  'El e-mail del cliente nuevo no tiene un formato válido.',
);
assert.equal(
  validateReservationDraft(reservation, { newCustomer: false, linkedCustomer: false }),
  'Selecciona un cliente del desplegable o pulsa Nuevo para crearlo.',
);
rmSync(folder, { recursive: true, force: true });
console.log('Reglas compartidas de formularios verificadas.');
