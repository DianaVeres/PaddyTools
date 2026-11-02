import assert from 'node:assert/strict';
import { mondayReservationValues } from '../lib/monday-write.ts';

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    if (request.query.includes('boards(ids:$id)')) {
      return new Response(
        JSON.stringify({
          data: {
            boards: [
              {
                columns: [
                  { id: 'sent', title: 'U. ENVIADAS', type: 'numbers' },
                  { id: 'pending', title: 'U. PENDIENTES', type: 'numbers' },
                ],
              },
            ],
          },
        }),
        { status: 200 },
      );
    }
    throw new Error('Consulta inesperada');
  };

  const values = await mondayReservationValues(
    {
      customerId: '123',
      school: 'PURISIMA',
      date: '2026-11-02',
      articleId: '456',
      size: '10',
      units: 2,
      sentUnits: 1,
      pending: 1,
      status: 'PARA PREPARAR',
    },
    'TOKEN',
  );
  assert.deepEqual(values.board_relation_mm458cjj, { item_ids: [123] });
  assert.deepEqual(values.color_mm45f745, { label: 'PURISIMA' });
  assert.deepEqual(values.date_mm45b8rj, { date: '2026-11-02' });
  assert.deepEqual(values.board_relation_mm45m9w9, { item_ids: [456] });
  assert.equal(values.numeric_mm4574r6, 2);
  assert.equal(values.sent, 1);
  assert.equal(values.pending, 1);

  await assert.rejects(
    mondayReservationValues({ school: 'PURISIMA' }, 'TOKEN'),
    /Selecciona un cliente existente/,
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Escritura de Monday verificada.');
