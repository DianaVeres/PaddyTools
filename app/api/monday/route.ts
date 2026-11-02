import { NextRequest, NextResponse } from 'next/server';
import { normalizeReferenceInput, searchKey } from '@/lib/global-search';
import { env } from 'cloudflare:workers';
import {
  mondayRequest as monday,
} from '@/lib/monday-client';
import { MONDAY_BOARDS as BOARDS } from '@/lib/monday-config';
import { loadMondayUpdates } from '@/lib/monday-updates';
import {
  createMondayReservation,
  updateMondayReservation,
} from '@/lib/monday-write';
import { loadMondayReservationOptions } from '@/lib/monday-options';
import { loadAllMondayReservations } from '@/lib/monday-reservations';
import { searchMondayRecords } from '@/lib/monday-search';
import { lookupMondayRecords } from '@/lib/monday-lookup';

const cleanKey = searchKey;
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
      return NextResponse.json(await loadMondayReservationOptions(token));
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
      return NextResponse.json({
        records: await loadAllMondayReservations(token),
      });
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
      const records = await searchMondayRecords(searchText, token);
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
  try {
    const records = await lookupMondayRecords(number, token);
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
