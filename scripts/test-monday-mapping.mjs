import assert from 'node:assert/strict';
import { MONDAY_BOARDS } from '../lib/monday-config.ts';
import {
  mondayColumnEmail,
  mondayColumnPhone,
  mondayReservationBaseReference,
  normalizeMondayItem,
} from '../lib/monday-mapping.ts';

assert.equal(mondayReservationBaseReference(' r10692 (copy) '), 'R10692');
assert.equal(mondayReservationBaseReference('R10692 (COPY) (copy)'), 'R10692');
assert.equal(
  mondayColumnPhone({ id: 'phone', value: '{"phone":"612345678"}' }),
  '612345678',
);
assert.equal(
  mondayColumnEmail({ id: 'email', value: '{"email":"ana@example.com"}' }),
  'ana@example.com',
);
assert.equal(mondayColumnPhone({ id: 'phone', value: 'no-json' }), '');

const mapped = normalizeMondayItem(
  {
    id: 'ITEM-1',
    name: 'R10692',
    updated_at: '2026-10-30T10:00:00Z',
    column_values: [
      { id: 'name', text: 'Ana', column: { title: 'CLIENTE' } },
      { id: 'school', text: 'PURISIMA', column: { title: 'COLEGIO' } },
      {
        id: 'board_relation_mm458cjj',
        linked_item_ids: ['CUSTOMER-1'],
        column: { title: 'Cliente relacionado' },
      },
    ],
  },
  MONDAY_BOARDS[0],
);
assert.equal(mapped.reference, 'R10692');
assert.equal(mapped.customer, 'Ana');
assert.equal(mapped.school, 'PURISIMA');
assert.deepEqual(mapped.customerIds, ['CUSTOMER-1']);

console.log('Mapeo de Monday verificado.');
