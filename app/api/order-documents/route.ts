import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { getSessionUser } from '@/lib/auth';
import { wooFetch, wooIsConfigured, wooRoot } from '@/lib/woocommerce';

const allowedTypes = new Set(['invoice', 'packing-slip']);

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );

  const config = env as unknown as Record<string, string>;
  const orderId = Number(request.nextUrl.searchParams.get('orderId'));
  const orderNumber = String(
    request.nextUrl.searchParams.get('orderNumber') || '',
  ).trim();
  const type = String(request.nextUrl.searchParams.get('type') || '').trim();
  if (!Number.isInteger(orderId) || orderId <= 0 || !orderNumber)
    return NextResponse.json(
      { error: 'Falta el pedido de WooCommerce.' },
      { status: 400 },
    );
  if (!allowedTypes.has(type))
    return NextResponse.json(
      { error: 'El tipo de documento no es válido.' },
      { status: 400 },
    );
  if (!wooIsConfigured(config))
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );

  try {
    const orderResponse = await wooFetch(
      `orders/${orderId}?context=edit&_=${Date.now()}`,
      config,
      {
        headers: { accept: 'application/pdf, application/json' },
      },
    );
    if (!orderResponse.ok)
      throw new Error(`WooCommerce respondió ${orderResponse.status}`);
    const order = (await orderResponse.json()) as {
      number?: string;
      order_key?: string;
    };
    if (String(order.number || '') !== orderNumber)
      return NextResponse.json(
        { error: 'El número no corresponde al pedido.' },
        { status: 409 },
      );

    if (!order.order_key)
      return NextResponse.json(
        { error: 'El pedido no tiene una clave de documento válida.' },
        { status: 502 },
      );
    const params = new URLSearchParams({
      action: 'generate_wpo_wcpdf',
      document_type: type,
      order_ids: String(orderId),
      access_key: order.order_key,
      output: 'pdf',
    });
    const documentResponse = await fetch(
      `${wooRoot(config)}/wp-admin/admin-ajax.php?${params}`,
      { cache: 'no-store', headers: { accept: 'application/pdf' } },
    );
    const pdf = new Uint8Array(await documentResponse.arrayBuffer());
    if (
      !documentResponse.ok ||
      pdf.length < 5 ||
      String.fromCharCode(...pdf.slice(0, 5)) !== '%PDF-'
    )
      return NextResponse.json(
        {
          error:
            'WP Overnight ha rechazado el enlace firmado. Comprueba que el acceso al enlace esté guardado como Completo.',
        },
        { status: 502 },
      );

    return new Response(Uint8Array.from(pdf).buffer, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${type === 'invoice' ? 'factura' : 'albaran-devolucion'}-${orderNumber}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo descargar el documento: ${error.message}`
            : 'No se pudo descargar el documento.',
      },
      { status: 502 },
    );
  }
}
