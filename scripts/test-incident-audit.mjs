import assert from 'node:assert/strict';
import {
  appendIncidentAudit,
  latestIncidentAudit,
  readIncidentAudit,
} from '../lib/incident-audit.ts';

const actor = { email: 'rocio@paddy.es', displayName: 'Rocío Sáez' };
const first = appendIncidentAudit(
  '',
  'Incidencia creada',
  actor,
  '2026-11-13T09:00:00.000Z',
);
const second = appendIncidentAudit(
  first,
  'Recogida marcada como recibida',
  actor,
  '2026-11-13T10:00:00.000Z',
);
const entries = readIncidentAudit(second);
assert.equal(entries.length, 2);
assert.equal(entries[0].userName, 'Rocío Sáez');
assert.equal(
  latestIncidentAudit(entries, 'Recogida marcada como recibida')?.userEmail,
  'rocio@paddy.es',
);
assert.deepEqual(readIncidentAudit('contenido antiguo no válido'), []);

console.log('Historial de usuarios de incidencias verificado.');
