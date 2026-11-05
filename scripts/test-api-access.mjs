import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPublicApiRequest } from '../lib/api-access.ts';

for (const path of [
  '/api/auth/login',
  '/api/auth/activate',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/health',
])
  assert.equal(isPublicApiRequest(path, 'GET'), true, path);

assert.equal(isPublicApiRequest('/api/tickets', 'POST'), true);
assert.equal(isPublicApiRequest('/api/tickets', 'GET'), false);
for (const path of [
  '/api/incidents',
  '/api/packing-lists',
  '/api/search',
  '/api/monday',
  '/api/order-documents',
  '/api/kpi-order-count',
  '/api/return-attended',
  '/api/shipping',
])
  assert.equal(isPublicApiRequest(path, 'GET'), false, path);

const activationPage = readFileSync(
  new URL('../app/activate/page.tsx', import.meta.url),
  'utf8',
);
for (const fragment of [
  'Activar mi cuenta',
  '/api/auth/activate',
  'minLength={10}',
  'Las dos contraseñas no coinciden.',
])
  assert.ok(
    activationPage.includes(fragment),
    `La activación segura ha perdido: ${fragment}`,
  );

console.log('Acceso público y protegido de las API verificado.');
