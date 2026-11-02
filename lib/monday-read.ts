import { searchKey } from './global-search.ts';
import {
  mondayRequest,
  type MondayColumnValue,
  type MondayItem,
} from './monday-client.ts';
import {
  mondayColumnEmail,
  mondayColumnPhone,
} from './monday-mapping.ts';

export async function loadMondayCustomerContacts(
  records: Array<{ customerIds: string[] }>,
  token: string,
) {
  const customerIds = [
    ...new Set(records.flatMap((record) => record.customerIds)),
  ];
  const contacts = new Map<string, { phone: string; email: string }>();
  for (let start = 0; start < customerIds.length; start += 100) {
    const customerData = (await mondayRequest(
      `query ($ids:[ID!]!){items(ids:$ids){id column_values{id text value column{title}}}}`,
      { ids: customerIds.slice(start, start + 100) },
      token,
    )) as { items?: MondayItem[] };
    for (const customer of customerData.items || []) {
      const phoneColumn = (customer.column_values || []).find((value) =>
        searchKey(value.column?.title || value.id).includes('TELEFONO'),
      );
      const emailColumn = (customer.column_values || []).find((value) =>
        ['EMAIL', 'E MAIL'].includes(
          searchKey(value.column?.title || value.id),
        ),
      );
      contacts.set(String(customer.id), {
        phone: mondayColumnPhone(phoneColumn),
        email: mondayColumnEmail(emailColumn),
      });
    }
  }
  return contacts;
}

export async function loadMondayItemFormula(itemId: string, token: string) {
  if (!itemId) return '';
  const data = (await mondayRequest(
    `query ($ids:[ID!]!){items(ids:$ids){column_values{id text ... on FormulaValue {display_value} column{title}}}}`,
    { ids: [itemId] },
    token,
  )) as { items?: Array<{ column_values?: MondayColumnValue[] }> };
  const formula = (data.items?.[0]?.column_values || []).find(
    (value) => searchKey(value.column?.title || value.id) === 'FORMULA',
  );
  return String(formula?.display_value || formula?.text || '').trim();
}
