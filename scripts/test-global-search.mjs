import assert from 'node:assert/strict';
import {
  foldSearchText,
  isExactRecordReference,
  isWooOrderReference,
  linkedWooOrderReference,
  mondayReferenceCandidates,
  normalizeReferenceInput,
  shippingReferences,
} from '../lib/global-search.ts';

assert.equal(foldSearchText('Sandra Flórez'), 'sandraflorez');
assert.equal(foldSearchText('  SAGRADO CORAZÓN  '), 'sagradocorazon');
assert.equal(foldSearchText('José-Lluch / Web'), 'joselluchweb');

assert.deepEqual(shippingReferences('R10633'), ['R10633']);
assert.deepEqual(shippingReferences('#IPA49547'), [
  'IPA49547',
  'PA49547',
  'RPA49547',
]);
assert.deepEqual(shippingReferences('pa49547'), [
  'PA49547',
  'IPA49547',
  'RPA49547',
]);
assert.deepEqual(shippingReferences('RPA49547'), [
  'RPA49547',
  'PA49547',
  'IPA49547',
]);
assert.deepEqual(shippingReferences(''), []);

assert.equal(normalizeReferenceInput(' #pa49547 '), 'PA49547');
assert.equal(linkedWooOrderReference('PA49547'), 'PA49547');
assert.equal(linkedWooOrderReference('IPA49547'), 'PA49547');
assert.equal(linkedWooOrderReference('RPA49547'), 'PA49547');
assert.equal(linkedWooOrderReference('IR10692'), 'R10692');
assert.equal(isWooOrderReference('RPA49547'), true);
assert.equal(isWooOrderReference('R10692'), false);
assert.equal(isExactRecordReference('#R10692'), true);
assert.equal(isExactRecordReference('Sandra Flórez'), false);

assert.deepEqual(mondayReferenceCandidates('RPA49547'), [
  'RPA49547',
  'PA49547',
  'IPA49547',
  '49547',
  '#49547',
]);
assert.deepEqual(mondayReferenceCandidates('#R10692'), ['R10692', '#R10692']);
assert.deepEqual(mondayReferenceCandidates(''), []);

console.log('Búsqueda global verificada.');
