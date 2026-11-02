import assert from 'node:assert/strict';
import { normalizeMondayUpdates } from '../lib/monday-updates.ts';

const updates = normalizeMondayUpdates([
  {
    id: 'ITEM-1',
    updates: [
      {
        id: 'UPDATE-1',
        text_body: '  Primera nota  ',
        created_at: '2026-10-01T10:00:00Z',
        creator: { name: 'Rocío' },
      },
      {
        id: 'EMPTY',
        text_body: '   ',
        created_at: '2026-11-01T10:00:00Z',
      },
    ],
  },
  {
    id: 'ITEM-2',
    updates: [
      {
        id: 'UPDATE-2',
        text_body: 'Segunda nota',
        created_at: '2026-10-02T10:00:00Z',
        creator: { email: 'administracion@paddy.es' },
      },
    ],
  },
]);

assert.deepEqual(updates.map((update) => update.id), ['UPDATE-2', 'UPDATE-1']);
assert.equal(updates[0].author, 'administracion@paddy.es');
assert.equal(updates[1].text, 'Primera nota');
assert.equal(updates[1].itemId, 'ITEM-1');

console.log('Comentarios de Monday verificados.');
