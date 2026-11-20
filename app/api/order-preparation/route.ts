import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { loadAcceptedPaymentOrders } from '@/lib/woo-order-preparation';
import { wooIsConfigured } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const config = env as unknown as Record<string, string>;
  if (!wooIsConfigured(config))
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );
  try {
    return NextResponse.json(await loadAcceptedPaymentOrders(config));
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
