import assert from 'node:assert/strict';
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
  '/api/return-attended',
  '/api/shipping',
])
  assert.equal(isPublicApiRequest(path, 'GET'), false, path);

console.log('Acceso público y protegido de las API verificado.');
