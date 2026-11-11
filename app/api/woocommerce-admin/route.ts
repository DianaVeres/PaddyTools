import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { wooIsConfigured, wooRoot } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser)
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

  return NextResponse.redirect(`${wooRoot(config)}/wp-admin/`);
}
