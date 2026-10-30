import { asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { getPackingDb } from '@/db';
import {
  packingActivityLogs,
  packingListOrders,
  packingLists,
} from '@/db/schema';
import historicalPackingLists from '@/data/historical-packinglists.json';

export type PackingOrderInput = {
  orderNumber?: unknown;
  customerName?: unknown;
  orderDate?: unknown;
  phone?: unknown;
  box?: unknown;
  schoolMismatch?: unknown;
};
export type PackingListInput = {
  school?: unknown;
  shippingDate?: unknown;
  orderYear?: unknown;
  orderMonth?: unknown;
  orders?: unknown;
};

const normalizeReference = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
const orderType = (value: unknown) => {
  const reference = String(value ?? '')
    .trim()
    .toUpperCase();
  if (reference.startsWith('PA')) return 'on-line';
  if (reference.startsWith('I')) return 'Incidencia';
  if (reference.startsWith('R')) return 'Reserva';
  return 'on-line';
};

export function validatePackingListInput(value: PackingListInput) {
  const school = String(value.school ?? '')
    .trim()
    .toUpperCase();
  const shippingDate = String(value.shippingDate ?? '').trim();
  const orderYear = Number(value.orderYear);
  const orderMonth = Number(value.orderMonth);
  const orders = Array.isArray(value.orders)
    ? (value.orders as PackingOrderInput[])
    : [];
  const valid = Boolean(
    school &&
    /^\d{4}-\d{2}-\d{2}$/.test(shippingDate) &&
    Number.isInteger(orderYear) &&
    orderMonth >= 1 &&
    orderMonth <= 12 &&
    orders.length,
  );
  return { valid, school, shippingDate, orderYear, orderMonth, orders };
}

export function packingOrderRows(
  packingListId: string,
  shippingDate: string,
  orders: PackingOrderInput[],
) {
  return orders.map((order) => ({
    id: crypto.randomUUID(),
    packingListId,
    orderNumber: String(order.orderNumber ?? '')
      .trim()
      .toUpperCase(),
    customerName: String(order.customerName ?? '').trim() || 'NO ENCONTRADO',
    orderType: orderType(order.orderNumber),
    orderDate: String(order.orderDate ?? ''),
    shippingDate,
    phone: String(order.phone ?? ''),
    box: String(order.box ?? '').trim(),
    schoolMismatch: Boolean(order.schoolMismatch),
  }));
}

export async function insertPackingOrders(
  rows: ReturnType<typeof packingOrderRows>,
) {
  const db = getPackingDb();
  for (let start = 0; start < rows.length; start += 8)
    await db.insert(packingListOrders).values(rows.slice(start, start + 8));
}

export async function findPackingListMatches(value: unknown) {
  const normalized = normalizeReference(value);
  const digits = normalized.replace(/^[A-Z]+/, '');
  const variants = [
    ...new Set(
      [normalized, digits, digits ? `PA${digits}` : ''].filter(Boolean),
    ),
  ];
  if (!variants.length) return [];
  const db = getPackingDb();
  const current = await db
    .select({
      order: packingListOrders.orderNumber,
      date: packingLists.shippingDate,
      school: packingLists.school,
      box: packingListOrders.box,
      file: packingLists.id,
    })
    .from(packingListOrders)
    .innerJoin(
      packingLists,
      eq(packingListOrders.packingListId, packingLists.id),
    )
    .where(inArray(packingListOrders.orderNumber, variants))
    .orderBy(desc(packingLists.shippingDate));
  const historical = historicalPackingLists.flatMap((list) =>
    list.orders
      .filter((order) =>
        variants.includes(normalizeReference(order.orderNumber)),
      )
      .map((order) => ({
        order: order.orderNumber,
        date: order.shippingDate || list.shippingDate,
        school: list.school,
        box: order.box,
        file: list.id,
      })),
  );
  return [...current, ...historical]
    .filter(
      (match, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.order === match.order &&
            candidate.date === match.date &&
            candidate.school === match.school &&
            candidate.box === match.box,
        ) === index,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listPackingLists() {
  return getPackingDb()
    .select()
    .from(packingLists)
    .where(ne(packingLists.school, '__DELETED__'))
    .orderBy(
      asc(packingLists.school),
      desc(packingLists.shippingDate),
      desc(packingLists.createdAt),
    );
}

export async function getPackingList(id: string) {
  const db = getPackingDb();
  const [list] = await db
    .select()
    .from(packingLists)
    .where(eq(packingLists.id, id))
    .limit(1);
  if (!list || list.school === '__DELETED__') return null;
  const orders = await db
    .select()
    .from(packingListOrders)
    .where(eq(packingListOrders.packingListId, id))
    .orderBy(asc(packingListOrders.box), asc(packingListOrders.orderNumber));
  return { ...list, orders };
}

export async function logPackingActivity(
  action: 'creado' | 'modificado' | 'eliminado',
  entityId: string,
  description: string,
) {
  await getPackingDb()
    .insert(packingActivityLogs)
    .values({
      id: crypto.randomUUID(),
      action,
      entityId,
      description,
      createdAt: new Date(),
    });
}
