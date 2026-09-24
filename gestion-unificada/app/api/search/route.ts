import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

type WooLine = { id: number; name: string; sku: string; quantity: number; total: string; meta_data?: Array<{ key: string; display_key?: string; value: unknown; display_value?: string }> };
type WooOrder = {
  id: number; number: string; status: string; currency_symbol?: string; total: string;
  date_created: string; date_modified: string; payment_method_title?: string; transaction_id?: string;
  billing: { first_name?: string; last_name?: string; email?: string; phone?: string; address_1?: string; address_2?: string; postcode?: string; city?: string; state?: string; country?: string };
  shipping: { first_name?: string; last_name?: string; address_1?: string; address_2?: string; postcode?: string; city?: string; state?: string; country?: string };
  line_items: WooLine[]; shipping_lines?: Array<{ method_title?: string; total?: string }>;
  meta_data?: Array<{ id?: number; key: string; value: unknown }>;
};
type WooOrderNote = { id: number; author?: string; date_created?: string; note?: string; customer_note?: boolean };

const statusLabels: Record<string, string> = { pending: 'Pendiente de pago', processing: 'Procesando', 'on-hold': 'En espera', completed: 'Completado', cancelled: 'Cancelado', refunded: 'Reembolsado', failed: 'Fallido', trash: 'Papelera' };
const clean = (value: unknown) => String(value ?? '').replace(/<[^>]*>/g, '').trim();
const returnAttendedMeta = (order: WooOrder) => order.meta_data?.find((meta) => {
  const key = meta.key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return key.includes('devolucion') && key.includes('atendida');
});
const checkedValue = (value: unknown) => ['1', 'true', 'yes', 'si', 'sí', 'on'].includes(String(value ?? '').trim().toLowerCase());

async function wooFetch(path: string, config: Record<string, string>) {
  const root = config.WOOCOMMERCE_URL.replace(/\/$/, '');
  return fetch(`${root}/wp-json/wc/v3/${path}`, { cache: 'no-store', headers: { authorization: `Basic ${btoa(`${config.WOOCOMMERCE_CONSUMER_KEY}:${config.WOOCOMMERCE_CONSUMER_SECRET}`)}`, accept: 'application/json' } });
}

export async function GET(request: NextRequest) {
  const supplied = request.nextUrl.searchParams.get('number')?.trim().replace(/^#/, '');
  const number = supplied && /^PA/i.test(supplied) ? `PA${supplied.slice(2)}` : supplied;
  if (!number) return NextResponse.json({ error: 'Introduce un número de pedido.' }, { status: 400 });
  if (!/^PA/i.test(number)) return NextResponse.json({ error: 'WooCommerce solo busca pedidos que empiezan por PA.' }, { status: 422 });
  const config = env as unknown as Record<string, string>;
  if (!config.WOOCOMMERCE_URL || !config.WOOCOMMERCE_CONSUMER_KEY || !config.WOOCOMMERCE_CONSUMER_SECRET) return NextResponse.json({ error: 'WooCommerce todavía no está configurado.' }, { status: 503 });
  try {
    let order: WooOrder | undefined;
    if (/^\d+$/.test(number)) {
      const direct = await wooFetch(`orders/${number}`, config);
      if (direct.ok) order = await direct.json() as WooOrder;
      else if (direct.status !== 404) throw new Error(`WooCommerce respondió ${direct.status}`);
    }
    if (!order) {
      const search = await wooFetch(`orders?search=${encodeURIComponent(number)}&per_page=20`, config);
      if (!search.ok) throw new Error(`WooCommerce respondió ${search.status}`);
      const matches = await search.json() as WooOrder[];
      order = matches.find((item) => String(item.number) === number) ?? matches[0];
    }
    if (!order) return NextResponse.json({ error: `No se encontró el pedido ${number}.` }, { status: 404 });
    // The WooCommerce collection/search response can omit protected order
    // metadata. Fetch the complete order so the return checkbox always reads
    // the value saved by the WordPress order screen.
    const detailResponse = await wooFetch(`orders/${order.id}?context=edit&_=${Date.now()}`, config);
    if (detailResponse.ok) order = await detailResponse.json() as WooOrder;
    const notesResponse = await wooFetch(`orders/${order.id}/notes?per_page=100`, config);
    const notes = notesResponse.ok ? await notesResponse.json() as WooOrderNote[] : [];
    const address = order.shipping?.address_1 ? order.shipping : order.billing;
    const currency = order.currency_symbol || '€';
    const attendedMeta = returnAttendedMeta(order);
    return NextResponse.json({
      id: order.id, number: order.number, status: order.status, statusLabel: statusLabels[order.status] ?? order.status,
      dateCreated: order.date_created, dateModified: order.date_modified, total: `${order.total} ${currency}`,
      payment: order.payment_method_title || 'No indicado', transactionId: order.transaction_id || '',
      returnAttended: checkedValue(attendedMeta?.value),
      customer: { name: clean(`${order.billing.first_name ?? ''} ${order.billing.last_name ?? ''}`), phone: clean(order.billing.phone), email: clean(order.billing.email), address: clean([address.address_1, address.address_2, address.postcode, address.city, address.state, address.country].filter(Boolean).join(' · ')) },
      shippingMethod: order.shipping_lines?.map((line) => clean(line.method_title)).filter(Boolean).join(', ') || 'No indicado',
      items: order.line_items.map((item) => { const size = item.meta_data?.find((meta) => /talla|size/i.test(`${meta.key} ${meta.display_key ?? ''}`)); return { id: item.id, name: clean(item.name), sku: clean(item.sku) || 'Sin SKU', quantity: item.quantity, size: clean(size?.display_value ?? size?.value) || '—', total: `${item.total} ${currency}` }; }),
      wooUrl: `${config.WOOCOMMERCE_URL.replace(/\/$/, '')}/wp-admin/post.php?post=${order.id}&action=edit`,
      movements: notes.map((note) => ({ id: note.id, author: clean(note.author) || 'WooCommerce', date: note.date_created || '', text: clean(note.note), customerVisible: Boolean(note.customer_note) })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudo consultar WooCommerce: ${error.message}` : 'No se pudo consultar WooCommerce.' }, { status: 502 });
  }
}
