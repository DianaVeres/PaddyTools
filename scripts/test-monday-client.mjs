import assert from 'node:assert/strict';
import {
  allMondayBoardItems,
  mondayRequest,
} from '../lib/monday-client.ts';

const originalFetch = globalThis.fetch;
try {
  let calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  assert.deepEqual(await mondayRequest('query Test', { id: 1 }, 'TOKEN'), {
    ok: true,
  });
  assert.equal(calls[0].url, 'https://api.monday.com/v2');
  assert.equal(calls[0].options.headers.authorization, 'TOKEN');
  assert.equal(calls[0].options.headers['api-version'], '2025-04');

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ errors: [{ message: 'Consulta inválida' }] }), {
      status: 200,
    });
  await assert.rejects(
    mondayRequest('query Error', {}, 'TOKEN'),
    /Consulta inválida/,
  );

  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(
    mondayRequest('query Error', {}, 'TOKEN'),
    /Monday respondió 503/,
  );

  let page = 0;
  globalThis.fetch = async () => {
    page += 1;
    const data =
      page === 1
        ? {
            boards: [
              {
                items_page: {
                  cursor: 'CURSOR-2',
                  items: [{ id: '1', name: 'R1', column_values: [] }],
                },
              },
            ],
          }
        : {
            next_items_page: {
              cursor: null,
              items: [{ id: '2', name: 'R2', column_values: [] }],
            },
          };
    return new Response(JSON.stringify({ data }), { status: 200 });
  };
  assert.deepEqual(
    (await allMondayBoardItems('BOARD', 'TOKEN')).map((item) => item.name),
    ['R1', 'R2'],
  );
  assert.equal(page, 2);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Cliente de Monday verificado.');
