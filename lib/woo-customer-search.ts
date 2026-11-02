import { searchDigits, wooSearchVariants } from '@/lib/global-search';
import { wooFetch } from '@/lib/woocommerce';

export type SearchableWooOrder = {
  id: number;
  number: string;
  status: string;
  currency_symbol?: string;
  total: string;
  date_created: string;
  billing: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
};

type WooCustomer = { id: number };

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim();

const folded = (value: unknown) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

async function readList<T>(path: string, config: Record<string, string>) {
  const response = await wooFetch(path, config);
  return response.ok ? ((await response.json()) as T[]) : [];
}

export function wooCustomerSearchMatch(
  order: SearchableWooOrder,
  statusLabels: Record<string, string>,
) {
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

export async function searchWooOrdersByCustomer(
  query: string,
  config: Record<string, string>,
  statusLabels: Record<string, string>,
) {
  const phoneQuery = searchDigits(query);
  const words = query.split(/\s+/).filter((word) => word.length >= 3);
  const variants = wooSearchVariants(query);
  const [orderGroups, customerGroups] = await Promise.all([
    Promise.all(
      variants.map((value) =>
        readList<SearchableWooOrder>(
          `orders?search=${encodeURIComponent(value)}&status=any&per_page=100&orderby=date&order=desc`,
          config,
        ),
      ),
    ),
    Promise.all(
      variants.map((value) =>
        readList<WooCustomer>(
          `customers?search=${encodeURIComponent(value)}&per_page=100`,
          config,
        ),
      ),
    ),
  ]);
  const customers = [
    ...new Map(
      customerGroups.flat().map((customer) => [customer.id, customer]),
    ).values(),
  ];
  const customerOrders = await Promise.all(
    customers.map((customer) =>
      readList<SearchableWooOrder>(
        `orders?customer=${customer.id}&status=any&per_page=100&orderby=date&order=desc`,
        config,
      ),
    ),
  );
  let orders = [
    ...new Map(
      orderGroups
        .flat()
        .concat(customerOrders.flat())
        .map((order) => [order.id, order]),
    ).values(),
  ];
  // HPOS puede no indexar nombre o teléfono. Si no hay resultados, revisamos
  // los 1.000 pedidos recientes y comparamos directamente su facturación.
  if (!orders.length) {
    const pages = await Promise.all(
      Array.from({ length: 10 }, (_, index) => index + 1).map((page) =>
        readList<SearchableWooOrder>(
          `orders?status=any&per_page=100&page=${page}&orderby=date&order=desc`,
          config,
        ),
      ),
    );
    orders = pages.flat();
  }
  const textQuery = folded(query);
  const textWords = words.map(folded);
  return orders
    .filter((order) => {
      const phone = searchDigits(order.billing.phone);
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
    })
    .map((order) => wooCustomerSearchMatch(order, statusLabels));
}
