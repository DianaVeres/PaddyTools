import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canDeleteIncidents, normalizedUserName } from '../lib/permissions.ts';

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

const rosterMigration = readFileSync(
  new URL('../drizzle/0009_user_roster.sql', import.meta.url),
  'utf8',
);
for (const expected of [
  "'eliafuentes@paddy.es', 'Elia'",
  "'lorenaverdu@paddy.es', 'Lorena'",
  "lower(`email`) = 'luzma.paddy@gmail.com'",
  'DELETE FROM `auth_sessions`',
  'DELETE FROM `auth_activation_tokens`',
])
  assert.ok(
    rosterMigration.includes(expected),
    `La plantilla de usuarios ha perdido: ${expected}`,
  );

console.log('Permisos de eliminación de incidencias verificados.');
