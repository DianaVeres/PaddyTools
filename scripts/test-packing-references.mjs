import assert from 'node:assert/strict';
import {
  appendScannedPackingReference,
  deduplicatePackingBoxText,
  dictatedPackingReferences,
  mergePackingDictation,
  normalizePackingScannerInput,
  normalizePackingReference,
  packingListType,
  parsePackingBoxes,
} from '../lib/packing-references.ts';

const hardwareScan = deduplicatePackingBoxText(
  'CAJA 1: R12140, IPA51355, R12140\nCAJA 2: IPA51355, PA50001',
);
assert.equal(
  hardwareScan.text,
  'CAJA 1: R12140, IPA51355\nCAJA 2: PA50001',
  'el lector fisico no debe insertar dos veces una referencia',
);
assert.deepEqual(hardwareScan.duplicates, ['R12140', 'IPA51355']);

assert.equal(
  normalizePackingScannerInput(
    'CAJA 1: PA50001\nPADDY:R12140\nIPA51355\nCAJA 2\nPADDY:PA50002\nR12141\n',
  ),
  'CAJA 1: PA50001, R12140, IPA51355\nCAJA 2: PA50002, R12141\n',
  'el lector físico debe agrupar cada lectura en la caja activa',
);
assert.deepEqual(
  parsePackingBoxes('CAJA 1: PA50001\nPADDY:R12140\nCAJA 2\nPADDY:PA50002'),
  [
    { box: 'CAJA 1', orderNumber: 'PA50001' },
    { box: 'CAJA 1', orderNumber: 'R12140' },
    { box: 'CAJA 2', orderNumber: 'PA50002' },
  ],
);

const scanned = appendScannedPackingReference(
  'CAJA 1: R1234',
  'PADDY:IPA49547',
);
assert.equal(scanned.text, 'CAJA 1: R1234, IPA49547');
assert.equal(scanned.error, '');
assert.match(
  appendScannedPackingReference(scanned.text, 'IPA49547').error,
  /ya está incluido/,
);
assert.equal(
  appendScannedPackingReference('CAJA 1: ', 'INC-2026-001').reference,
  'INC-2026-001',
);

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
