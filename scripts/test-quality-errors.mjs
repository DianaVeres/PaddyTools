import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateQualitySnapshot,
  validateQualityError,
} from '../lib/quality-error.ts';

const valid = validateQualityError({
  errorDate: '2026-11-03',
  process: 'packing',
  responsibleEmail: 'ANA@PADDY.ES',
  responsibleName: 'Ana',
  severity: 'grave',
  errorType: 'Colegio incorrecto',
  description: 'Se incluyó un pedido de otro colegio.',
  affectedUnits: 2,
  correctionMinutes: 15,
  recurrence: true,
  resolved: false,
});
assert.equal(valid.responsibleEmail, 'ana@paddy.es');
assert.equal(valid.affectedUnits, 2);
assert.throws(() => validateQualityError({}), /fecha/);

const metrics = calculateQualitySnapshot(
  [{ ...valid, id: '1', reference: '' }],
  [
    {
      workerEmail: 'ana@paddy.es',
      workerName: 'Ana',
      activity: 'packing',
      orders: 0,
      products: 0,
      packingLists: 20,
    },
  ],
);
assert.equal(metrics.errors, 1);
assert.equal(metrics.errorsPer100, 5);
assert.equal(metrics.severeErrors, 1);
assert.equal(metrics.recurrences, 1);
assert.equal(metrics.correctionMinutes, 15);
assert.equal(metrics.byWorker[0].errorsPer100, 5);

const root = resolve(import.meta.dirname, '..');
const page = readFileSync(resolve(root, 'app/kpis/page.tsx'), 'utf8');
const component = readFileSync(
  resolve(root, 'components/kpis/quality-dashboard.tsx'),
  'utf8',
);
const route = readFileSync(
  resolve(root, 'app/api/quality-errors/route.ts'),
  'utf8',
);
const migration = readFileSync(
  resolve(root, 'drizzle/0007_quality_errors.sql'),
  'utf8',
);
for (const fragment of ['QualityDashboard', 'loadQuality', 'selectedWorker'])
  if (!page.includes(fragment))
    throw new Error(`KPIs no integra calidad: ${fragment}`);
for (const fragment of [
  'Errores / 100 tareas',
  'Procesos a mejorar',
  'Comparativa por persona',
  'Registrar un error',
  'Tiempo de corrección',
])
  if (!component.includes(fragment))
    throw new Error(`Calidad ha perdido: ${fragment}`);
for (const fragment of [
  'getSessionUser',
  'validateQualityError',
  'calculateQualitySnapshot',
  'reporterEmail',
  'canDeleteIncidents',
  'sameWorker',
])
  if (!route.includes(fragment))
    throw new Error(`API de calidad ha perdido: ${fragment}`);
if (!migration.includes('CREATE TABLE `quality_errors`'))
  throw new Error('Falta la migración aislada de calidad.');
console.log('Calidad, errores y tasas por volumen verificados.');
