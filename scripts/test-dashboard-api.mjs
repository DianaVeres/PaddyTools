import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const api = readFileSync(resolve(root, 'lib/dashboard-api.ts'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const endpoint of [
  '/api/auth/session',
  '/api/auth/logout',
  '/api/search',
  '/api/monday',
  '/api/incidents',
  '/api/order-notes',
  '/api/order-documents',
  '/api/return-attended',
  '/api/shipping',
  '/api/tickets',
]) assert.ok(api.includes(endpoint), `Falta centralizar ${endpoint}`);

for (const method of [
  'searchConnectedRecords',
  'searchExactConnected',
  'fetchOrderNotes',
  'postOrderNote',
  'removeOrderNote',
  'setRemoteReturnAttended',
  'fetchOrderDocument',
  'fetchReservationOptions',
  'fetchReservations',
  'fetchIncidentRegistry',
  'patchIncident',
  'removeIncident',
]) assert.ok(page.includes(`${method}(`), `La pantalla no usa ${method}`);

for (const fragment of [
  'onWooMatches:',
  'onMondayMatches:',
  'onIncidentMatches:',
  'onOrder:',
]) assert.ok(page.includes(fragment), `La búsqueda progresiva ha perdido: ${fragment}`);

assert.equal(page.includes('fetch('), false, 'La pantalla principal no debe realizar peticiones directas');
console.log('Cliente único del panel principal verificado.');
