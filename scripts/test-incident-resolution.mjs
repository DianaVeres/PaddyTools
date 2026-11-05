import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(
  resolve(root, 'lib/incident-resolution.ts'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`;
const { resolvedIncidentState } = await import(moduleUrl);

const evaluate = (state, requestedSolved = false) =>
  resolvedIncidentState(
    {
      pickupRequired: false,
      pickupReceived: false,
      shippingRequired: false,
      sent: false,
      ...state,
    },
    requestedSolved,
  );

assert.equal(evaluate({}, true), true, 'Sin acciones admite cierre manual');
assert.equal(
  evaluate({}, false),
  false,
  'Sin acciones respeta pendiente manual',
);
assert.equal(evaluate({ pickupRequired: true }), false);
assert.equal(
  evaluate({ pickupRequired: true, pickupReceived: true }),
  true,
  'La recogida completada resuelve',
);
assert.equal(evaluate({ shippingRequired: true }), false);
assert.equal(
  evaluate({ shippingRequired: true, sent: true }),
  true,
  'El envío completado resuelve',
);
assert.equal(
  evaluate(
    { pickupRequired: true, pickupReceived: true, shippingRequired: true },
    true,
  ),
  false,
  'No permite cierre manual si falta el envío',
);
assert.equal(
  evaluate({ pickupRequired: true, shippingRequired: true, sent: true }),
  false,
  'No resuelve si falta la recogida',
);
assert.equal(
  evaluate({
    pickupRequired: true,
    pickupReceived: true,
    shippingRequired: true,
    sent: true,
  }),
  true,
  'Recogida y envío completados resuelven',
);

console.log('Resolución condicional de incidencias verificada.');
