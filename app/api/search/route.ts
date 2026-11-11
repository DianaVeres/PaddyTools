import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { wooIsConfigured } from '@/lib/woocommerce';
import { searchWooOrdersByCustomer } from '@/lib/woo-customer-search';
import {
  loadWooOrderDetail,
  wooStatusLabels,
} from '@/lib/woo-order-detail';

export async function GET(request: NextRequest) {
  const supplied = request.nextUrl.searchParams
    .get('number')
    ?.trim()
    .replace(/^#/, '');
  const query = request.nextUrl.searchParams.get('query')?.trim();
  const number =
    supplied && /^PA/i.test(supplied) ? `PA${supplied.slice(2)}` : supplied;
  if (!number && !query)
    return NextResponse.json(
      { error: 'Introduce un número de pedido, un nombre o un teléfono.' },
      { status: 400 },
    );
  if (number && !/^PA/i.test(number))
    return NextResponse.json(
      { error: 'WooCommerce solo busca pedidos que empiezan por PA.' },
      { status: 422 },
    );
  const config = env as unknown as Record<string, string>;
  if (!wooIsConfigured(config))
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );
  try {
    if (query)
      return NextResponse.json({
        matches: await searchWooOrdersByCustomer(
          query,
          config,
          wooStatusLabels,
        ),
      });

    const order = await loadWooOrderDetail(number as string, config, {
      summaryOnly: request.nextUrl.searchParams.get('summary') === '1',
    });
    if (!order)
      return NextResponse.json(
        { error: `No se encontró el pedido ${number}.` },
        { status: 404 },
      );
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo consultar WooCommerce: ${error.message}`
            : 'No se pudo consultar WooCommerce.',
      },
      { status: 502 },
    );
  }
}
