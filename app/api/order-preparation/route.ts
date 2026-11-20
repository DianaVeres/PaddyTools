import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryCatalog, orderPreparationCompletions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import {
  barcodesForPreparationItem,
  preparationSkuParts,
} from '@/lib/order-preparation-catalog';
import { loadAcceptedPaymentOrders } from '@/lib/woo-order-preparation';
import { loadPreparationOrder } from '@/lib/woo-order-preparation';
import { lookupMondayRecords } from '@/lib/monday-lookup';
import {
  preparationRoute,
  wooStatusSlugByName,
} from '@/lib/order-preparation-routing';
import { wooFetch, wooIsConfigured, wooResponseJson } from '@/lib/woocommerce';

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
    const linkedRecords = mondayToken
      ? await lookupMondayRecords(orderNumber, mondayToken)
      : [];
    const hasReservation = linkedRecords.some(
      (record) => record.kind === 'reserva',
    );
    const route = preparationRoute(order.shippingMethod, hasReservation);
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
    if (existing[0].treatment !== 'manual-home-delivery')
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
      message: `Pedido #${existing[0].orderNumber} cambiado a Enviado.`,
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
