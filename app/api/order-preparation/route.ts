import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryCatalog, orderPreparationCompletions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { buildReservationNote, buildShippingNote } from '@/lib/delivery-message';
import {
  barcodesForPreparationItem,
  preparationSkuParts,
} from '@/lib/order-preparation-catalog';
import { loadAcceptedPaymentOrders } from '@/lib/woo-order-preparation';
import { loadPreparationOrder } from '@/lib/woo-order-preparation';
import { lookupMondayRecords } from '@/lib/monday-lookup';
import { acceptedPaymentStatusSlug } from '@/lib/woo-initial-status-count';
import {
  preparationRoute,
  wooStatusSlugByName,
} from '@/lib/order-preparation-routing';
import { wooFetch, wooIsConfigured, wooResponseJson } from '@/lib/woocommerce';

async function loadPendingReservations(orderNumber: string, token: string) {
  const records = await lookupMondayRecords(orderNumber, token);
  return records.filter((record) =>
    record.kind === 'reserva' &&
    !/anulad|cancelad/i.test(record.status) &&
    (!String(record.pending || '').trim() || Number(record.pending) > 0),
  );
}

function reservationNoteLines(records: Awaited<ReturnType<typeof loadPendingReservations>>) {
  const lines = records.map((record) => ({
    reference: record.reference.trim(),
    description: String(record.articleDescription || record.article || record.code || '').trim(),
    size: String(record.size || '').trim(),
    units: String(record.pending || record.units || '').trim(),
  }));
  if (!lines.length || lines.some((line) =>
    !line.reference || !line.description || !line.size || !(Number(line.units) > 0),
  )) throw new Error('Revisa en Monday el número, artículo, talla y unidades de las reservas pendientes antes de guardar la nota.');
  return lines;
}

async function saveCustomerOrderNote(orderId: number, config: Record<string, string>, note: string) {
  const path = `orders/${orderId}/notes`;
  const response = await wooFetch(path, config);
  if (!response.ok)
    throw new Error(`WooCommerce no pudo consultar las notas del pedido (${response.status}).`);
  const notes = await wooResponseJson<Array<{ note: string; customer_note: boolean }>>(response);
  const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');
  if (notes.some((item) => item.customer_note === true && normalize(item.note) === normalize(note))) return;
  const saved = await wooFetch(path, config, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note, customer_note: true }),
  });
  if (!saved.ok)
    throw new Error(`WooCommerce no pudo guardar la nota al cliente (${saved.status}).`);
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  const config = env as unknown as Record<string, string>;
  if (!wooIsConfigured(config))
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );
  try {
    const result = await loadAcceptedPaymentOrders(config);
    const articles = [
      ...new Set(
        result.orders.flatMap((order) =>
          order.items
            .map((item) => preparationSkuParts(item.sku).article)
            .filter(Boolean),
        ),
      ),
    ];
    const catalog = articles.length
      ? await getDb()
          .select()
          .from(inventoryCatalog)
          .where(
            inArray(
              sql<string>`upper(replace(replace(replace(${inventoryCatalog.article}, ' ', ''), '-', ''), '.', ''))`,
              articles,
            ),
          )
      : [];
    const completions = await getDb()
      .select()
      .from(orderPreparationCompletions)
      .orderBy(desc(orderPreparationCompletions.completedAt));
    const completedIds = new Set(completions.map((row) => row.orderId));
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
    }).format(new Date());
    return NextResponse.json({
      ...result,
      orders: result.orders
        .filter((order) => !completedIds.has(order.id))
        .map((order) => ({
          ...order,
          items: order.items.map((item) => ({
            ...item,
            barcodes: barcodesForPreparationItem(item, catalog),
          })),
        })),
      preparedToday: completions.filter((row) => row.completionDate === today),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los pedidos en Pago aceptado.',
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderId = Number(body.orderId);
    const orderNumber = String(body.orderNumber || '')
      .trim()
      .slice(0, 40);
    if (!Number.isSafeInteger(orderId) || orderId < 1 || !orderNumber)
      return NextResponse.json(
        { error: 'No se pudo identificar el pedido finalizado.' },
        { status: 400 },
      );
    const config = env as unknown as Record<string, string>;
    if (!wooIsConfigured(config))
      return NextResponse.json(
        { error: 'WooCommerce todavía no está configurado.' },
        { status: 503 },
      );
    const order = await loadPreparationOrder(orderId, config);
    const mondayToken = config.MONDAY_API_TOKEN;
    const pendingReservations = mondayToken
      ? await loadPendingReservations(orderNumber, mondayToken)
      : [];
    const hasReservation = pendingReservations.length > 0;
    const reservationSummary = pendingReservations
      .map((record) => {
        const article =
          record.articleDescription || record.article || record.code;
        const units = String(record.pending || record.units || '').trim();
        return [
          article,
          record.size ? `talla ${record.size}` : '',
          units ? `${units} uds.` : '',
        ]
          .filter(Boolean)
          .join(', ');
      })
      .filter(Boolean)
      .join('; ');
    const route = preparationRoute(order.shippingMethod, hasReservation);
    if (route.treatment === 'manual-reservation') {
      const method = preparationRoute(order.shippingMethod, false).treatment;
      if (method === 'school-ready' || method === 'store-ready') {
        const note = buildReservationNote(reservationNoteLines(pendingReservations), {
          kind: method === 'school-ready' ? 'school' : 'store',
        });
        await saveCustomerOrderNote(orderId, config, note);
      }
    }
    let wooStatus = '';
    if (route.automatic) {
      const totalsResponse = await wooFetch('reports/orders/totals', config);
      if (!totalsResponse.ok)
        throw new Error(
          `No se pudieron consultar los estados de WooCommerce (${totalsResponse.status}).`,
        );
      const statuses =
        await wooResponseJson<Array<{ slug?: string; name?: string }>>(
          totalsResponse,
        );
      wooStatus = wooStatusSlugByName(statuses, route.targetStatusName);
      if (!wooStatus)
        throw new Error(
          `No se encontró el estado “${route.targetStatusName}” en WooCommerce.`,
        );
      const updateResponse = await wooFetch(`orders/${orderId}`, config, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: wooStatus }),
      });
      const updated = await wooResponseJson<{ message?: string }>(
        updateResponse,
      );
      if (!updateResponse.ok)
        throw new Error(
          updated.message ||
            `WooCommerce no pudo cambiar el estado (${updateResponse.status}).`,
        );
    }
    const now = new Date();
    const completion = {
      orderId,
      orderNumber,
      customerName: String(body.customerName || '')
        .trim()
        .slice(0, 200),
      customerEmail: order.customerEmail,
      customerPhone: order.phone,
      units: Math.max(0, Number(body.units) || 0),
      products: Math.max(0, Number(body.products) || 0),
      completedByEmail: user.email,
      completedByName: user.displayName,
      shippingMethod: order.shippingMethod,
      hasReservation,
      treatment: route.treatment,
      wooStatus,
      carrier: '',
      trackingNumber: '',
      reservationSummary,
      completionDate: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
      }).format(now),
      completedAt: now,
    };
    await getDb()
      .insert(orderPreparationCompletions)
      .values(completion)
      .onConflictDoUpdate({
        target: orderPreparationCompletions.orderId,
        set: completion,
      });
    return NextResponse.json(
      { completion, routingMessage: route.message },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo finalizar el pedido.',
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderId = Number(body.orderId);
    const trackingNumber = String(body.trackingNumber || '')
      .trim()
      .slice(0, 100);
    const carrier = body.carrier === 'dhl' ? 'dhl' : 'viaxpress';
    if (!Number.isSafeInteger(orderId) || orderId < 1 || !trackingNumber)
      return NextResponse.json(
        { error: 'Escanea o introduce el número de seguimiento.' },
        { status: 400 },
      );
    const existing = await getDb()
      .select()
      .from(orderPreparationCompletions)
      .where(eq(orderPreparationCompletions.orderId, orderId))
      .limit(1);
    if (!existing[0])
      return NextResponse.json(
        { error: 'El pedido preparado no existe.' },
        { status: 404 },
      );
    if (
      !['manual-home-delivery', 'manual-home-reservation'].includes(
        existing[0].treatment,
      )
    )
      return NextResponse.json(
        { error: 'Este pedido no está pendiente de envío a domicilio.' },
        { status: 409 },
      );
    const config = env as unknown as Record<string, string>;
    if (!wooIsConfigured(config))
      return NextResponse.json(
        { error: 'WooCommerce todavía no está configurado.' },
        { status: 503 },
      );
    const totalsResponse = await wooFetch('reports/orders/totals', config);
    if (!totalsResponse.ok)
      throw new Error(
        `No se pudieron consultar los estados de WooCommerce (${totalsResponse.status}).`,
      );
    const statuses =
      await wooResponseJson<Array<{ slug?: string; name?: string }>>(
        totalsResponse,
      );
    const sentStatus = wooStatusSlugByName(statuses, 'Enviado');
    if (!sentStatus)
      throw new Error('No se encontró el estado “Enviado” en WooCommerce.');
    let note = buildShippingNote(carrier, trackingNumber);
    if (existing[0].treatment === 'manual-home-reservation') {
      if (!config.MONDAY_API_TOKEN) throw new Error('Monday no está configurado para consultar las reservas.');
      const reservations = await loadPendingReservations(existing[0].orderNumber, config.MONDAY_API_TOKEN);
      note = buildReservationNote(reservationNoteLines(reservations), {
        kind: 'home', carrier, trackingNumber,
      });
    }
    await saveCustomerOrderNote(orderId, config, note);
    const updateResponse = await wooFetch(`orders/${orderId}`, config, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: sentStatus }),
    });
    const updatedWoo = await wooResponseJson<{ message?: string }>(
      updateResponse,
    );
    if (!updateResponse.ok)
      throw new Error(
        updatedWoo.message ||
          `WooCommerce no pudo cambiar el estado (${updateResponse.status}).`,
      );
    await getDb()
      .update(orderPreparationCompletions)
      .set({
        treatment: 'sent',
        wooStatus: sentStatus,
        carrier,
        trackingNumber,
      })
      .where(eq(orderPreparationCompletions.orderId, orderId));
    const completion = await getDb()
      .select()
      .from(orderPreparationCompletions)
      .where(eq(orderPreparationCompletions.orderId, orderId))
      .limit(1);
    return NextResponse.json({
      completion: completion[0],
      message: `Pedido #${existing[0].orderNumber} cambiado a Enviado con nota de seguimiento al cliente.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo marcar el pedido como enviado.',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderId = Number(body.orderId);
    if (!Number.isSafeInteger(orderId) || orderId < 1)
      return NextResponse.json(
        { error: 'No se pudo identificar el pedido.' },
        { status: 400 },
      );
    const existing = await getDb()
      .select()
      .from(orderPreparationCompletions)
      .where(eq(orderPreparationCompletions.orderId, orderId))
      .limit(1);
    if (!existing[0])
      return NextResponse.json(
        { error: 'El pedido ya no está en preparados.' },
        { status: 404 },
      );
    const config = env as unknown as Record<string, string>;
    if (!wooIsConfigured(config))
      return NextResponse.json(
        { error: 'WooCommerce todavía no está configurado.' },
        { status: 503 },
      );
    const totalsResponse = await wooFetch('reports/orders/totals', config);
    if (!totalsResponse.ok)
      throw new Error(
        `No se pudieron consultar los estados de WooCommerce (${totalsResponse.status}).`,
      );
    const statuses =
      await wooResponseJson<Array<{ slug?: string; name?: string }>>(
        totalsResponse,
      );
    const acceptedStatus = acceptedPaymentStatusSlug(statuses);
    const updateResponse = await wooFetch(`orders/${orderId}`, config, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: acceptedStatus }),
    });
    const updatedWoo = await wooResponseJson<{ message?: string }>(
      updateResponse,
    );
    if (!updateResponse.ok)
      throw new Error(
        updatedWoo.message ||
          `WooCommerce no pudo reabrir el pedido (${updateResponse.status}).`,
      );
    await getDb()
      .delete(orderPreparationCompletions)
      .where(eq(orderPreparationCompletions.orderId, orderId));
    return NextResponse.json({
      ok: true,
      orderId,
      message: `Pedido #${existing[0].orderNumber} reabierto y devuelto a Pago aceptado.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo volver a abrir el pedido.',
      },
      { status: 400 },
    );
  }
}
