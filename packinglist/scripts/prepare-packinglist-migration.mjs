import fs from 'node:fs/promises';
import path from 'node:path';

const [sourcePath, outputDir] = process.argv.slice(2);
if (!sourcePath || !outputDir) throw new Error('Faltan sourcePath y outputDir.');

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const baseUrl = 'https://paddy-packing-list.paddygestion.workers.dev';
const summariesResponse = await fetch(`${baseUrl}/api/packing-lists`);
if (!summariesResponse.ok) throw new Error(`No se pudo leer destino: ${summariesResponse.status}`);
const summaries = await summariesResponse.json();
const target = [];
for (const summary of summaries) {
  const response = await fetch(`${baseUrl}/api/packing-lists?id=${encodeURIComponent(summary.id)}`);
  if (!response.ok) throw new Error(`No se pudo leer ${summary.id}: ${response.status}`);
  target.push(await response.json());
}

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, 'target-before-migration.json'), JSON.stringify(target, null, 2));

const text = (value) => String(value ?? '').trim();
const fold = (value) => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const listKey = (list) => [fold(list.school), text(list.shippingDate), Number(list.orderYear), Number(list.orderMonth)].join('|');
const orderKey = (order) => [fold(order.orderNumber), fold(order.customerName), text(order.orderDate).slice(0, 10), fold(order.box)].join('|');
const sql = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const integer = (value) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
const timestamp = (value, fallbackDate) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.trunc(numeric);
  const parsed = Date.parse(text(value) || `${fallbackDate}T12:00:00Z`);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const targetById = new Map(target.map((list) => [text(list.id), list]));
const targetByKey = new Map(target.map((list) => [listKey(list), list]));
const statements = [];
let newLists = 0;
let newOrders = 0;
let matchedLists = 0;
let skippedOrders = 0;

for (const sourceList of source) {
  const existing = targetById.get(text(sourceList.id)) || targetByKey.get(listKey(sourceList));
  const destinationId = existing ? text(existing.id) : text(sourceList.id);
  if (existing) matchedLists += 1;
  else {
    newLists += 1;
    statements.push(
      `INSERT INTO packing_lists (id, school, shipping_date, order_year, order_month, created_at) ` +
      `SELECT ${sql(destinationId)}, ${sql(text(sourceList.school).toUpperCase())}, ${sql(sourceList.shippingDate)}, ${integer(sourceList.orderYear)}, ${integer(sourceList.orderMonth)}, ${timestamp(sourceList.createdAt, sourceList.shippingDate)} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM packing_lists WHERE id = ${sql(destinationId)} OR (UPPER(school) = ${sql(text(sourceList.school).toUpperCase())} AND shipping_date = ${sql(sourceList.shippingDate)} AND order_year = ${integer(sourceList.orderYear)} AND order_month = ${integer(sourceList.orderMonth)}));`,
    );
  }

  const existingOrderKeys = new Set((existing?.orders || []).map(orderKey));
  const existingOrderIds = new Set((existing?.orders || []).map((order) => text(order.id)));
  for (const order of sourceList.orders || []) {
    if (existingOrderIds.has(text(order.id)) || existingOrderKeys.has(orderKey(order))) {
      skippedOrders += 1;
      continue;
    }
    newOrders += 1;
    const orderId = text(order.id) || crypto.randomUUID();
    statements.push(
      `INSERT INTO packing_list_orders (id, packing_list_id, order_number, customer_name, order_type, order_date, shipping_date, phone, box, school_mismatch) ` +
      `SELECT ${sql(orderId)}, ${sql(destinationId)}, ${sql(text(order.orderNumber).toUpperCase())}, ${sql(text(order.customerName) || 'NO ENCONTRADO')}, ${sql(text(order.orderType) || 'ON-LINE')}, ${sql(text(order.orderDate).slice(0, 10))}, ${sql(text(order.shippingDate || sourceList.shippingDate).slice(0, 10))}, ${sql(order.phone)}, ${sql(order.box)}, ${order.schoolMismatch ? 1 : 0} ` +
      `WHERE NOT EXISTS (SELECT 1 FROM packing_list_orders WHERE id = ${sql(orderId)} OR (packing_list_id = ${sql(destinationId)} AND UPPER(order_number) = ${sql(text(order.orderNumber).toUpperCase())} AND UPPER(customer_name) = ${sql(text(order.customerName).toUpperCase())} AND order_date = ${sql(text(order.orderDate).slice(0, 10))} AND UPPER(box) = ${sql(text(order.box).toUpperCase())}));`,
    );
  }
}
await fs.writeFile(path.join(outputDir, 'migration.sql'), statements.join('\n'));
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify({
  sourceLists: source.length,
  sourceOrders: source.reduce((sum, list) => sum + (list.orders || []).length, 0),
  targetLists: target.length,
  targetOrders: target.reduce((sum, list) => sum + (list.orders || []).length, 0),
  matchedLists,
  newLists,
  newOrders,
  skippedOrders,
}, null, 2));
console.log(JSON.stringify({ matchedLists, newLists, newOrders, skippedOrders }, null, 2));
