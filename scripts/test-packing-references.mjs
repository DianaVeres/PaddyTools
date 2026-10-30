import assert from 'node:assert/strict';
import {
  dictatedPackingReferences,
  mergePackingDictation,
  normalizePackingReference,
  packingListType,
  parsePackingBoxes,
} from '../lib/packing-references.ts';

assert.equal(normalizePackingReference(' rpa 10 633 '), 'RPA10633');
assert.equal(packingListType('PA49547'), 'on-line');
assert.equal(packingListType('IPA49547'), 'Incidencia');
assert.equal(packingListType('R10692'), 'Reserva');

assert.deepEqual(
  parsePackingBoxes('Caja 1: PA 49547, R10692\nCaja 2: IPA 48944, RPA10633'),
  [
    { box: 'CAJA 1', orderNumber: 'PA49547' },
    { box: 'CAJA 1', orderNumber: 'R10692' },
    { box: 'CAJA 2', orderNumber: 'IPA48944' },
    { box: 'CAJA 2', orderNumber: 'RPA10633' },
  ],
);

assert.deepEqual(
  dictatedPackingReferences(
    'caja uno pe a cuatro nueve cinco cuatro siete caja dos reserva uno cero seis nueve dos',
  ).lines,
  ['CAJA 1: PA49547', 'CAJA 2: R10692'],
);
assert.deepEqual(
  dictatedPackingReferences('incidencia pe a cuatro ocho nueve cuatro cuatro')
    .references,
  ['IPA48944'],
);
assert.deepEqual(
  dictatedPackingReferences('reserva pe a uno cero seis tres tres').references,
  ['RPA10633'],
);
assert.deepEqual(
  mergePackingDictation(
    'CAJA 1: PA49547',
    'caja uno reserva uno cero seis nueve dos',
  ),
  { text: 'CAJA 1: PA49547, R10692', count: 1 },
);

console.log('Referencias y cajas de PackingList verificadas.');
