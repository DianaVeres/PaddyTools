import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const header = read('components/dashboard/dashboard-header.tsx');
const home = read('app/page.tsx');
const page = read('app/preparar-pedidos/page.tsx');
const route = read('app/api/order-preparation/route.ts');
const woo = read('lib/woo-order-preparation.ts');

assert.ok(header.includes('Preparar pedidos'), 'falta el acceso a Preparar pedidos');
assert.ok(header.indexOf('Preparar pedidos') > header.indexOf('KPIs'), 'Preparar pedidos debe estar junto a KPIs');
assert.ok(home.includes("window.location.assign('/preparar-pedidos')"), 'la portada no abre el módulo');
assert.ok(page.includes('Pedidos con pago aceptado'), 'falta la pantalla de preparación');
assert.ok(page.includes('fetchSessionUser'), 'la pantalla debe exigir una sesión de PaddyTools');
assert.ok(page.includes('kpi-timer-slot'), 'el contador debe mantenerse visible');
assert.ok(page.includes("fetch('/api/order-preparation'"), 'la pantalla debe cargar los pedidos automáticamente');
assert.ok(page.includes('Ver productos'), 'cada pedido debe permitir mostrar sus productos');
assert.ok(route.includes('getSessionUser(request)'), 'la API debe exigir sesión');
assert.ok(woo.includes('acceptedPaymentStatusSlug'), 'debe localizar el estado Pago aceptado');
assert.ok(woo.includes('x-wp-totalpages'), 'debe cargar todas las páginas de pedidos');
assert.ok(woo.includes('line_items'), 'la consulta debe incluir los productos');

console.log('Módulo Preparar pedidos verificado.');
