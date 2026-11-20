import { acceptedPaymentStatusSlug } from './woo-initial-status-count';
import { wooFetch, wooResponseJson } from './woocommerce';

type WooStatus = { slug?: string; name?: string };
type WooPreparationLine = {
  id: number;
  name?: string;
  sku?: string;
  quantity?: number;
  meta_data?: Array<{
    key?: string;
    display_key?: string;
    value?: unknown;
    display_value?: string;
  }>;
};
type WooPreparationOrder = {
  id: number;
  number?: string;
  date_created?: string;
  total?: string;
  currency_symbol?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  meta_data?: Array<{ key?: string; value?: unknown }>;
  line_items?: WooPreparationLine[];
  shipping_lines?: Array<{ method_title?: string }>;
};

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim();

function preparationSchool(order: WooPreparationOrder) {
  const values = [
    ...(order.meta_data || []).map((meta) => ({
      label: meta.key || '',
      value: meta.value,
    })),
    ...(order.line_items || []).flatMap((item) =>
      (item.meta_data || []).map((meta) => ({
        label: `${meta.key || ''} ${meta.display_key || ''}`,
        value: meta.display_value ?? meta.value,
      })),
    ),
  ];
  return clean(
    values.find((entry) => /colegio|college|school|centro/i.test(entry.label))
      ?.value,
  );
}

function formatOrder(order: WooPreparationOrder) {
  return {
    id: order.id,
    number: clean(order.number),
    customer: clean(
      `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`,
    ),
    phone: clean(order.billing?.phone),
    customerEmail: clean(order.billing?.email),
    school: preparationSchool(order),
    dateCreated: clean(order.date_created),
    total: `${clean(order.total)} ${clean(order.currency_symbol) || '€'}`,
    shippingMethod: (order.shipping_lines || [])
      .map((line) => clean(line.method_title))
      .filter(Boolean)
      .join(' · '),
    items: (order.line_items || []).map((item) => {
      const size = item.meta_data?.find((meta) =>
        /talla|size/i.test(`${meta.key || ''} ${meta.display_key || ''}`),
      );
      return {
        id: item.id,
        name: clean(item.name),
        sku: clean(item.sku) || 'Sin SKU',
        quantity: Math.max(0, Number(item.quantity) || 0),
        size: clean(size?.display_value ?? size?.value) || '—',
      };
    }),
  };
}

export async function loadPreparationOrder(
  orderId: number,
  config: Record<string, string>,
) {
  const response = await wooFetch(`orders/${orderId}?context=edit`, config);
  const order = await wooResponseJson<
    WooPreparationOrder & { message?: string }
  >(response);
  if (!response.ok)
    throw new Error(
      order.message || `WooCommerce respondió ${response.status}.`,
    );
  return formatOrder(order);
}

export async function loadAcceptedPaymentOrders(
  config: Record<string, string>,
) {
  const totalsResponse = await wooFetch('reports/orders/totals', config);
  if (!totalsResponse.ok)
    throw new Error(
      `No se pudo identificar Pago aceptado (${totalsResponse.status}).`,
    );
  const statuses = await wooResponseJson<WooStatus[]>(totalsResponse);
  const status = acceptedPaymentStatusSlug(statuses);
  const path = `orders?status=${encodeURIComponent(status)}&per_page=100&orderby=date&order=asc`;
  const firstResponse = await wooFetch(`${path}&page=1`, config);
  if (!firstResponse.ok)
    throw new Error(
      `WooCommerce no pudo cargar los pedidos (${firstResponse.status}).`,
    );
  const firstPage = await wooResponseJson<WooPreparationOrder[]>(firstResponse);
  const totalPages = Math.max(
    1,
    Number(firstResponse.headers.get('x-wp-totalpages')) || 1,
  );
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, async (_, index) => {
      const page = index + 2;
      const response = await wooFetch(`${path}&page=${page}`, config);
      if (!response.ok)
        throw new Error(
          `WooCommerce no pudo cargar la página ${page} (${response.status}).`,
        );
      return wooResponseJson<WooPreparationOrder[]>(response);
    }),
  );
  const orders = [...firstPage, ...remainingPages.flat()].map(formatOrder);
  return { status, total: orders.length, orders };
}
