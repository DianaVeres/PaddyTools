import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { activityLogs, packingListOrders, packingLists } from '@/db/schema';
import historicalPackingLists from '@/data/historical-packinglists.json';

type IncomingOrder = { orderNumber?: unknown; customerName?: unknown; orderDate?: unknown; phone?: unknown; box?: unknown; schoolMismatch?: unknown };
const orderTypeFromNumber = (value: unknown) => {
  const number = String(value ?? '').trim().toUpperCase();
  if (number.startsWith('PA')) return 'on-line';
  if (number.startsWith('I')) return 'Incidencia';
  if (number.startsWith('R')) return 'Reserva';
  return 'on-line';
};

export async function GET(request: NextRequest) {
  const db = getDb(); const id = request.nextUrl.searchParams.get('id');
  const order = request.nextUrl.searchParams.get('order')?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
  if (order) {
    const numeric = order.replace(/^[A-Z]+/, '');
    const candidates = [...new Set([order, numeric, numeric ? `PA${numeric}` : ''].filter(Boolean))];
    const savedMatches = await db.select({
      order: packingListOrders.orderNumber,
      date: packingLists.shippingDate,
      school: packingLists.school,
      box: packingListOrders.box,
      file: packingLists.id,
    }).from(packingListOrders)
      .innerJoin(packingLists, eq(packingListOrders.packingListId, packingLists.id))
      .where(inArray(packingListOrders.orderNumber, candidates))
      .orderBy(desc(packingLists.shippingDate));
    const historicalMatches = historicalPackingLists.flatMap((list) =>
      list.orders
        .filter((item) => candidates.includes(item.orderNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')))
        .map((item) => ({
          order: item.orderNumber,
          date: item.shippingDate || list.shippingDate,
          school: list.school,
          box: item.box,
          file: list.id,
        })),
    );
    const matches = [...savedMatches, ...historicalMatches]
      .filter((match, index, rows) => rows.findIndex((row) =>
        row.order === match.order && row.date === match.date && row.school === match.school && row.box === match.box,
      ) === index)
      .sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ order, matches, source: 'Paddy Packing List' });
  }
  if (id) {
    const [packingList] = await db.select().from(packingLists).where(eq(packingLists.id, id)).limit(1);
    if (!packingList || packingList.school === '__DELETED__') return NextResponse.json({ error: 'PackingList no encontrado.' }, { status: 404 });
    const orders = await db.select().from(packingListOrders).where(eq(packingListOrders.packingListId, id)).orderBy(asc(packingListOrders.box), asc(packingListOrders.orderNumber));
    return NextResponse.json({ ...packingList, orders });
  }
  return NextResponse.json(await db.select().from(packingLists).where(ne(packingLists.school, '__DELETED__')).orderBy(asc(packingLists.school), desc(packingLists.shippingDate), desc(packingLists.createdAt)));
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>; const school = String(body.school ?? '').trim().toUpperCase();
  const shippingDate = String(body.shippingDate ?? '').trim(); const orderYear = Number(body.orderYear); const orderMonth = Number(body.orderMonth);
  const orders = Array.isArray(body.orders) ? body.orders as IncomingOrder[] : [];
  if (!school || !/^\d{4}-\d{2}-\d{2}$/.test(shippingDate) || !Number.isInteger(orderYear) || orderMonth < 1 || orderMonth > 12 || !orders.length)
    return NextResponse.json({ error: 'Completa colegio, fecha, mes y al menos un pedido.' }, { status: 400 });
  const id = `PL-${crypto.randomUUID()}`; const db = getDb();
  await db.insert(packingLists).values({ id, school, shippingDate, orderYear, orderMonth, createdAt: new Date() });
  const values = orders.map((order) => ({ id: crypto.randomUUID(), packingListId: id,
    orderNumber: String(order.orderNumber ?? '').trim().toUpperCase(), customerName: String(order.customerName ?? '').trim() || 'NO ENCONTRADO',
    orderType: orderTypeFromNumber(order.orderNumber), orderDate: String(order.orderDate ?? ''), shippingDate, phone: String(order.phone ?? ''),
    box: String(order.box ?? '').trim(), schoolMismatch: Boolean(order.schoolMismatch) }));
  for (let start = 0; start < values.length; start += 8) {
    await db.insert(packingListOrders).values(values.slice(start, start + 8));
  }
  await db.insert(activityLogs).values({ id: crypto.randomUUID(), action: 'creado', entityId: id,
    description: `PackingList de ${school} creado con ${orders.length} pedidos.`, createdAt: new Date() });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const body = await request.json() as Record<string, unknown>;
  const school = String(body.school ?? '').trim().toUpperCase();
  const shippingDate = String(body.shippingDate ?? '').trim();
  const orderYear = Number(body.orderYear); const orderMonth = Number(body.orderMonth);
  const orders = Array.isArray(body.orders) ? body.orders as IncomingOrder[] : [];
  if (!id || !school || !/^\d{4}-\d{2}-\d{2}$/.test(shippingDate) || !Number.isInteger(orderYear) || orderMonth < 1 || orderMonth > 12 || !orders.length)
    return NextResponse.json({ error: 'Completa colegio, fecha, mes y al menos un pedido.' }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: packingLists.id }).from(packingLists).where(eq(packingLists.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'PackingList no encontrado.' }, { status: 404 });
  await db.update(packingLists).set({ school, shippingDate, orderYear, orderMonth }).where(eq(packingLists.id, id));
  await db.delete(packingListOrders).where(eq(packingListOrders.packingListId, id));
  const values = orders.map((order) => ({ id: crypto.randomUUID(), packingListId: id,
    orderNumber: String(order.orderNumber ?? '').trim().toUpperCase(), customerName: String(order.customerName ?? '').trim() || 'NO ENCONTRADO',
    orderType: orderTypeFromNumber(order.orderNumber), orderDate: String(order.orderDate ?? ''), shippingDate, phone: String(order.phone ?? ''),
    box: String(order.box ?? '').trim(), schoolMismatch: Boolean(order.schoolMismatch) }));
  for (let start = 0; start < values.length; start += 8) await db.insert(packingListOrders).values(values.slice(start, start + 8));
  await db.insert(activityLogs).values({ id: crypto.randomUUID(), action: 'modificado', entityId: id,
    description: `PackingList de ${school} modificado. Contiene ${orders.length} pedidos.`, createdAt: new Date() });
  return NextResponse.json({ id });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Falta el PackingList.' }, { status: 400 });
  const db = getDb();
  const [existing] = await db.select({ id: packingLists.id, school: packingLists.school }).from(packingLists).where(eq(packingLists.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'PackingList no encontrado.' }, { status: 404 });
  if (id.startsWith('HIST-')) {
    await db.delete(packingListOrders).where(eq(packingListOrders.packingListId, id));
    await db.update(packingLists).set({ school: '__DELETED__' }).where(eq(packingLists.id, id));
  } else {
    await db.delete(packingLists).where(eq(packingLists.id, id));
  }
  await db.insert(activityLogs).values({ id: crypto.randomUUID(), action: 'eliminado', entityId: id,
    description: `PackingList de ${existing.school} eliminado.`, createdAt: new Date() });
  return NextResponse.json({ deleted: true });
}
