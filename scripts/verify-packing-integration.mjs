import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const historical = JSON.parse(read('data/historical-packinglists.json'));
const historicalOrders = historical.reduce((total, list) => total + list.orders.length, 0);

if (historical.length !== 62 || historicalOrders !== 630) {
  throw new Error(`Histórico incompleto: ${historical.length} listas y ${historicalOrders} pedidos.`);
}

const config = read('wrangler.independent.jsonc');
if (!config.includes('"binding": "PACKING_DB"') || !config.includes('1c3284f2-56f0-4f44-81fb-99f9a128986e')) {
  throw new Error('Falta la conexión de PaddyTools con la base histórica de PackingList.');
}
if (config.includes('"binding": "PACKINGLIST"')) {
  throw new Error('PaddyTools todavía depende del Worker antiguo de PackingList.');
}

for (const route of ['app/api/packing-lists/route.ts', 'app/api/activity/route.ts', 'app/api/shipping/route.ts']) {
  if (read(route).includes('forwardToPackingList')) throw new Error(`${route} todavía usa el proxy antiguo.`);
}

console.log(`Integración PackingList verificada: ${historical.length} listas y ${historicalOrders} pedidos históricos.`);
