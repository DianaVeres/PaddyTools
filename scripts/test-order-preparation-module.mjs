import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const header = read('components/dashboard/dashboard-header.tsx');
const home = read('app/page.tsx');
const page = read('app/preparar-pedidos/page.tsx');

assert.ok(header.includes('Preparar pedidos'), 'falta el acceso a Preparar pedidos');
assert.ok(header.indexOf('Preparar pedidos') > header.indexOf('KPIs'), 'Preparar pedidos debe estar junto a KPIs');
assert.ok(home.includes("window.location.assign('/preparar-pedidos')"), 'la portada no abre el módulo');
assert.ok(page.includes('Preparación de pedidos'), 'falta la pantalla de preparación');
assert.ok(page.includes('fetchSessionUser'), 'la pantalla debe exigir una sesión de PaddyTools');
assert.ok(page.includes("`/?order=${encodeURIComponent(value)}`"), 'el módulo debe abrir la ficha del pedido');
assert.ok(page.includes('kpi-timer-slot'), 'el contador debe mantenerse visible');

console.log('Módulo Preparar pedidos verificado.');
