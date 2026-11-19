import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryItems, inventorySessions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';

const cleanBarcode = (value: unknown) =>
  String(value || '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 40);

async function sessionWithItems(id: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(inventorySessions)
    .where(eq(inventorySessions.id, id))
    .limit(1);
  if (!session) return null;
  const items = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.sessionId, id))
    .orderBy(desc(inventoryItems.lastScannedAt));
  return { ...session, items };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (id) {
    const session = await sessionWithItems(id);
    return session
      ? NextResponse.json({ session })
      : NextResponse.json({ error: 'Inventario no encontrado.' }, { status: 404 });
  }
  const sessions = await getDb()
    .select()
    .from(inventorySessions)
    .orderBy(desc(inventorySessions.updatedAt));
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action || 'create');
  const db = getDb();
  const now = new Date();

  if (action === 'create') {
    const warehouse = String(body.warehouse || '').trim().toUpperCase().slice(0, 80);
    const season = String(body.season || '').trim().toUpperCase().slice(0, 80);
    const countDate = String(body.countDate || '').slice(0, 10);
    if (!warehouse || !/^\d{4}-\d{2}-\d{2}$/.test(countDate))
      return NextResponse.json(
        { error: 'Indica el almacén y la fecha del inventario.' },
        { status: 400 },
      );
    const id = `INV-${crypto.randomUUID()}`;
    await db.insert(inventorySessions).values({
      id,
      warehouse,
      season,
      countDate,
      status: 'draft',
      createdByEmail: user.email,
      createdByName: user.displayName,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ session: await sessionWithItems(id) }, { status: 201 });
  }

  const sessionId = String(body.sessionId || '').trim();
  const [session] = await db
    .select()
    .from(inventorySessions)
    .where(eq(inventorySessions.id, sessionId))
    .limit(1);
  if (!session)
    return NextResponse.json({ error: 'Inventario no encontrado.' }, { status: 404 });
  if (session.status !== 'draft')
    return NextResponse.json(
      { error: 'Este inventario ya está cerrado y no admite cambios.' },
      { status: 409 },
    );

  if (action === 'scan') {
    const barcode = cleanBarcode(body.barcode);
    if (!barcode)
      return NextResponse.json({ error: 'El código está vacío.' }, { status: 400 });
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.sessionId, sessionId),
          eq(inventoryItems.barcode, barcode),
        ),
      )
      .limit(1);
    if (existing) {
      await db
        .update(inventoryItems)
        .set({ quantity: existing.quantity + 1, lastScannedAt: now })
        .where(eq(inventoryItems.id, existing.id));
    } else {
      await db.insert(inventoryItems).values({
        id: `INVI-${crypto.randomUUID()}`,
        sessionId,
        barcode,
        quantity: 1,
        firstScannedAt: now,
        lastScannedAt: now,
      });
    }
    await db
      .update(inventorySessions)
      .set({ updatedAt: now })
      .where(eq(inventorySessions.id, sessionId));
    return NextResponse.json({ session: await sessionWithItems(sessionId) });
  }

  return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const sessionId = String(body.sessionId || '').trim();
  const action = String(body.action || 'quantity');
  const db = getDb();
  const [session] = await db
    .select()
    .from(inventorySessions)
    .where(eq(inventorySessions.id, sessionId))
    .limit(1);
  if (!session)
    return NextResponse.json({ error: 'Inventario no encontrado.' }, { status: 404 });
  if (session.status !== 'draft')
    return NextResponse.json({ error: 'El inventario está cerrado.' }, { status: 409 });
  const now = new Date();

  if (action === 'close') {
    const items = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.sessionId, sessionId));
    if (!items.length)
      return NextResponse.json(
        { error: 'No puedes cerrar un inventario vacío.' },
        { status: 400 },
      );
    await db
      .update(inventorySessions)
      .set({ status: 'closed', closedAt: now, updatedAt: now })
      .where(eq(inventorySessions.id, sessionId));
    return NextResponse.json({ session: await sessionWithItems(sessionId) });
  }

  const itemId = String(body.itemId || '').trim();
  const quantity = Math.max(0, Math.min(999999, Number(body.quantity) || 0));
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(eq(inventoryItems.id, itemId), eq(inventoryItems.sessionId, sessionId)),
    )
    .limit(1);
  if (!item)
    return NextResponse.json({ error: 'Lectura no encontrada.' }, { status: 404 });
  if (quantity === 0) await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
  else
    await db
      .update(inventoryItems)
      .set({ quantity, lastScannedAt: now })
      .where(eq(inventoryItems.id, itemId));
  await db
    .update(inventorySessions)
    .set({ updatedAt: now })
    .where(eq(inventorySessions.id, sessionId));
  return NextResponse.json({ session: await sessionWithItems(sessionId) });
}
