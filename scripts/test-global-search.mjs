import assert from 'node:assert/strict';
import { foldSearchText, shippingReferences } from '../lib/global-search.ts';

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

console.log('Búsqueda global verificada.');
