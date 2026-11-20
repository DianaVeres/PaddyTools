import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { inventoryCatalog } from '@/db/schema';
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
          .where(inArray(inventoryCatalog.article, articles))
      : [];
    return NextResponse.json({
      ...result,
      orders: result.orders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          barcodes: barcodesForPreparationItem(item, catalog),
        })),
      })),
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
