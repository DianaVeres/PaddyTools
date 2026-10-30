import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

type WooMeta = { id?: number; key: string; value: unknown };
type WooOrder = { id: number; number: string; meta_data?: WooMeta[] };

const normalizedKey = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const isReturnAttendedKey = (key: string) => {
  const normalized = normalizedKey(key);
  return normalized.includes('devolucion') && normalized.includes('atendida');
};

async function wooFetch(
  path: string,
  config: Record<string, string>,
  init: RequestInit = {},
) {
  const root = config.WOOCOMMERCE_URL.replace(/\/$/, '');
  const headers = new Headers(init.headers);
  headers.set(
    'authorization',
    `Basic ${btoa(`${config.WOOCOMMERCE_CONSUMER_KEY}:${config.WOOCOMMERCE_CONSUMER_SECRET}`)}`,
  );
  headers.set('accept', 'application/json');
  return fetch(`${root}/wp-json/wc/v3/${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });
}

async function responseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `WooCommerce respondió ${response.status} con un formato no válido.`,
    );
  }
}

export async function POST(request: NextRequest) {
  const config = env as unknown as Record<string, string>;
  if (
    !config.WOOCOMMERCE_URL ||
    !config.WOOCOMMERCE_CONSUMER_KEY ||
    !config.WOOCOMMERCE_CONSUMER_SECRET
  )
    return NextResponse.json(
      { error: 'WooCommerce todavía no está configurado.' },
      { status: 503 },
    );

  try {
    const body = (await request.json()) as {
      orderId?: number;
      orderNumber?: string;
      attended?: boolean;
    };
    const orderId = Number(body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0)
      return NextResponse.json(
        { error: 'El identificador del pedido no es válido.' },
        { status: 400 },
      );

    const detailResponse = await wooFetch(`orders/${orderId}?context=edit`, config);
    const detail = (await responseJson(detailResponse)) as unknown as WooOrder & {
      message?: string;
    };
    if (!detailResponse.ok)
      return NextResponse.json(
        { error: detail.message || `WooCommerce respondió ${detailResponse.status}.` },
        { status: detailResponse.status },
      );

    const existing = detail.meta_data?.find((meta) => isReturnAttendedKey(meta.key));
    const meta: WooMeta = {
      ...(existing?.id ? { id: existing.id } : {}),
      key: existing?.key || '_devolucion_atendida',
      value: body.attended ? 'yes' : 'no',
    };
    const updateResponse = await wooFetch(`orders/${orderId}`, config, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ meta_data: [meta] }),
    });
    const updated = (await responseJson(updateResponse)) as unknown as WooOrder & {
      message?: string;
    };
    if (!updateResponse.ok)
      return NextResponse.json(
        { error: updated.message || `WooCommerce respondió ${updateResponse.status}.` },
        { status: updateResponse.status },
      );

    const saved = updated.meta_data?.find((item) => isReturnAttendedKey(item.key));
    const returnAttended = ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(
      String(saved?.value ?? '').trim().toLowerCase(),
    );
    return NextResponse.json({
      ok: true,
      orderId,
      orderNumber: updated.number || body.orderNumber || '',
      returnAttended,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo actualizar la devolución: ${error.message}`
            : 'No se pudo actualizar la devolución.',
      },
      { status: 502 },
    );
  }
}
