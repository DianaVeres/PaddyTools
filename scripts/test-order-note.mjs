import assert from 'node:assert/strict';
import {
  normalizeOrderNoteContent,
  normalizeOrderNoteKind,
  normalizeOrderNoteReference,
} from '../lib/order-note.ts';

assert.equal(normalizeOrderNoteKind('llamada'), 'llamada');
assert.equal(normalizeOrderNoteKind('email'), 'email');
assert.equal(normalizeOrderNoteKind('otro'), 'nota');
assert.equal(normalizeOrderNoteReference(' #r10692 '), 'R10692');
assert.equal(normalizeOrderNoteReference('rpa49547'), 'RPA49547');
assert.equal(normalizeOrderNoteContent('  Ha llamado la clienta.  '), 'Ha llamado la clienta.');

console.log('Notas internas verificadas.');
