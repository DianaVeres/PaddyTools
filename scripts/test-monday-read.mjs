import assert from 'node:assert/strict';
import {
  loadMondayCustomerContacts,
  loadMondayItemFormula,
} from '../lib/monday-read.ts';

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const isFormula = request.query.includes('FormulaValue');
    const data = isFormula
      ? {
          items: [
            {
              column_values: [
                {
                  id: 'formula',
                  display_value: '15/11/2026',
                  column: { title: 'FÓRMULA' },
                },
              ],
            },
          ],
        }
      : {
          items: [
            {
              id: 'CUSTOMER-1',
              name: 'Ana',
              column_values: [
                {
                  id: 'phone',
                  value: '{"phone":"612345678"}',
                  column: { title: 'TELÉFONO' },
                },
                {
                  id: 'email',
                  value: '{"email":"ana@example.com"}',
                  column: { title: 'E-MAIL' },
                },
              ],
            },
          ],
        };
    return new Response(JSON.stringify({ data }), { status: 200 });
  };

  const contacts = await loadMondayCustomerContacts(
    [{ customerIds: ['CUSTOMER-1'] }],
    'TOKEN',
  );
  assert.deepEqual(contacts.get('CUSTOMER-1'), {
    phone: '612345678',
    email: 'ana@example.com',
  });
  assert.equal(
    await loadMondayItemFormula('ITEM-1', 'TOKEN'),
    '15/11/2026',
  );
  assert.equal(await loadMondayItemFormula('', 'TOKEN'), '');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Lecturas de Monday verificadas.');
