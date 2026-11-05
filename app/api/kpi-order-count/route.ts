import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { wooIsConfigured } from '@/lib/woocommerce';
import { countAcceptedPaymentOrders } from '@/lib/woo-initial-status-count';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  const cutoffDate =
    request.nextUrl.searchParams.get('before')?.slice(0, 10) || '';
  const config = env as unknown as Record<string, string>;
  if (!wooIsConfigured(config))
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );
  try {
    return NextResponse.json(
      await countAcceptedPaymentOrders(cutoffDate, config),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron contar los pedidos de WooCommerce.',
      },
      { status: 502 },
    );
  }
}
