import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

type WooMeta = { id?: number; key: string; value: unknown };
type WooOrder = { id: number; number: string; meta_data?: WooMeta[] };

const normalizeKey = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function isReturnAttendedKey(key: string) {
  const normalized = normalizeKey(key);
  return normalized.includes('devolucion') && normalized.includes('atendida');
}

function checkedValue(value: unknown) {
  return ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(
    String(value ?? '').trim().toLowerCase(),
  );
}

function wooFetch(path: string, config: Record<string, string>, init?: RequestInit) {
  const root = config.WOOCOMMERCE_URL.replace(/\/$/, '');
  return fetch(`${root}/wp-json/wc/v3/${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      authorization: `Basic ${btoa(`${config.WOOCOMMERCE_CONSUMER_KEY}:${config.WOOCOMMERCE_CONSUMER_SECRET}`)}`,
      accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
}

export async function POST(request: NextRequest) {
  const config = env as unknown as Record<string, string>;
  if (!config.WOOCOMMERCE_URL || !config.WOOCOMMERCE_CONSUMER_KEY || !config.WOOCOMMERCE_CONSUMER_SECRET)
    return NextResponse.json({ error: 'WooCommerce todavía no está configurado.' }, { status: 503 });

  try {
    const body = (await request.json()) as { orderId?: number; orderNumber?: string; attended?: boolean };
    const orderId = Number(body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0)
      return NextResponse.json({ error: 'Falta el pedido de WooCommerce.' }, { status: 400 });

    const currentResponse = await wooFetch(`orders/${orderId}?context=edit&_=${Date.now()}`, config);
    if (!currentResponse.ok)
      throw new Error(`WooCommerce respondió ${currentResponse.status} al consultar el pedido`);
    const current = (await currentResponse.json()) as WooOrder;
    if (body.orderNumber && String(current.number) !== String(body.orderNumber))
      return NextResponse.json({ error: 'El número no corresponde al pedido de WooCommerce.' }, { status: 409 });

    const existing = current.meta_data?.filter((meta) => isReturnAttendedKey(meta.key)) || [];
    const value = body.attended ? '1' : '0';
    const metaData = existing.length
      ? existing.map((meta) => ({ ...(meta.id ? { id: meta.id } : {}), key: meta.key, value }))
      : [{ key: 'devolucion_atendida', value }];
    const updateResponse = await wooFetch(`orders/${orderId}`, config, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ meta_data: metaData }),
    });
    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      throw new Error(`WooCommerce respondió ${updateResponse.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
    }
    const updated = (await updateResponse.json()) as WooOrder;
    const saved = updated.meta_data?.find((meta) => meta.key === 'devolucion_atendida')
      || updated.meta_data?.find((meta) => isReturnAttendedKey(meta.key));
    const savedAttended = checkedValue(saved?.value);
    if (savedAttended !== Boolean(body.attended))
      throw new Error('WooCommerce respondió correctamente, pero no confirmó el nuevo estado del check');
    return NextResponse.json({ ok: true, returnAttended: savedAttended });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `No se pudo actualizar WooCommerce: ${error.message}` : 'No se pudo actualizar WooCommerce.' },
      { status: 502 },
    );
  }
}
