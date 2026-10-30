import assert from 'node:assert/strict';
import { readJsonResponse } from '../lib/http-response.ts';

assert.deepEqual(
  await readJsonResponse(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ),
  { ok: true },
);
assert.deepEqual(
  await readJsonResponse(new Response(null, { status: 204 }), { empty: {} }),
  {},
);
await assert.rejects(
  () =>
    readJsonResponse(
      new Response('<!DOCTYPE html><h1>Error</h1>', { status: 502 }),
      { source: 'WooCommerce' },
    ),
  /WooCommerce respondió 502 con un formato no válido/,
);
await assert.rejects(
  () => readJsonResponse(new Response('', { status: 503 })),
  /PaddyTools respondió 503 sin datos/,
);

console.log('Lectura segura de respuestas JSON verificada.');
