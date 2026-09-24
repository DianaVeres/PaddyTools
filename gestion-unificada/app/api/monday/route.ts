import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

const BOARDS = [
  { id: '5098167633', kind: 'reserva', name: 'REGISTRO RESERVAS' },
  { id: '5098279909', kind: 'prenda', name: 'REGISTRO PRENDAS ESPECIALES' },
] as const;
const RESERVATION_COLUMNS = {
  customer: 'board_relation_mm458cjj',
  school: 'color_mm45f745',
  date: 'date_mm45b8rj',
  article: 'board_relation_mm45m9w9',
  size: 'text_mm45ag8c',
  units: 'numeric_mm4574r6',
  paid: 'color_mm45vsc8',
  observations: 'dropdown_mm45zpss',
  status: 'color_mm455nq5',
  endDate: 'date_mm458zp2',
  productionDate: 'date_mm51g99g',
} as const;
const RESERVATION_OPTIONS = {
  schools: [
    'SPF',
    'BCLC',
    'SAN ENRIQUE',
    'CLARET',
    'SAGE',
    'SAN JUAN BOSCO',
    'ESCOLANÍA',
    'SHACKLETON',
    'BENAGUASIL',
    'SAN RAFAEL',
    'TEATINAS PINTO',
    'ALBORXÍ',
    'TORREALEDUA',
    'RIBARROJA',
    'JOSE LLUCH',
    'PURISIMA',
    'SAGRADO CORAZÓN',
  ],
  paid: ['SÍ', 'NO'],
  observations: ['ENVÍO A DOMICILIO', 'ENTREGA COLEGIO', 'RECOGIDA EN TIENDA'],
  status: [
    'PARA PREPARAR',
    'ENTREGADO/ENVIADO',
    'ENTREGA PARCIAL',
    'BLOQUEADO',
    'EN PRODUCCIÓN',
  ],
};

type ColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
  display_value?: string | null;
  linked_item_ids?: Array<string | number> | null;
  column?: { title?: string | null };
};
type MondayItem = {
  id: string;
  name: string;
  updated_at?: string;
  column_values: ColumnValue[];
};
const cleanKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
const reservationBaseReference = (value: string) =>
  value.trim().replace(/(?:\s*\(copy\))+\s*$/gi, '').trim().toUpperCase();
const columnPhone = (value?: ColumnValue) => {
  const visible = String(value?.text || value?.display_value || '').trim();
  if (visible) return visible;
  if (!value?.value) return '';
  try {
    const raw = JSON.parse(value.value) as { phone?: unknown; number?: unknown };
    return String(raw.phone ?? raw.number ?? '').trim();
  } catch {
    return '';
  }
};
const columnEmail = (value?: ColumnValue) => {
  const visible = String(value?.text || value?.display_value || '').trim();
  if (visible) return visible;
  if (!value?.value) return '';
  try {
    const raw = JSON.parse(value.value) as { email?: unknown; text?: unknown };
    return String(raw.email ?? raw.text ?? '').trim();
  } catch {
    return '';
  }
};

async function monday(
  query: string,
  variables: Record<string, unknown>,
  token: string,
) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      authorization: token,
      'content-type': 'application/json',
      'api-version': '2025-04',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Monday respondió ${response.status}`);
  const result = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message?: string }>;
  };
  if (result.errors?.length)
    throw new Error(
      result.errors
        .map((error) => error.message)
        .filter(Boolean)
        .join(', '),
    );
  return result.data || {};
}

function normalizeItem(item: MondayItem, board: (typeof BOARDS)[number]) {
  const values: Record<string, string> = {};
  for (const value of item.column_values || [])
    values[cleanKey(value.column?.title || value.id)] = String(
      value.text || value.display_value || '',
    ).trim();
  const first = (...labels: string[]) =>
    labels.map((label) => values[cleanKey(label)]).find(Boolean) || '';
  const articleRelation = (item.column_values || []).find(
    (value) =>
      value.id === RESERVATION_COLUMNS.article ||
      cleanKey(value.column?.title || '') === 'ARTICULO',
  );
  const customerRelation = (item.column_values || []).find(
    (value) => value.id === RESERVATION_COLUMNS.customer,
  );
  return {
    id: item.id,
    kind: board.kind,
    board: board.name,
    reference: item.name,
    customer: first('CLIENTE'),
    phone: first('TELEFONO'),
    school: first('COLEGIO'),
    date: first('FECHA RESERVA', 'FECHA'),
    article: first('DESCRIPCION ARTICULO', 'ARTICULO'),
    articleIds: (articleRelation?.linked_item_ids || []).map(String),
    customerIds: (customerRelation?.linked_item_ids || []).map(String),
    code: first('CODIGO ART.'),
    size: first('TALLA'),
    units: first('UDS.'),
    sentUnits: first('U.ENVIADAS', 'U ENVIADAS'),
    pending: first('U. PENDIENTES'),
    paid: first('PAGADA'),
    status: first('ESTADO'),
    observations: first('OBSERVACIONES'),
    endDate: first('FECHA FIN'),
    productionDate: first('FECHA PRODUCCION', 'FECHA PRODUCCIÓN'),
    estimatedProduction: first('ENTREGA ESTIMADA PRODUCCION', 'ENTREGA ESTIMADA PRODUCCIÓN'),
    formula: first('FORMULA', 'FÓRMULA'),
    specialDetails: first('DATOS PRENDA ESPECIAL'),
    updatedAt: item.updated_at || '',
  };
}

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
      const query = `query ($customers:ID!,$articles:ID!){customers:boards(ids:[$customers]){items_page(limit:500){items{id name column_values{id text value ... on MirrorValue {display_value} ... on FormulaValue {display_value} column{title}}}}} articles:boards(ids:[$articles]){items_page(limit:500){items{id name column_values{id text column{title}}}}}}`;
      const data = (await monday(
        query,
        { customers: '5098189262', articles: '5098177612' },
        token,
      )) as {
        customers?: Array<{
          items_page?: { items?: MondayItem[] };
        }>;
        articles?: Array<{ items_page?: { items?: MondayItem[] } }>;
      };
      const customers = (data.customers?.[0]?.items_page?.items || [])
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
      const articles = (data.articles?.[0]?.items_page?.items || [])
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
      const data = (await monday(
        `query ($board:[ID!]!){boards(ids:$board){items_page(limit:500){items{id name updated_at column_values{id text value ... on BoardRelationValue {display_value linked_item_ids} ... on MirrorValue {display_value} ... on FormulaValue {display_value} column{title}}}}}}`,
        { board: [board.id] },
        token,
      )) as { boards?: Array<{ items_page?: { items?: MondayItem[] } }> };
      const rawRecords = (data.boards?.[0]?.items_page?.items || [])
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
  const number = request.nextUrl.searchParams
    .get('number')
    ?.trim()
    .replace(/^#/, '');
  if (!number)
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  const linkedMatch = number.match(/^(?:I|R)?PA(.+)$/i);
  const orderNumber = linkedMatch ? `PA${linkedMatch[1]}` : number;
  const plain = linkedMatch ? linkedMatch[1] : number.replace(/^PA/i, '');
  const numbers = [
    number,
    orderNumber,
    linkedMatch ? `IPA${plain}` : '',
    linkedMatch ? `RPA${plain}` : '',
    plain,
    `#${plain}`,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
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
            const data = (await monday(
              `query ($board:[ID!]!){boards(ids:$board){items_page(limit:500){items{id name updated_at column_values{id text ... on BoardRelationValue {display_value linked_item_ids} ... on FormulaValue {display_value} column{title}}}}}}`,
              { board: [board.id] },
              token,
            )) as { boards?: Array<{ items_page?: { items?: MondayItem[] } }> };
            return (data.boards?.[0]?.items_page?.items || [])
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
