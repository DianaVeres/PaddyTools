import { searchKey } from './global-search.ts';
import { mondayRequest } from './monday-client.ts';
import {
  MONDAY_BOARDS,
  MONDAY_RESERVATION_COLUMNS,
} from './monday-config.ts';
import { loadMondayItemFormula } from './monday-read.ts';

type MondayColumn = { id: string; title: string; type: string };

async function boardColumns(boardId: string, token: string) {
  const schema = (await mondayRequest(
    `query ($id:[ID!]!){boards(ids:$id){columns{id title type}}}`,
    { id: [boardId] },
    token,
  )) as { boards?: Array<{ columns?: MondayColumn[] }> };
  return schema.boards?.[0]?.columns || [];
}

async function createMondayCustomer(
  body: Record<string, unknown>,
  token: string,
) {
  const customerBoard = '5098189262';
  const columns = await boardColumns(customerBoard, token);
  const phoneColumn = columns.find(
    (column) => searchKey(column.title) === 'TELEFONO',
  );
  const emailColumn = columns.find((column) =>
    ['E MAIL', 'EMAIL'].includes(searchKey(column.title)),
  );
  const schoolColumn = columns.find(
    (column) => searchKey(column.title) === 'COLEGIO',
  );
  const values: Record<string, unknown> = {};
  if (phoneColumn && body.phone) {
    values[phoneColumn.id] =
      phoneColumn.type === 'phone'
        ? { phone: String(body.phone), countryShortName: 'ES' }
        : String(body.phone);
  }
  if (emailColumn && body.customerEmail) {
    values[emailColumn.id] =
      emailColumn.type === 'email'
        ? {
            email: String(body.customerEmail),
            text: String(body.customerEmail),
          }
        : String(body.customerEmail);
  }
  if (schoolColumn && body.school) {
    if (schoolColumn.type === 'status' || schoolColumn.type === 'color') {
      values[schoolColumn.id] = { label: String(body.school) };
    } else if (schoolColumn.type === 'dropdown') {
      values[schoolColumn.id] = { labels: [String(body.school)] };
    } else if (['text', 'long_text'].includes(schoolColumn.type)) {
      values[schoolColumn.id] = String(body.school);
    }
  }
  const created = (await mondayRequest(
    `mutation ($board:ID!,$name:String!,$values:JSON!){create_item(board_id:$board,item_name:$name,column_values:$values){id}}`,
    {
      board: customerBoard,
      name: String(body.customerName),
      values: JSON.stringify(values),
    },
    token,
  )) as { create_item?: { id?: string } };
  const customerId = created.create_item?.id || '';
  if (!customerId) {
    throw new Error('Monday no devolvió el identificador del cliente nuevo.');
  }
  return customerId;
}

export async function mondayReservationValues(
  body: Record<string, unknown>,
  token: string,
) {
  const columnValues: Record<string, unknown> = {};
  const put = (
    key: keyof typeof MONDAY_RESERVATION_COLUMNS,
    value: unknown,
  ) => {
    if (value !== undefined && value !== null && value !== '') {
      columnValues[MONDAY_RESERVATION_COLUMNS[key]] = value;
    }
  };
  let customerId = String(body.customerId || '');
  if (!customerId && body.createCustomer && body.customerName) {
    customerId = await createMondayCustomer(body, token);
  }
  if (!customerId) {
    throw new Error('Selecciona un cliente existente o crea uno nuevo.');
  }
  put('customer', { item_ids: [Number(customerId)] });
  put('school', body.school ? { label: String(body.school) } : undefined);
  put('date', body.date ? { date: String(body.date) } : undefined);
  put(
    'article',
    body.articleId ? { item_ids: [Number(body.articleId)] } : undefined,
  );
  put('size', body.size);
  put('units', body.units ? Number(body.units) : undefined);
  put('paid', body.paid ? { label: String(body.paid) } : undefined);
  put(
    'observations',
    body.observations ? { labels: [String(body.observations)] } : undefined,
  );
  put('status', body.status ? { label: String(body.status) } : undefined);
  put('endDate', body.endDate ? { date: String(body.endDate) } : undefined);
  put(
    'productionDate',
    body.productionDate ? { date: String(body.productionDate) } : undefined,
  );

  const extras = [
    { labels: ['U ENVIADAS'], value: body.sentUnits },
    { labels: ['U PENDIENTES'], value: body.pending },
    {
      labels: ['ENTREGA ESTIMADA PRODUCCION'],
      value: body.estimatedProduction,
    },
  ].filter(
    (entry) =>
      entry.value !== undefined && entry.value !== null && entry.value !== '',
  );
  if (extras.length) {
    const columns = await boardColumns(MONDAY_BOARDS[0].id, token);
    for (const extra of extras) {
      const column = columns.find((candidate) =>
        extra.labels.includes(searchKey(candidate.title)),
      );
      if (!column || column.type === 'formula') continue;
      const raw = String(extra.value);
      columnValues[column.id] =
        column.type === 'numbers'
          ? Number(raw)
          : column.type === 'date'
            ? { date: raw }
            : column.type === 'checkbox'
              ? {
                  checked: ['1', 'SI', 'SÍ', 'TRUE', 'YES'].includes(
                    searchKey(raw),
                  ),
                }
              : column.type === 'status' || column.type === 'color'
                ? { label: raw }
                : raw;
    }
  }
  return columnValues;
}

export async function createMondayReservation(
  reference: string,
  body: Record<string, unknown>,
  token: string,
) {
  const values = await mondayReservationValues(body, token);
  const result = (await mondayRequest(
    `mutation ($board:ID!,$name:String!,$values:JSON!){create_item(board_id:$board,item_name:$name,column_values:$values){id}}`,
    {
      board: MONDAY_BOARDS[0].id,
      name: reference,
      values: JSON.stringify(values),
    },
    token,
  )) as { create_item?: { id?: string } };
  const id = result.create_item?.id || '';
  return {
    id,
    board: MONDAY_BOARDS[0].name,
    formula: await loadMondayItemFormula(id, token),
  };
}

export async function updateMondayReservation(
  id: string,
  body: Record<string, unknown>,
  token: string,
) {
  const values = await mondayReservationValues(body, token);
  const result = (await mondayRequest(
    `mutation ($board:ID!,$item:ID!,$values:JSON!){change_multiple_column_values(board_id:$board,item_id:$item,column_values:$values){id}}`,
    {
      board: MONDAY_BOARDS[0].id,
      item: id,
      values: JSON.stringify(values),
    },
    token,
  )) as { change_multiple_column_values?: { id?: string } };
  const updatedId = result.change_multiple_column_values?.id || id;
  return {
    id: updatedId,
    formula: await loadMondayItemFormula(updatedId, token),
  };
}
