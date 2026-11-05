import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canCreateOwnIncidents,
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
assert.equal(
  canCreateOwnIncidents({
    email: 'administracion@paddy.es',
    displayName: 'Administración',
  }),
  true,
);
assert.equal(
  canCreateOwnIncidents({ email: 'eliafuentes@paddy.es', displayName: 'Elia' }),
  false,
);

const incidentRoute = readFileSync(
  new URL('../app/api/incidents/route.ts', import.meta.url),
  'utf8',
);
const compatibility = readFileSync(
  new URL('../public/incidencias-compat.js', import.meta.url),
  'utf8',
);
for (const fragment of [
  'canCreateOwnIncidents(user)',
  "sourceType === 'manual'",
  'Solo Rocío o Administración pueden crear Incidencias nuestras.',
])
  assert.ok(
    incidentRoute.includes(fragment),
    `La API ha perdido el bloqueo de incidencias nuestras: ${fragment}`,
  );
for (const fragment of [
  "request('/api/auth/session')",
  "document.getElementById('ownBtn')",
  'ownAccessButton.hidden = true',
  'ownAccessButton.hidden = false',
  "reserveAutomaticIncidentId('manual')",
])
  assert.ok(
    compatibility.includes(fragment),
    `La interfaz ha perdido el bloqueo de incidencias nuestras: ${fragment}`,
  );

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
