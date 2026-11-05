import { wooFetch, wooResponseJson } from './woocommerce.ts';

type WooOrderTotal = { slug?: string; name?: string };

const normalized = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function acceptedPaymentStatusSlug(statuses: WooOrderTotal[]) {
  const found = statuses.find(
    (status) =>
      normalized(status.name) === 'pago aceptado' ||
      normalized(status.slug).replace(/^wc-/, '') === 'pago-aceptado',
  );
  return String(found?.slug || 'pago-aceptado').replace(/^wc-/, '');
}

export function validExclusiveCutoff(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export async function countAcceptedPaymentOrders(
  cutoffDate: string,
  config: Record<string, string>,
) {
  if (!validExclusiveCutoff(cutoffDate))
    throw new Error('La fecha límite para contar pedidos no es válida.');

  const totalsResponse = await wooFetch('reports/orders/totals', config);
  if (!totalsResponse.ok)
    throw new Error(
      `WooCommerce no pudo identificar el estado Pago Aceptado (${totalsResponse.status}).`,
    );
  const statuses = await wooResponseJson<WooOrderTotal[]>(totalsResponse);
  const status = acceptedPaymentStatusSlug(statuses);
  const before = encodeURIComponent(`${cutoffDate}T00:00:00`);
  const response = await wooFetch(
    `orders?status=${encodeURIComponent(status)}&before=${before}&dates_are_gmt=false&per_page=1`,
    config,
  );
  if (!response.ok)
    throw new Error(
      `WooCommerce no pudo contar los pedidos en Pago Aceptado (${response.status}).`,
    );
  const total = Number(response.headers.get('x-wp-total'));
  if (!Number.isInteger(total) || total < 0)
    throw new Error('WooCommerce no devolvió un recuento válido de pedidos.');
  return { orders: total, status, cutoffDate };
}
