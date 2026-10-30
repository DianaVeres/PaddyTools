import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getPackingDb } from '@/db';
import { packingListOrders, packingLists } from '@/db/schema';
import {
  findPackingListMatches,
  getPackingList,
  insertPackingOrders,
  listPackingLists,
  logPackingActivity,
  packingOrderRows,
  validatePackingListInput,
} from '@/lib/packing-list-store';

export async function GET(request: NextRequest) {
  const order = request.nextUrl.searchParams.get('order');
  if (order)
    return NextResponse.json({
      order,
      matches: await findPackingListMatches(order),
      source: 'Paddy Packing List',
    });

  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    const list = await getPackingList(id);
    return list
      ? NextResponse.json(list)
      : NextResponse.json(
          { error: 'PackingList no encontrado.' },
          { status: 404 },
        );
  }

  const from = request.nextUrl.searchParams.get('from')?.slice(0, 10) || '';
  const to = request.nextUrl.searchParams.get('to')?.slice(0, 10) || '';
  const rows = await listPackingLists();
  const filtered = rows.filter(
    (row) =>
      (!from || row.shippingDate >= from) && (!to || row.shippingDate <= to),
  );
  return NextResponse.json(filtered, {
    headers: { 'cache-control': 'no-store, no-cache, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  const input = validatePackingListInput(await request.json());
  if (!input.valid)
    return NextResponse.json(
      { error: 'Completa colegio, fecha, mes y al menos un pedido.' },
      { status: 400 },
    );
  const id = `PL-${crypto.randomUUID()}`;
  await getPackingDb().insert(packingLists).values({
    id,
    school: input.school,
    shippingDate: input.shippingDate,
    orderYear: input.orderYear,
    orderMonth: input.orderMonth,
    createdAt: new Date(),
  });
  await insertPackingOrders(
    packingOrderRows(id, input.shippingDate, input.orders),
  );
  await logPackingActivity(
    'creado',
    id,
    `PackingList de ${input.school} creado con ${input.orders.length} pedidos.`,
  );
  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const input = validatePackingListInput(await request.json());
  if (!id || !input.valid)
    return NextResponse.json(
      { error: 'Completa colegio, fecha, mes y al menos un pedido.' },
      { status: 400 },
    );
  const db = getPackingDb();
  const [existing] = await db
    .select({ id: packingLists.id })
    .from(packingLists)
    .where(eq(packingLists.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json(
      { error: 'PackingList no encontrado.' },
      { status: 404 },
    );
  await db
    .update(packingLists)
    .set({
      school: input.school,
      shippingDate: input.shippingDate,
      orderYear: input.orderYear,
      orderMonth: input.orderMonth,
    })
    .where(eq(packingLists.id, id));
  await db
    .delete(packingListOrders)
    .where(eq(packingListOrders.packingListId, id));
  await insertPackingOrders(
    packingOrderRows(id, input.shippingDate, input.orders),
  );
  await logPackingActivity(
    'modificado',
    id,
    `PackingList de ${input.school} modificado. Contiene ${input.orders.length} pedidos.`,
  );
  return NextResponse.json({ id });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id)
    return NextResponse.json(
      { error: 'Falta el PackingList.' },
      { status: 400 },
    );
  const db = getPackingDb();
  const [existing] = await db
    .select({ id: packingLists.id, school: packingLists.school })
    .from(packingLists)
    .where(eq(packingLists.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json(
      { error: 'PackingList no encontrado.' },
      { status: 404 },
    );
  if (id.startsWith('HIST-')) {
    await db
      .delete(packingListOrders)
      .where(eq(packingListOrders.packingListId, id));
    await db
      .update(packingLists)
      .set({ school: '__DELETED__' })
      .where(eq(packingLists.id, id));
  } else {
    await db.delete(packingLists).where(eq(packingLists.id, id));
  }
  await logPackingActivity(
    'eliminado',
    id,
    `PackingList de ${existing.school} eliminado.`,
  );
  return NextResponse.json({ deleted: true });
}
