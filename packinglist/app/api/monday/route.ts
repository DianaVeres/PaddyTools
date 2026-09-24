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

const columnText = (value?: ColumnValue) =>
  String(value?.text || value?.display_value || '').trim();

function columnPhone(value?: ColumnValue) {
  const visible = columnText(value);
  if (visible) return visible;
  if (!value?.value) return '';
  try {
    const raw = JSON.parse(value.value) as {
      phone?: unknown;
      number?: unknown;
    };
    const phone = raw.phone ?? raw.number;
    return typeof phone === 'string' || typeof phone === 'number'
      ? String(phone).trim()
      : '';
  } catch {
    return '';
  }
}

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
  const firstContaining = (label: string) =>
    Object.entries(values).find(
      ([key, value]) => key.includes(cleanKey(label)) && value,
    )?.[1] || '';
  const customerColumn = (item.column_values || []).find((value) => {
    const title = cleanKey(value.column?.title || '');
    return (
      value.id === RESERVATION_COLUMNS.customer || title.includes('CLIENTE')
    );
  });
  return {
    id: item.id,
    kind: board.kind,
    board: board.name,
    reference: item.name,
    customer: first('CLIENTE'),
    phone: first('TELEFONO') || firstContaining('TELEFONO'),
    customerIds: (customerColumn?.linked_item_ids || []).map(String),
    school: first('COLEGIO'),
    date: first('FECHA RESERVA', 'FECHA'),
    article: first('DESCRIPCION ARTICULO', 'ARTICULO'),
    code: first('CODIGO ART.'),
    size: first('TALLA'),
    units: first('UDS.'),
    pending: first('U. PENDIENTES'),
    paid: first('PAGADA'),
    status: first('ESTADO'),
    observations: first('OBSERVACIONES'),
    specialDetails: first('DATOS PRENDA ESPECIAL'),
    updatedAt: item.updated_at || '',
  };
}

export async function GET(request: NextRequest) {
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'Monday todavía no está configurado.' },
      { status: 503 },
    );
  if (request.nextUrl.searchParams.get('mode') === 'reservation-options') {
    try {
      const query = `query ($customers:ID!,$articles:ID!){customers:boards(ids:[$customers]){items_page(limit:500){items{id name}}} articles:boards(ids:[$articles]){items_page(limit:500){items{id name column_values{id text column{title}}}}}}`;
      const data = (await monday(
        query,
        { customers: '5098189262', articles: '5098177612' },
        token,
      )) as {
        customers?: Array<{
          items_page?: { items?: Array<{ id: string; name: string }> };
        }>;
        articles?: Array<{ items_page?: { items?: MondayItem[] } }>;
      };
      const customers = (data.customers?.[0]?.items_page?.items || [])
        .map((item) => ({ id: item.id, name: item.name }))
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
  const plain = linkedMatch ? linkedMatch[1] : number.replace(/^PA/i, '');
  const numbers = [
    number,
    linkedMatch ? `PA${plain}` : '',
    linkedMatch ? `RPA${plain}` : '',
    linkedMatch ? `IPA${plain}` : '',
    plain,
    `#${plain}`,
  ].filter(
    (value, index, array) => value && array.indexOf(value) === index,
  );
  const query = `query ($board: ID!, $numbers: [String]!) { items_page_by_column_values(board_id:$board, limit:100, columns:[{column_id:"name",column_values:$numbers}]) { items { id name updated_at column_values { id text value ... on BoardRelationValue { display_value linked_item_ids } ... on MirrorValue { display_value } column { title } } } } }`;
  try {
    const records = (
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
    const customerIds = [
      ...new Set(records.flatMap((record) => record.customerIds)),
    ];
    const phonesByCustomer = new Map<string, string>();
    if (customerIds.length) {
      const customerData = (await monday(
        `query ($ids:[ID!]!){items(ids:$ids){id column_values{id text value column{title}}}}`,
        { ids: customerIds },
        token,
      )) as {
        items?: Array<{
          id: string;
          column_values?: ColumnValue[];
        }>;
      };
      for (const customer of customerData.items || []) {
        const phoneColumn = (customer.column_values || []).find((value) =>
          cleanKey(value.column?.title || value.id).includes('TELEFONO'),
        );
        const phone = columnPhone(phoneColumn);
        if (phone) phonesByCustomer.set(String(customer.id), phone);
      }
    }
    const enrichedRecords = records.map(({ customerIds: linkedIds, ...record }) => ({
      ...record,
      phone:
        record.phone ||
        linkedIds.map((id) => phonesByCustomer.get(id)).find(Boolean) ||
        '',
    }));
    return NextResponse.json({
      found: enrichedRecords.length > 0,
      records: enrichedRecords,
    });
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

export async function POST(request: NextRequest) {
  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'Monday todavía no está configurado.' },
      { status: 503 },
    );
  const body = (await request.json()) as Record<string, unknown>;
  const reference = String(body.reference || '').trim();
  if (!reference)
    return NextResponse.json(
      { error: 'Falta el número de pedido.' },
      { status: 400 },
    );
  try {
    const board = BOARDS[0];
    const columnValues: Record<string, unknown> = {};
    const put = (key: keyof typeof RESERVATION_COLUMNS, value: unknown) => {
      if (value !== undefined && value !== null && value !== '')
        columnValues[RESERVATION_COLUMNS[key]] = value;
    };
    let customerId = String(body.customerId || '');
    if (!customerId && body.customerName) {
      const customerBoard = '5098189262';
      const boardData = (await monday(
        `query ($id:[ID!]!){boards(ids:$id){columns{id title type}}}`,
        { id: [customerBoard] },
        token,
      )) as {
        boards?: Array<{
          columns?: Array<{ id: string; title: string; type: string }>;
        }>;
      };
      const phoneColumn = boardData.boards?.[0]?.columns?.find(
        (column) => cleanKey(column.title) === 'TELEFONO',
      );
      const values: Record<string, unknown> = {};
      if (phoneColumn && body.phone)
        values[phoneColumn.id] =
          phoneColumn.type === 'phone'
            ? { phone: String(body.phone), countryShortName: 'ES' }
            : String(body.phone);
      const created = (await monday(
        `mutation ($board:ID!,$name:String!,$values:JSON!){create_item(board_id:$board,item_name:$name,column_values:$values){id}}`,
        {
          board: customerBoard,
          name: String(body.customerName),
          values: JSON.stringify(values),
        },
        token,
      )) as { create_item?: { id?: string } };
      customerId = created.create_item?.id || '';
    }
    put(
      'customer',
      customerId ? { item_ids: [Number(customerId)] } : undefined,
    );
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
    return NextResponse.json(
      { id: result.create_item?.id, board: board.name },
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
