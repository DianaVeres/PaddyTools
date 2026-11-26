import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryCatalog } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { inventoryCodeCandidates, normalizeInventoryCode } from '@/lib/inventory-catalog';
import { lookupMondayRecords } from '@/lib/monday-lookup';
import { mondayRequest } from '@/lib/monday-client';
import { MONDAY_BOARDS, MONDAY_RESERVATION_COLUMNS } from '@/lib/monday-config';
import { canPrepareReservation, deliveredReservationLabel, isDeliveredReservation, reservationReference } from '@/lib/reservation-preparation';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user?.permissions.includes('reservas'))
    return NextResponse.json({ error: 'Sin permiso para preparar reservas.' }, { status: user ? 403 : 401 });
  const input = new URL(request.url).searchParams.get('barcode');
  const codes = inventoryCodeCandidates(input);
  if (!codes.length) return NextResponse.json({ error: 'Introduce el código de barras.' }, { status: 400 });

  const products = await getDb().select({
    code: inventoryCatalog.code,
    article: inventoryCatalog.article,
    size: inventoryCatalog.size,
  }).from(inventoryCatalog).where(inArray(inventoryCatalog.code, codes));
  const exact = products.find((product) => product.code === normalizeInventoryCode(input));
  const variants = new Map(products.map((product) => [JSON.stringify([product.article, product.size]), product]));
  const product = exact ?? (variants.size === 1 ? products[0] : undefined);
  if (!product) return NextResponse.json({
    error: products.length ? 'El código coincide con varias prendas.' : 'Código no encontrado en el catálogo.',
  }, { status: products.length ? 409 : 404 });
  return NextResponse.json({ article: product.article, size: product.size });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user?.permissions.includes('reservas'))
    return NextResponse.json({ error: 'Sin permiso para preparar reservas.' }, { status: user ? 403 : 401 });

  const token = (env as unknown as Record<string, string>).MONDAY_API_TOKEN;
  if (!token) return NextResponse.json({ error: 'Monday no está configurado.' }, { status: 503 });
  try {
    const body = await request.json() as { reference?: string; ids?: unknown };
    const reference = typeof body.reference === 'string' ? reservationReference(body.reference) : '';
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids)] : [];
    if (!reference || reference.length > 80 || !ids.length || ids.length > 100 ||
      ids.some((id) => typeof id !== 'string' || !/^\d+$/.test(id)))
      return NextResponse.json({ error: 'Selecciona las prendas que vas a enviar.' }, { status: 400 });

    const board = MONDAY_BOARDS[0].id;
    const column = MONDAY_RESERVATION_COLUMNS.status;
    const [records, metadata] = await Promise.all([
      lookupMondayRecords(reference, token),
      mondayRequest(
        'query ($board:[ID!]!, $column:[String!]) { boards(ids:$board) { columns(ids:$column) { settings_str } } }',
        { board: [board], column: [column] }, token,
      ) as Promise<{ boards?: Array<{ columns?: Array<{ settings_str?: string }> }> }>,
    ]);
    const byId = new Map(records
      .filter((row) => row.kind === 'reserva' && reservationReference(row.reference) === reference)
      .map((row) => [row.id, row]));
    if (ids.some((id) => !byId.has(id)))
      return NextResponse.json({ error: 'Alguna de las prendas seleccionadas no pertenece a esta reserva.' }, { status: 409 });

    const settings = JSON.parse(metadata.boards?.[0]?.columns?.[0]?.settings_str || '{}') as { labels?: Record<string, string> };
    const label = deliveredReservationLabel(Object.values(settings.labels ?? {}));
    if (!label) throw new Error('No se encontró el estado Reserva Entregada / Enviada en Monday.');

    const updatedIds: string[] = [];
    const failedIds: string[] = [];
    for (const id of ids as string[]) {
      const row = byId.get(id)!;
      if (isDeliveredReservation(row.status)) { updatedIds.push(id); continue; }
      if (!canPrepareReservation(row.status, row.pending)) { failedIds.push(id); continue; }
      try {
        const result = await mondayRequest(
          'mutation ($board:ID!, $item:ID!, $values:JSON!) { change_multiple_column_values(board_id:$board, item_id:$item, column_values:$values, create_labels_if_missing:false) { id } }',
          { board, item: id, values: JSON.stringify({ [column]: { label } }) },
          token,
        ) as { change_multiple_column_values?: { id?: string } };
        if (result.change_multiple_column_values?.id !== id) throw new Error('Actualización no confirmada.');
        updatedIds.push(id);
      } catch {
        failedIds.push(id);
      }
    }
    return NextResponse.json({ updatedIds, failedIds, status: label });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo preparar la reserva.' }, { status: 502 });
  }
}
