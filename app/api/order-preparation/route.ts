import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { desc, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryCatalog, orderPreparationCompletions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import {
  barcodesForPreparationItem,
  preparationSkuParts,
} from '@/lib/order-preparation-catalog';
import { loadAcceptedPaymentOrders } from '@/lib/woo-order-preparation';
import { wooIsConfigured } from '@/lib/woocommerce';

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
    const now = new Date();
    const completion = {
      orderId,
      orderNumber,
      customerName: String(body.customerName || '')
        .trim()
        .slice(0, 200),
      units: Math.max(0, Number(body.units) || 0),
      products: Math.max(0, Number(body.products) || 0),
      completedByEmail: user.email,
      completedByName: user.displayName,
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
    return NextResponse.json({ completion }, { status: 201 });
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
