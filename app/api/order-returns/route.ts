import { env } from 'cloudflare:workers';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orderNotes, orderReturns } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { findIncidents } from '@/lib/incident-query';
import { incidentStatusUpdate } from '@/lib/incident-actions';
import { normalizeOrderNoteReference } from '@/lib/order-note';
import { returnOrderReference, returnReceivedNote } from '@/lib/order-return';
import { loadWooOrderDetail } from '@/lib/woo-order-detail';

const order = (reference: string) => loadWooOrderDetail(reference, env as unknown as Record<string, string>, {
  summaryOnly: true, exactMatch: true,
});
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const canReceivePickup = (permissions: string[]) => permissions.includes('recogidas') || permissions.includes('incidencias');

async function pendingPickups(number: string) {
  const { incidents } = await findIncidents('', number);
  return incidents.filter((incident) => incident.pickupSchool && !incident.pickupReceived);
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user?.permissions.includes('detalle') || !user.permissions.includes('pedidos'))
    return error('Sin permiso para gestionar devoluciones.', 403);
  try {
    if (!request.nextUrl.searchParams.has('order')) {
      const page = Number(request.nextUrl.searchParams.get('page') ?? 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return error('Página no válida.', 400);
      const rows = await getDb().select().from(orderReturns)
        .orderBy(desc(orderReturns.receivedAt), desc(orderReturns.id)).limit(51).offset(page * 50);
      return NextResponse.json({ rows: rows.slice(0, 50), hasMore: rows.length > 50 });
    }
    const reference = returnOrderReference(request.nextUrl.searchParams.get('order') ?? '');
    if (!reference) return error('El QR no contiene un número de pedido válido.', 400);
    const detail = await order(reference);
    if (!detail) return error('No se encontró el pedido.', 404);
    const canMarkIncident = canReceivePickup(user.permissions);
    const pickups = canMarkIncident && request.nextUrl.searchParams.get('statusOnly') !== '1' ? await pendingPickups(detail.number) : [];
    return NextResponse.json({
      detail: { id: detail.id, number: detail.number, items: detail.items, returnAttended: detail.returnAttended },
      canMarkIncident, pickups: pickups.map(({ id, incidentText, pickupDetails }) => ({ id, incidentText, pickupDetails })),
    });
  } catch {
    return error('No se pudo cargar el pedido o el registro.', 502);
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user?.permissions.includes('detalle') || !user.permissions.includes('pedidos'))
    return error('Sin permiso para gestionar devoluciones.', 403);
  try {
    const { reference, itemId, kind, pickupId, operationId } = await request.json() as {
      reference?: unknown; itemId?: unknown; kind?: unknown; pickupId?: unknown; operationId?: unknown;
    };
    if (pickupId !== undefined && typeof pickupId !== 'string') return error('Recogida no válida.', 400);
    const number = typeof reference === 'string' ? returnOrderReference(reference) : '';
    if (!number || !Number.isSafeInteger(itemId) ||
      (kind !== 'return' && kind !== 'incident') || typeof operationId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operationId))
      return error('Selecciona el artículo y el tipo de recepción.', 400);
    if (kind === 'incident' && !canReceivePickup(user.permissions))
      return error('Tu usuario necesita permiso de recogidas o incidencias.', 403);

    const db = getDb();
    const id = `RECEPCION-${operationId}`;
    const [previous] = await db.select({ id: orderNotes.id }).from(orderNotes).where(eq(orderNotes.id, id));
    if (previous) return NextResponse.json({ ok: true });

    const detail = await order(number);
    const item = detail?.items.find((line) => line.id === itemId);
    if (!detail || !item) return error('No se encontró el artículo en el pedido.', 404);
    const now = new Date();
    const note = db.insert(orderNotes).values({
      id, orderNumber: normalizeOrderNoteReference(detail.number), kind: 'nota',
      content: returnReceivedNote(item.name, item.size, now),
      authorEmail: user.email, authorName: user.displayName, createdAt: now,
    });

    if (kind === 'return') {
      await db.batch([note, db.insert(orderReturns).values({
        id, orderId: detail.id, orderNumber: detail.number, itemName: item.name, size: item.size, receivedAt: now,
      })]);
      return NextResponse.json({ ok: true });
    }

    const pickups = await pendingPickups(detail.number);
    if (pickups.length > 1 && !pickupId)
      return error('Hay varias recogidas pendientes. Selecciona la incidencia correspondiente.', 409);
    const pickup = pickupId ? pickups.find((row) => row.id === pickupId) : pickups[0];
    if (pickupId && !pickup) return error('La recogida ya no está pendiente o no pertenece al pedido.', 409);
    const change = pickup ? await incidentStatusUpdate({ id: pickup.id, received: true }, user) : null;
    if (pickup && !change) return error('No se encontró la recogida.', 409);
    if (change) await db.batch([note, change.statement]);
    else await note;
    return NextResponse.json({ ok: true, pickupReceived: Boolean(change) });
  } catch {
    return error('No se pudo guardar la recepción. Puedes volver a intentarlo.', 502);
  }
}
