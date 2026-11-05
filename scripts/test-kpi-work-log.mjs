import assert from 'node:assert/strict';
import {
  validateKpiWorkLog,
  workDurationMinutes,
} from '../lib/kpi-work-log.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

assert.equal(workDurationMinutes('08:15', '10:00'), 105);
assert.equal(workDurationMinutes('10:00', '09:00'), 0);
assert.deepEqual(
  validateKpiWorkLog({
    workDate: '2026-11-03',
    activity: 'preparacion',
    startedAt: '08:00',
    endedAt: '10:00',
    orders: 10,
    products: 35,
    packingLists: 0,
    notes: 'Turno de mañana',
  }),
  {
    workDate: '2026-11-03',
    activity: 'preparacion',
    startedAt: '08:00',
    endedAt: '10:00',
    minutes: 120,
    orders: 10,
    products: 35,
    packingLists: 0,
    notes: 'Turno de mañana',
  },
);
assert.throws(
  () =>
    validateKpiWorkLog({
      workDate: '2026-11-03',
      activity: 'preparacion',
      startedAt: '10:00',
      endedAt: '09:00',
      orders: 1,
    }),
  /hora final/,
);
assert.equal(
  validateKpiWorkLog({
    workDate: '2026-11-03',
    activity: 'preparacion',
    startedAt: '23:59',
    endedAt: '00:01',
    measuredMinutes: 2,
    orders: 1,
  }).minutes,
  2,
);
assert.throws(
  () =>
    validateKpiWorkLog({
      workDate: '2026-11-03',
      activity: 'preparacion',
      startedAt: '08:00',
      endedAt: '09:00',
    }),
  /al menos un pedido/,
);
const route = readFileSync(
  resolve(import.meta.dirname, '../app/api/kpi-work-logs/route.ts'),
  'utf8',
);
for (const fragment of [
  'getSessionUser',
  'workerEmail: user.email',
  'workerName: user.displayName',
])
  if (!route.includes(fragment))
    throw new Error(
      `El registro KPI no identifica al usuario autenticado: ${fragment}`,
    );
console.log('Registro de tiempos KPI verificado.');
