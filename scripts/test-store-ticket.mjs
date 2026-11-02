import assert from 'node:assert/strict';
import {
  normalizeTicketNumber,
  parseTicketItems,
} from '../lib/store-ticket.ts';

assert.equal(normalizeTicketNumber(' #10013 '), '10013');
assert.equal(normalizeTicketNumber(' le2000319262 '), 'LE2000319262');
assert.equal(normalizeTicketNumber(''), '');
assert.deepEqual(parseTicketItems('[{"name":"Polo","units":2}]'), [
  { name: 'Polo', units: 2 },
]);
assert.deepEqual(parseTicketItems('{"name":"Polo"}'), []);
assert.deepEqual(parseTicketItems('texto no válido'), []);

console.log('Tickets de tienda verificados.');
