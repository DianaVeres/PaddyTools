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
  type MondayItem,
} from '@/lib/monday-client';
import {
  MONDAY_BOARDS as BOARDS,
  MONDAY_RESERVATION_OPTIONS as RESERVATION_OPTIONS,
} from '@/lib/monday-config';
import {
  mondayColumnEmail as columnEmail,
  mondayColumnPhone as columnPhone,
  mondayReservationBaseReference as reservationBaseReference,
  normalizeMondayItem as normalizeItem,
} from '@/lib/monday-mapping';
import {
  loadMondayCustomerContacts as customerContacts,
} from '@/lib/monday-read';
import { loadMondayUpdates } from '@/lib/monday-updates';
import {
  createMondayReservation,
  updateMondayReservation,
} from '@/lib/monday-write';

const cleanKey = searchKey;
const digits = searchDigits;
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
      const updates = await loadMondayUpdates(updateIds, token);
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
    const result = await createMondayReservation(reference, body, token);
    return NextResponse.json(
      result,
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
    const result = await updateMondayReservation(id, body, token);
    return NextResponse.json(result);
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
