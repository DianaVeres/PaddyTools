import { NextRequest, NextResponse } from 'next/server';
import {
  mondayReferenceCandidates,
  normalizeReferenceInput,
  searchDigits,
  searchKey,
} from '@/lib/global-search';
import { env } from 'cloudflare:workers';
import {
  allMondayBoardItems as allBoardItems,
  mondayRequest as monday,
  type MondayColumnValue as ColumnValue,
  type MondayItem,
} from '@/lib/monday-client';
import {
  MONDAY_BOARDS as BOARDS,
  MONDAY_RESERVATION_COLUMNS as RESERVATION_COLUMNS,
  MONDAY_RESERVATION_OPTIONS as RESERVATION_OPTIONS,
} from '@/lib/monday-config';
import {
  mondayColumnEmail as columnEmail,
  mondayColumnPhone as columnPhone,
  mondayReservationBaseReference as reservationBaseReference,
  normalizeMondayItem as normalizeItem,
} from '@/lib/monday-mapping';

const cleanKey = searchKey;
const digits = searchDigits;
async function customerContacts(
  records: Array<{ customerIds: string[] }>,
  token: string,
) {
  const customerIds = [
    ...new Set(records.flatMap((record) => record.customerIds)),
  ];
  const contacts = new Map<string, { phone: string; email: string }>();
  for (let start = 0; start < customerIds.length; start += 100) {
    const customerData = (await monday(
      `query ($ids:[ID!]!){items(ids:$ids){id column_values{id text value column{title}}}}`,
      { ids: customerIds.slice(start, start + 100) },
      token,
    )) as { items?: MondayItem[] };
    for (const customer of customerData.items || []) {
      const phoneColumn = (customer.column_values || []).find((value) =>
        cleanKey(value.column?.title || value.id).includes('TELEFONO'),
      );
      const emailColumn = (customer.column_values || []).find((value) =>
        ['EMAIL', 'E MAIL'].includes(cleanKey(value.column?.title || value.id)),
      );
      contacts.set(String(customer.id), {
        phone: columnPhone(phoneColumn),
        email: columnEmail(emailColumn),
      });
    }
  }
  return contacts;
}

async function itemFormula(itemId: string, token: string) {
  if (!itemId) return '';
  const data = (await monday(
    `query ($ids:[ID!]!){items(ids:$ids){column_values{id text ... on FormulaValue {display_value} column{title}}}}`,
    { ids: [itemId] },
    token,
  )) as { items?: Array<{ column_values?: ColumnValue[] }> };
  const formula = (data.items?.[0]?.column_values || []).find(
    (value) => cleanKey(value.column?.title || value.id) === 'FORMULA',
  );
  return String(formula?.display_value || formula?.text || '').trim();
}

export async function GET(request: NextRequest) {
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'Monday todavía no está configurado.' },
      { status: 503 },
    );
  const updateIds = (request.nextUrl.searchParams.get('updatesFor') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (updateIds.length) {
    try {
      const data = (await monday(
        `query ($ids:[ID!]!){items(ids:$ids){id updates(limit:100){id text_body created_at creator{id name email}}}}`,
        { ids: updateIds },
        token,
      )) as {
        items?: Array<{
          id: string;
          updates?: Array<{
            id: string;
            text_body?: string | null;
            created_at?: string | null;
            creator?: { id?: string; name?: string; email?: string } | null;
          }>;
        }>;
      };
      const updates = (data.items || [])
        .flatMap((item) =>
          (item.updates || []).map((update) => ({
            id: update.id,
            itemId: item.id,
            text: String(update.text_body || '').trim(),
            createdAt: String(update.created_at || ''),
            author: String(update.creator?.name || update.creator?.email || 'Monday'),
          })),
        )
        .filter((update) => update.text)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return NextResponse.json({ updates });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `No se pudieron cargar los comentarios de Monday: ${error.message}`
              : 'No se pudieron cargar los comentarios de Monday.',
        },
        { status: 502 },
      );
    }
  }
  if (request.nextUrl.searchParams.get('maintenance') === 'f8626767-5497-41dd-8d0a-cc43668155d8') {
    try {
      const schema = (await monday(
        `query ($id:[ID!]!){boards(ids:$id){columns{id title}}}`,
        { id: [BOARDS[0].id] },
        token,
      )) as { boards?: Array<{ columns?: Array<{ id: string; title: string }> }> };
      const column = schema.boards?.[0]?.columns?.find(
        (candidate) => cleanKey(candidate.title) === 'ETIQUETA',
      );
      if (!column)
        return NextResponse.json({ removed: false, message: 'La columna ETIQUETA ya no existe.' });
      await monday(
        `mutation ($board:ID!,$column:String!){delete_column(board_id:$board,column_id:$column){id}}`,
        { board: BOARDS[0].id, column: column.id },
        token,
      );
      return NextResponse.json({ removed: true, column: 'ETIQUETA' });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? `No se pudo eliminar la columna ETIQUETA: ${error.message}` : 'No se pudo eliminar la columna ETIQUETA.' },
        { status: 502 },
      );
    }
  }
  if (request.nextUrl.searchParams.get('mode') === 'reservation-options') {
    try {
      const [customerItems, articleItems] = await Promise.all([
        allBoardItems('5098189262', token),
        allBoardItems('5098177612', token),
      ]);
      const customers = customerItems
        .map((item) => {
          const phoneColumn = (item.column_values || []).find((value) =>
            /TELEFONO|MOVIL|MOBILE|PHONE/.test(
              cleanKey(value.column?.title || value.id),
            ),
          );
          const emailColumn = (item.column_values || []).find((value) =>
            /EMAIL|E MAIL|CORREO|MAIL/.test(
              cleanKey(value.column?.title || value.id),
            ),
          );
          const schoolColumn = (item.column_values || []).find((value) =>
            /COLEGIO|CENTRO|ESCUELA|SCHOOL/.test(
              cleanKey(value.column?.title || value.id),
            ),
          );
          const rawSchool = String(
            schoolColumn?.text || schoolColumn?.display_value || '',
          ).trim();
          const school = RESERVATION_OPTIONS.schools.find(
            (option) => cleanKey(option) === cleanKey(rawSchool),
          ) || rawSchool;
          return {
            id: item.id,
            name: item.name,
            phone: columnPhone(phoneColumn),
            email: columnEmail(emailColumn),
            school,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      const articles = articleItems
        .map((item) => {
          const values: Record<string, string> = {};
          for (const value of item.column_values || [])
            values[cleanKey(value.column?.title || value.id)] = String(
              value.text || '',
            );
          return {
            id: item.id,
            code: item.name,
            description:
              values['DESCRIPCION ARTICULO'] || values['DESCRIPCION'] || '',
          };
        })
        .sort((a, b) => a.code.localeCompare(b.code, 'es'));
      return NextResponse.json({ ...RESERVATION_OPTIONS, customers, articles });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las opciones de Monday.',
        },
        { status: 502 },
      );
    }
  }
  if (request.nextUrl.searchParams.get('mode') === 'reservations') {
    try {
      const board = BOARDS[0];
      const rawRecords = (await allBoardItems(board.id, token))
        .map((item) => normalizeItem(item, board));
      const articleIds = [...new Set(rawRecords.flatMap((record) => record.articleIds))];
      const articleDetails = new Map<string, { code: string; description: string }>();
      for (let start = 0; start < articleIds.length; start += 100) {
        const articleData = (await monday(
          `query ($ids:[ID!]!){items(ids:$ids){id name column_values{id text column{title}}}}`,
          { ids: articleIds.slice(start, start + 100) },
          token,
        )) as { items?: MondayItem[] };
        for (const item of articleData.items || []) {
          const values: Record<string, string> = {};
          for (const value of item.column_values || [])
            values[cleanKey(value.column?.title || value.id)] = String(value.text || '').trim();
          articleDetails.set(item.id, {
            code: item.name,
            description: values['DESCRIPCION ARTICULO'] || values['DESCRIPCION'] || '',
          });
        }
      }
      const contactsByCustomer = await customerContacts(rawRecords, token);
      const records = rawRecords
        .map((record) => {
          const detail = record.articleIds.map((id) => articleDetails.get(id)).find(Boolean);
          return {
            ...record,
            phone: record.phone || record.customerIds.map((id) => contactsByCustomer.get(id)?.phone).find(Boolean) || '',
            customerEmail: record.customerIds.map((id) => contactsByCustomer.get(id)?.email).find(Boolean) || '',
            code: record.code || detail?.code || '',
            articleDescription: detail?.description || record.article || '',
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return NextResponse.json({ records });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'No se pudieron cargar las reservas.' },
        { status: 502 },
      );
    }
  }
  const searchText = request.nextUrl.searchParams.get('query')?.trim();
  if (searchText) {
    try {
      const rawRecords = (
        await Promise.all(
          BOARDS.map(async (board) => {
            return (await allBoardItems(board.id, token)).map((item) =>
              normalizeItem(item, board),
            );
          }),
        )
      ).flat();
      const contactsByCustomer = await customerContacts(rawRecords, token);
      const needle = cleanKey(searchText);
      const phoneNeedle = digits(searchText);
      const records = rawRecords
        .map((record) => ({
          ...record,
          phone:
            record.phone ||
            record.customerIds
              .map((id) => contactsByCustomer.get(id)?.phone)
              .find(Boolean) ||
            '',
          customerEmail:
            record.customerIds
              .map((id) => contactsByCustomer.get(id)?.email)
              .find(Boolean) ||
            '',
        }))
        .filter((record) => {
          const nameMatches = cleanKey(record.customer).includes(needle);
          const recordPhone = digits(record.phone);
          const phoneMatches =
            phoneNeedle.length >= 5 &&
            Boolean(recordPhone) &&
            (recordPhone.includes(phoneNeedle) || phoneNeedle.includes(recordPhone));
          return nameMatches || phoneMatches;
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return NextResponse.json({ found: records.length > 0, records });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? `No se pudo buscar en Monday: ${error.message}` : 'No se pudo buscar en Monday.' },
        { status: 502 },
      );
    }
  }
  const number = normalizeReferenceInput(
    request.nextUrl.searchParams.get('number') || '',
  );
  if (!number)
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  const numbers = mondayReferenceCandidates(number);
  const query = `query ($board: ID!, $numbers: [String]!) { items_page_by_column_values(board_id:$board, limit:100, columns:[{column_id:"name",column_values:$numbers}]) { items { id name updated_at column_values { id text ... on BoardRelationValue { display_value linked_item_ids } ... on FormulaValue { display_value } column { title } } } } }`;
  try {
    const exactRecords = (
      await Promise.all(
        BOARDS.map(async (board) => {
          const data = (await monday(
            query,
            { board: board.id, numbers },
            token,
          )) as { items_page_by_column_values?: { items?: MondayItem[] } };
          return (data.items_page_by_column_values?.items || []).map((item) =>
            normalizeItem(item, board),
          );
        }),
      )
    ).flat();
    const requestedReservation = reservationBaseReference(number);
    let relatedRecords: ReturnType<typeof normalizeItem>[] = [];
    if (/^R\d+$/i.test(requestedReservation)) {
      relatedRecords = (
        await Promise.all(
          BOARDS.map(async (board) => {
            return (await allBoardItems(board.id, token))
              .filter(
                (item) =>
                  reservationBaseReference(item.name) === requestedReservation,
              )
              .map((item) => normalizeItem(item, board));
          }),
        )
      ).flat();
    }
    const rawRecords = [
      ...new Map(
        [...exactRecords, ...relatedRecords].map((record) => [record.id, record]),
      ).values(),
    ];
    const articleIds = [
      ...new Set(rawRecords.flatMap((record) => record.articleIds)),
    ];
    const articleDetails = new Map<
      string,
      { code: string; description: string }
    >();
    if (articleIds.length) {
      const articleQuery = `query ($ids:[ID!]!){items(ids:$ids){id name column_values{id text column{title}}}}`;
      const articleData = (await monday(
        articleQuery,
        { ids: articleIds },
        token,
      )) as { items?: MondayItem[] };
      for (const item of articleData.items || []) {
        const values: Record<string, string> = {};
        for (const value of item.column_values || [])
          values[cleanKey(value.column?.title || value.id)] = String(
            value.text || '',
          ).trim();
        articleDetails.set(item.id, {
          code: item.name,
          description:
            values['DESCRIPCION ARTICULO'] || values['DESCRIPCION'] || '',
        });
      }
    }
    const contactsByCustomer = await customerContacts(rawRecords, token);
    const records = rawRecords.map(({ articleIds: ids, ...record }) => {
      const detail = ids.map((id) => articleDetails.get(id)).find(Boolean);
      return {
        ...record,
        phone:
          record.phone ||
          record.customerIds
            .map((id) => contactsByCustomer.get(id)?.phone)
            .find(Boolean) ||
          '',
        customerEmail:
          record.customerIds
            .map((id) => contactsByCustomer.get(id)?.email)
            .find(Boolean) ||
          '',
        code: record.code || detail?.code || '',
        articleDescription: detail?.description || record.article || '',
      };
    });
    return NextResponse.json({ found: records.length > 0, records });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo consultar Monday: ${error.message}`
            : 'No se pudo consultar Monday.',
      },
      { status: 502 },
    );
  }
}

async function reservationValues(
  body: Record<string, unknown>,
  token: string,
) {
  const columnValues: Record<string, unknown> = {};
  const put = (key: keyof typeof RESERVATION_COLUMNS, value: unknown) => {
    if (value !== undefined && value !== null && value !== '')
      columnValues[RESERVATION_COLUMNS[key]] = value;
  };
  let customerId = String(body.customerId || '');
  if (!customerId && body.createCustomer && body.customerName) {
    const customerBoard = '5098189262';
    const boardData = (await monday(
      `query ($id:[ID!]!){boards(ids:$id){columns{id title type}}}`,
      { id: [customerBoard] },
      token,
    )) as { boards?: Array<{ columns?: Array<{ id: string; title: string; type: string }> }> };
    const phoneColumn = boardData.boards?.[0]?.columns?.find(
      (column) => cleanKey(column.title) === 'TELEFONO',
    );
    const emailColumn = boardData.boards?.[0]?.columns?.find(
      (column) => ['E MAIL', 'EMAIL'].includes(cleanKey(column.title)),
    );
    const schoolColumn = boardData.boards?.[0]?.columns?.find(
      (column) => cleanKey(column.title) === 'COLEGIO',
    );
    const values: Record<string, unknown> = {};
    if (phoneColumn && body.phone)
      values[phoneColumn.id] = phoneColumn.type === 'phone'
        ? { phone: String(body.phone), countryShortName: 'ES' }
        : String(body.phone);
    if (emailColumn && body.customerEmail)
      values[emailColumn.id] = emailColumn.type === 'email'
        ? { email: String(body.customerEmail), text: String(body.customerEmail) }
        : String(body.customerEmail);
    if (schoolColumn && body.school) {
      // Una columna de relación no acepta el nombre del colegio como texto.
      // La omitimos en ese caso para que Monday pueda crear el cliente.
      if (schoolColumn.type === 'status' || schoolColumn.type === 'color') {
        values[schoolColumn.id] = { label: String(body.school) };
      } else if (schoolColumn.type === 'dropdown') {
        values[schoolColumn.id] = { labels: [String(body.school)] };
      } else if (['text', 'long_text'].includes(schoolColumn.type)) {
        values[schoolColumn.id] = String(body.school);
      }
    }
    const created = (await monday(
      `mutation ($board:ID!,$name:String!,$values:JSON!){create_item(board_id:$board,item_name:$name,column_values:$values){id}}`,
      { board: customerBoard, name: String(body.customerName), values: JSON.stringify(values) },
      token,
    )) as { create_item?: { id?: string } };
    customerId = created.create_item?.id || '';
    if (!customerId)
      throw new Error('Monday no devolvió el identificador del cliente nuevo.');
  }
  if (!customerId)
    throw new Error('Selecciona un cliente existente o crea uno nuevo.');
  put('customer', customerId ? { item_ids: [Number(customerId)] } : undefined);
  put('school', body.school ? { label: String(body.school) } : undefined);
  put('date', body.date ? { date: String(body.date) } : undefined);
  put('article', body.articleId ? { item_ids: [Number(body.articleId)] } : undefined);
  put('size', body.size);
  put('units', body.units ? Number(body.units) : undefined);
  put('paid', body.paid ? { label: String(body.paid) } : undefined);
  put('observations', body.observations ? { labels: [String(body.observations)] } : undefined);
  put('status', body.status ? { label: String(body.status) } : undefined);
  put('endDate', body.endDate ? { date: String(body.endDate) } : undefined);
  put('productionDate', body.productionDate ? { date: String(body.productionDate) } : undefined);
  const extras = [
    { labels: ['U ENVIADAS'], value: body.sentUnits },
    { labels: ['U PENDIENTES'], value: body.pending },
    { labels: ['ENTREGA ESTIMADA PRODUCCION'], value: body.estimatedProduction },
  ].filter((entry) => entry.value !== undefined && entry.value !== null && entry.value !== '');
  if (extras.length) {
    const schema = (await monday(
      `query ($id:[ID!]!){boards(ids:$id){columns{id title type}}}`,
      { id: [BOARDS[0].id] },
      token,
    )) as { boards?: Array<{ columns?: Array<{ id: string; title: string; type: string }> }> };
    const columns = schema.boards?.[0]?.columns || [];
    for (const extra of extras) {
      const column = columns.find((candidate) =>
        extra.labels.includes(cleanKey(candidate.title)),
      );
      if (!column || column.type === 'formula') continue;
      const raw = String(extra.value);
      columnValues[column.id] =
        column.type === 'numbers'
          ? Number(raw)
          : column.type === 'date'
            ? { date: raw }
            : column.type === 'checkbox'
              ? { checked: ['1', 'SI', 'SÍ', 'TRUE', 'YES'].includes(cleanKey(raw)) }
              : column.type === 'status' || column.type === 'color'
                ? { label: raw }
                : raw;
    }
  }
  return columnValues;
}

export async function POST(request: NextRequest) {
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'Monday todavía no está configurado.' },
      { status: 503 },
    );
  const body = (await request.json()) as Record<string, unknown>;
  const rawReference = String(body.reference || '').trim();
  if (!rawReference)
    return NextResponse.json(
      { error: 'Falta el número de pedido.' },
      { status: 400 },
    );
  const reference = /^R/i.test(rawReference)
    ? rawReference
    : `R${rawReference}`;
  try {
    const board = BOARDS[0];
    const columnValues = await reservationValues(body, token);
    const mutation = `mutation ($board:ID!,$name:String!,$values:JSON!){create_item(board_id:$board,item_name:$name,column_values:$values){id}}`;
    const result = (await monday(
      mutation,
      {
        board: board.id,
        name: reference,
        values: JSON.stringify(columnValues),
      },
      token,
    )) as { create_item?: { id?: string } };
    const createdId = result.create_item?.id || '';
    const formula = await itemFormula(createdId, token);
    return NextResponse.json(
      { id: createdId, board: board.name, formula },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo crear la reserva en Monday: ${error.message}`
            : 'No se pudo crear la reserva en Monday.',
      },
      { status: 502 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Monday todavía no está configurado.' }, { status: 503 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta la reserva que quieres actualizar.' }, { status: 400 });
  try {
    const columnValues = await reservationValues(body, token);
    const result = (await monday(
      `mutation ($board:ID!,$item:ID!,$values:JSON!){change_multiple_column_values(board_id:$board,item_id:$item,column_values:$values){id}}`,
      { board: BOARDS[0].id, item: id, values: JSON.stringify(columnValues) },
      token,
    )) as { change_multiple_column_values?: { id?: string } };
    const updatedId = result.change_multiple_column_values?.id || id;
    const formula = await itemFormula(updatedId, token);
    return NextResponse.json({ id: updatedId, formula });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `No se pudo actualizar la reserva en Monday: ${error.message}` : 'No se pudo actualizar la reserva en Monday.' },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get('x-maintenance-key') !== 'f8626767-5497-41dd-8d0a-cc43668155d8')
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'Monday todavía no está configurado.' },
      { status: 503 },
    );
  try {
    const schema = (await monday(
      `query ($id:[ID!]!){boards(ids:$id){columns{id title}}}`,
      { id: [BOARDS[0].id] },
      token,
    )) as { boards?: Array<{ columns?: Array<{ id: string; title: string }> }> };
    const column = schema.boards?.[0]?.columns?.find(
      (candidate) => cleanKey(candidate.title) === 'ETIQUETA',
    );
    if (!column)
      return NextResponse.json({ removed: false, message: 'La columna ETIQUETA ya no existe.' });
    await monday(
      `mutation ($board:ID!,$column:String!){delete_column(board_id:$board,column_id:$column){id}}`,
      { board: BOARDS[0].id, column: column.id },
      token,
    );
    return NextResponse.json({ removed: true, column: 'ETIQUETA' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `No se pudo eliminar la columna ETIQUETA: ${error.message}` : 'No se pudo eliminar la columna ETIQUETA.' },
      { status: 502 },
    );
  }
}
