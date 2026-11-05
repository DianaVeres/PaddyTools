import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  acceptedPaymentStatusSlug,
  validExclusiveCutoff,
} from '../lib/woo-initial-status-count.ts';

const root = resolve(import.meta.dirname, '..');
const route = readFileSync(
  resolve(root, 'app/api/kpi-order-count/route.ts'),
  'utf8',
);
const timer = readFileSync(
  resolve(root, 'components/kpis/kpi-timer.tsx'),
  'utf8',
);

assert.equal(
  acceptedPaymentStatusSlug([
    { slug: 'wc-processing', name: 'Procesando' },
    { slug: 'wc-pago-aceptado', name: 'Pago Aceptado' },
  ]),
  'pago-aceptado',
);
assert.equal(acceptedPaymentStatusSlug([]), 'pago-aceptado');
assert.equal(validExclusiveCutoff('2026-11-05'), true);
assert.equal(validExclusiveCutoff('2026-02-30'), false);

for (const fragment of [
  'getSessionUser(request)',
  'countAcceptedPaymentOrders(cutoffDate, config)',
  "searchParams.get('before')",
])
  if (!route.includes(fragment))
    throw new Error(`El recuento protegido ha perdido: ${fragment}`);

for (const fragment of [
  "activity === 'estado_inicial'",
  'loadInitialStatusOrderCount(exclusiveCutoff)',
  'initialOrders = result.orders',
  'No hay pedidos en Pago Aceptado hasta ayer',
  'Pedidos en Pago Aceptado hasta ${active.volumeCutoff}.',
  "active.activity === 'estado_inicial' &&",
  "field === 'orders' &&",
  "typeof active.initialOrders === 'number'",
])
  if (!timer.includes(fragment))
    throw new Error(`El contador de estado inicial ha perdido: ${fragment}`);

console.log('Volumen automático de Pago Aceptado verificado.');
