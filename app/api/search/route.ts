import { NextRequest, NextResponse } from 'next/server';
import { searchDigits, wooSearchVariants } from '@/lib/global-search';
import { env } from 'cloudflare:workers';
import { wooFetch, wooIsConfigured, wooRoot } from '@/lib/woocommerce';

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
  billing: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    address_2?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  shipping: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  line_items: WooLine[];
  shipping_lines?: Array<{ method_title?: string; total?: string }>;
  meta_data?: Array<{ id?: number; key: string; value: unknown }>;
};
type WooOrderNote = {
  id: number;
  author?: string;
  date_created?: string;
  note?: string;
  customer_note?: boolean;
};
type WooCustomer = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  billing?: { phone?: string };
};

const statusLabels: Record<string, string> = {
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
const digits = searchDigits;
const folded = (value: unknown) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const returnAttendedMeta = (order: WooOrder) =>
  order.meta_data?.find((meta) => {
    const key = meta.key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return key.includes('devolucion') && key.includes('atendida');
  });
const checkedValue = (value: unknown) =>
  ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );

function searchMatch(order: WooOrder) {
  const currency = order.currency_symbol || '€';
  return {
    id: order.id,
    number: order.number,
    customerName: clean(
      `${order.billing.first_name ?? ''} ${order.billing.last_name ?? ''}`,
    ),
    phone: clean(order.billing.phone),
    email: clean(order.billing.email),
    dateCreated: order.date_created,
    total: `${order.total} ${currency}`,
    statusLabel: statusLabels[order.status] ?? order.status,
  };
}

// Los nombres de los artículos son la fuente más fiable para identificar el
// colegio de un pedido PA. Solo añadimos metadatos que indiquen expresamente
// un colegio: antes se enviaban también talla, color y otros valores, y al
// juntarlos podían provocar coincidencias falsas con otro colegio.
function orderSchoolCandidates(order: WooOrder) {
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
    if (query) {
      const phoneQuery = searchDigits(query);
      const words = query.split(/\s+/).filter((word) => word.length >= 3);
      const searchVariants = wooSearchVariants(query);
      const orderSearches = searchVariants.map(async (value) => {
        const response = await wooFetch(
          `orders?search=${encodeURIComponent(value)}&status=any&per_page=100&orderby=date&order=desc`,
          config,
        );
        return response.ok ? ((await response.json()) as WooOrder[]) : [];
      });
      const customerSearches = await Promise.all(
        searchVariants.map(async (value) => {
          const response = await wooFetch(
            `customers?search=${encodeURIComponent(value)}&per_page=100`,
            config,
          );
          return response.ok ? ((await response.json()) as WooCustomer[]) : [];
        }),
      );
      const customers = [
        ...new Map(
          customerSearches.flat().map((customer) => [customer.id, customer]),
        ).values(),
      ];
      const customerOrders = await Promise.all(
        customers.map(async (customer) => {
          const response = await wooFetch(
            `orders?customer=${customer.id}&status=any&per_page=100&orderby=date&order=desc`,
            config,
          );
          return response.ok ? ((await response.json()) as WooOrder[]) : [];
        }),
      );
      let orders = [
        ...new Map(
          (await Promise.all(orderSearches))
            .flat()
            .concat(customerOrders.flat())
            .map((order) => [order.id, order]),
        ).values(),
      ];
      // Algunas instalaciones con HPOS no incluyen nombre/teléfono en el
      // índice `search`. Si no devuelve nada, se revisan los pedidos recientes
      // y se comparan directamente los datos de facturación.
      if (!orders.length) {
        const pages = await Promise.all(
          Array.from({ length: 10 }, (_, index) => index + 1).map(
            async (page) => {
              const pageResponse = await wooFetch(
                `orders?status=any&per_page=100&page=${page}&orderby=date&order=desc`,
                config,
              );
              if (!pageResponse.ok) return [] as WooOrder[];
              return (await pageResponse.json()) as WooOrder[];
            },
          ),
        );
        orders = pages.flat();
      }
      const textQuery = folded(query);
      const textWords = words.map(folded);
      const matches = orders.filter((order) => {
        const phone = digits(order.billing.phone);
        if (phoneQuery.length >= 5)
          return (
            Boolean(phone) &&
            (phone.includes(phoneQuery) || phoneQuery.includes(phone))
          );
        const customer = folded(
          `${order.billing.first_name ?? ''} ${order.billing.last_name ?? ''} ${order.billing.email ?? ''}`,
        );
        return (
          customer.includes(textQuery) ||
          textWords.every((word) => customer.includes(word))
        );
      });
      return NextResponse.json({ matches: matches.map(searchMatch) });
    }
    // Si no entramos en la búsqueda por texto, la validación inicial garantiza
    // que existe un número de pedido.
    const exactNumber = number as string;
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
        matches.find((item) => String(item.number) === exactNumber) ??
        matches[0];
    }
    if (!order)
      return NextResponse.json(
        { error: `No se encontró el pedido ${number}.` },
        { status: 404 },
      );
    // The WooCommerce collection/search response can omit protected order
    // metadata. Fetch the complete order so the return checkbox always reads
    // the value saved by the WordPress order screen.
    const detailResponse = await wooFetch(
      `orders/${order.id}?context=edit&_=${Date.now()}`,
      config,
    );
    if (detailResponse.ok) order = (await detailResponse.json()) as WooOrder;
    const notesResponse = await wooFetch(
      `orders/${order.id}/notes?per_page=100`,
      config,
    );
    const notes = notesResponse.ok
      ? ((await notesResponse.json()) as WooOrderNote[])
      : [];
    const address = order.shipping?.address_1 ? order.shipping : order.billing;
    const currency = order.currency_symbol || '€';
    const attendedMeta = returnAttendedMeta(order);
    return NextResponse.json({
      id: order.id,
      number: order.number,
      status: order.status,
      statusLabel: statusLabels[order.status] ?? order.status,
      dateCreated: order.date_created,
      dateModified: order.date_modified,
      total: `${order.total} ${currency}`,
      payment: order.payment_method_title || 'No indicado',
      transactionId: order.transaction_id || '',
      returnAttended: checkedValue(attendedMeta?.value),
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
      schoolCandidates: orderSchoolCandidates(order),
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
    });
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
