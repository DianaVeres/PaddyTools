import { env } from 'cloudflare:workers';
import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { orderNotes, orderReturns } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { findIncidents } from '@/lib/incident-query';
import { prepareIncidentWrite } from '@/lib/incident-write';
import { incidentStatusUpdate } from '@/lib/incident-actions';
import { MONDAY_RESERVATION_OPTIONS } from '@/lib/monday-config';
import { reservationSchoolFromArticle } from '@/lib/reservation-prefill';
import { normalizeOrderNoteReference } from '@/lib/order-note';
import { returnOrderReference, returnReceivedNote } from '@/lib/order-return';
import { loadWooOrderDetail } from '@/lib/woo-order-detail';

const order = (reference: string) => loadWooOrderDetail(reference, env as unknown as Record<string, string>, {
  summaryOnly: true, exactMatch: true,
});
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const canReceivePickup = (permissions: string[]) => permissions.includes('recogidas') || permissions.includes('incidencias');

async function orderIncidents(number: string) {
  const { incidents } = await findIncidents('', number);
  return { incidents, pickups: incidents.filter((incident) => incident.pickupSchool && !incident.pickupReceived) };
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
    const history = canMarkIncident && request.nextUrl.searchParams.get('statusOnly') !== '1' ? await orderIncidents(detail.number) : null;
    return NextResponse.json({
      detail: { id: detail.id, number: detail.number, items: detail.items, returnAttended: detail.returnAttended },
      canMarkIncident, hasIncident: Boolean(history?.incidents.length),
      canCreateIncident: user.permissions.includes('incidencias'),
      pickups: (history?.pickups ?? []).map(({ id, incidentText, pickupDetails }) => ({ id, incidentText, pickupDetails })),
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
    const { reference, itemId, kind, pickupId, operationId, quantity, description, shippingRequired } = await request.json() as {
      reference?: unknown; itemId?: unknown; kind?: unknown; pickupId?: unknown; operationId?: unknown; quantity?: unknown; description?: unknown; shippingRequired?: unknown;
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
    const units = quantity ?? 1;
    if (typeof units !== 'number' || !Number.isSafeInteger(units) || units < 1 || units > item.quantity)
      return error('Indica una cantidad entre 1 y las unidades de este artículo en el pedido.', 400);
    const now = new Date();
    const note = db.insert(orderNotes).values({
      id, orderNumber: normalizeOrderNoteReference(detail.number), kind: 'nota',
      content: returnReceivedNote(kind, item.name, item.size, now, units),
      authorEmail: user.email, authorName: user.displayName, createdAt: now,
    });

    if (kind === 'return') {
      await db.batch([note, db.insert(orderReturns).values({
        id, orderId: detail.id, orderNumber: detail.number, itemName: item.name, sku: item.sku, quantity: units, size: item.size, receivedAt: now,
      })]);
      return NextResponse.json({ ok: true });
    }

    const { incidents, pickups } = await orderIncidents(detail.number);
    if (pickups.length > 1 && !pickupId)
      return error('Hay varias recogidas pendientes. Selecciona la incidencia correspondiente.', 409);
    const pickup = pickupId ? pickups.find((row) => row.id === pickupId) : pickups[0];
    if (pickupId && !pickup) return error('La recogida ya no está pendiente o no pertenece al pedido.', 409);
    const change = pickup ? await incidentStatusUpdate({ id: pickup.id, received: true }, user) : null;
    if (pickup && !change) return error('No se encontró la recogida.', 409);
    if (change) {
      await db.batch([note, change.statement]);
      return NextResponse.json({ ok: true, pickupReceived: true });
    }
    if (incidents.length) {
      await note;
      return NextResponse.json({ ok: true });
    }

    if (!user.permissions.includes('incidencias'))
      return error('Tu usuario necesita permiso de Incidencias para darla de alta.', 403);
    if (shippingRequired !== undefined && typeof shippingRequired !== 'boolean')
      return error('Indica si la incidencia requiere envío.', 400);
    const incidentText = typeof description === 'string' ? description.trim() : '';
    if (!incidentText || incidentText.length > 4000)
      return error('Describe qué ha pasado (máximo 4000 caracteres).', 400);
    const incidentDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(now);
    const school = detail.school || reservationSchoolFromArticle([...MONDAY_RESERVATION_OPTIONS.schools], item.name, item.sku);
    const creation = await prepareIncidentWrite({
      order_number: detail.number,
      source_type: 'order',
      customer_name: detail.customer.name,
      customer_email: detail.customer.email,
      customer_phone: detail.customer.phone,
      shipping_address: detail.customer.address,
      order_date: detail.dateCreated.slice(0, 10),
      order_status: detail.statusLabel,
      order_total: detail.total,
      incident_school_name: school || 'Sin colegio indicado',
      shipping_required: shippingRequired ? 1 : 0,
      incident_date: incidentDate,
      incident_text: incidentText,
      products_json: [{ name: item.name, sku: item.sku, variation: item.size, quantity: units }],
    }, { actor: user, creationId: `INC-RECEPCION-${detail.id}` });
    await db.batch([note, creation.statement]);
    return NextResponse.json({ ok: true, incidentCreated: true });
  } catch {
    return error('No se pudo guardar la recepción. Puedes volver a intentarlo.', 502);
  }
}
