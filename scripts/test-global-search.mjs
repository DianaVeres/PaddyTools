import assert from 'node:assert/strict';
import {
  foldSearchText,
  isExactRecordReference,
  incidentReferenceCandidates,
  incidentStorageReference,
  isWooOrderReference,
  linkedWooOrderReference,
  mondayReferenceCandidates,
  normalizeReferenceInput,
  searchDigits,
  searchKey,
  reservationStorageReference,
  shippingReferences,
  wooSearchVariants,
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
assert.deepEqual(incidentReferenceCandidates('PA49547'), [
  'PA49547',
  'IPA49547',
  'RPA49547',
]);
assert.deepEqual(incidentReferenceCandidates('IPA49547'), [
  'IPA49547',
  'PA49547',
  'RPA49547',
]);
assert.deepEqual(incidentReferenceCandidates('RPA49547'), [
  'RPA49547',
  'IRPA49547',
  'PA49547',
  'IPA49547',
]);
assert.deepEqual(incidentReferenceCandidates('#R10692'), [
  'R10692',
  'IR10692',
]);
assert.deepEqual(incidentReferenceCandidates('INC-000001'), [
  'INC-000001',
  'IINC-000001',
]);
assert.equal(incidentStorageReference('PA49547'), 'IPA49547');
assert.equal(incidentStorageReference('IPA49547'), 'IPA49547');
assert.equal(incidentStorageReference('RPA49547'), 'IPA49547');
assert.equal(incidentStorageReference('R10692'), 'IR10692');
assert.equal(reservationStorageReference('PA49547'), 'RPA49547');
assert.equal(reservationStorageReference('IPA49547'), 'RPA49547');
assert.equal(reservationStorageReference('RPA49547'), 'RPA49547');
assert.equal(reservationStorageReference('R10692'), 'R10692');

assert.equal(searchKey('  Sandra-Flórez  '), 'SANDRA FLOREZ');
assert.equal(searchDigits('+34 612 345 678'), '34612345678');
assert.deepEqual(wooSearchVariants('Sandra Flórez'), [
  'Sandra Flórez',
  'Sandra Florez',
  'Sandra',
  'Flórez',
  'Florez',
]);
assert.deepEqual(wooSearchVariants('612 345 678'), ['612345678', '612 345 678', '612', '345', '678']);

console.log('Búsqueda global verificada.');
