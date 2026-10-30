import assert from 'node:assert/strict';
import {
  canDeleteIncidents,
  normalizedUserName,
} from '../lib/permissions.ts';

assert.equal(normalizedUserName('Rocío Sáez'), 'rociosaez');
assert.equal(
  canDeleteIncidents({ email: 'rociosaez@paddy.es', displayName: 'Rocío' }),
  true,
);
assert.equal(
  canDeleteIncidents({
    email: 'otra.persona@paddy.es',
    displayName: 'Administración',
  }),
  true,
);
assert.equal(
  canDeleteIncidents({ email: 'tienda@paddy.es', displayName: 'Tienda' }),
  false,
);
assert.equal(canDeleteIncidents(null), false);

console.log('Permisos de eliminación de incidencias verificados.');
