import { wooFetch, wooRoot } from '@/lib/woocommerce';

type WooLine = {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  total: string;
  meta_data?: Array<{
    key: string;
    display_key?: string;
    value: unknown;
    display_value?: string;
  }>;
};

type WooOrder = {
  id: number;
  number: string;
  status: string;
  currency_symbol?: string;
  total: string;
  date_created: string;
  date_modified: string;
  payment_method_title?: string;
  transaction_id?: string;
  billing: WooAddress & { email?: string; phone?: string };
  shipping: WooAddress;
  line_items: WooLine[];
  shipping_lines?: Array<{ method_title?: string; total?: string }>;
  meta_data?: Array<{ id?: number; key: string; value: unknown }>;
};

type WooAddress = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
};

type WooOrderNote = {
  id: number;
  author?: string;
  date_created?: string;
  note?: string;
  customer_note?: boolean;
};

export const wooStatusLabels: Record<string, string> = {
  pending: 'Pendiente de pago',
  processing: 'Procesando',
  'on-hold': 'En espera',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Fallido',
  trash: 'Papelera',
};

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim();

const checkedValue = (value: unknown) =>
  ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );

function returnAttendedMeta(order: WooOrder) {
  return order.meta_data?.find((meta) => {
    const key = meta.key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return key.includes('devolucion') && key.includes('atendida');
  });
}

// Solo se consideran nombres de artículos y metadatos identificados como
// colegio. Incluir talla o color aquí provocaba falsos avisos en PackingList.
export function wooOrderSchoolCandidates(order: WooOrder) {
  const candidates: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const candidate = clean(value);
      if (candidate) candidates.push(candidate);
    }
  };
  for (const item of order.line_items || []) {
    add(item.name);
    for (const meta of item.meta_data || []) {
      const label = `${meta.key} ${meta.display_key ?? ''}`;
      if (/colegio|college|school|centro|recogida|uniforme/i.test(label)) {
        add(meta.display_value);
        add(meta.value);
      }
    }
  }
  for (const meta of order.meta_data || []) {
    if (/colegio|college|school|centro|recogida|uniforme/i.test(meta.key))
      add(meta.value);
  }
  for (const line of order.shipping_lines || []) add(line.method_title);
  return [...new Set(candidates)];
}

export async function loadWooOrderDetail(
  exactNumber: string,
  config: Record<string, string>,
) {
  let order: WooOrder | undefined;
  if (/^\d+$/.test(exactNumber)) {
    const direct = await wooFetch(`orders/${exactNumber}`, config);
    if (direct.ok) order = (await direct.json()) as WooOrder;
    else if (direct.status !== 404)
      throw new Error(`WooCommerce respondió ${direct.status}`);
  }
  if (!order) {
    const search = await wooFetch(
      `orders?search=${encodeURIComponent(exactNumber)}&per_page=20`,
      config,
    );
    if (!search.ok) throw new Error(`WooCommerce respondió ${search.status}`);
    const matches = (await search.json()) as WooOrder[];
    order =
      matches.find((item) => String(item.number) === exactNumber) ?? matches[0];
  }
  if (!order) return null;

  // La colección puede omitir metadatos protegidos. La lectura completa con
  // context=edit mantiene sincronizado el check de devolución atendida.
  const [detailResponse, notesResponse] = await Promise.all([
    wooFetch(`orders/${order.id}?context=edit&_=${Date.now()}`, config),
    wooFetch(`orders/${order.id}/notes?per_page=100`, config),
  ]);
  if (detailResponse.ok) order = (await detailResponse.json()) as WooOrder;
  const notes = notesResponse.ok
    ? ((await notesResponse.json()) as WooOrderNote[])
    : [];
  return formatWooOrderDetail(order, notes, config);
}

export function formatWooOrderDetail(
  order: WooOrder,
  notes: WooOrderNote[],
  config: Record<string, string>,
) {
  const address = order.shipping?.address_1 ? order.shipping : order.billing;
  const currency = order.currency_symbol || '€';
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    statusLabel: wooStatusLabels[order.status] ?? order.status,
    dateCreated: order.date_created,
    dateModified: order.date_modified,
    total: `${order.total} ${currency}`,
    payment: order.payment_method_title || 'No indicado',
    transactionId: order.transaction_id || '',
    returnAttended: checkedValue(returnAttendedMeta(order)?.value),
    customer: {
      name: clean(
        `${order.billing.first_name ?? ''} ${order.billing.last_name ?? ''}`,
      ),
      phone: clean(order.billing.phone),
      email: clean(order.billing.email),
      address: clean(
        [
          address.address_1,
          address.address_2,
          address.postcode,
          address.city,
          address.state,
          address.country,
        ]
          .filter(Boolean)
          .join(' · '),
      ),
    },
    schoolCandidates: wooOrderSchoolCandidates(order),
    shippingMethod:
      order.shipping_lines
        ?.map((line) => clean(line.method_title))
        .filter(Boolean)
        .join(', ') || 'No indicado',
    items: order.line_items.map((item) => {
      const size = item.meta_data?.find((meta) =>
        /talla|size/i.test(`${meta.key} ${meta.display_key ?? ''}`),
      );
      return {
        id: item.id,
        name: clean(item.name),
        sku: clean(item.sku) || 'Sin SKU',
        quantity: item.quantity,
        size: clean(size?.display_value ?? size?.value) || '—',
        total: `${item.total} ${currency}`,
      };
    }),
    wooUrl: `${wooRoot(config)}/wp-admin/post.php?post=${order.id}&action=edit`,
    movements: notes.map((note) => ({
      id: note.id,
      author: clean(note.author) || 'WooCommerce',
      date: note.date_created || '',
      text: clean(note.note),
      customerVisible: Boolean(note.customer_note),
    })),
  };
}
