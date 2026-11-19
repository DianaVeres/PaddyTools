import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const schema = read('db/schema.ts');
const migration = read('drizzle/0011_inventory_counts.sql');
const route = read('app/api/inventories/route.ts');
const page = read('app/inventarios/page.tsx');
const header = read('components/dashboard/dashboard-header.tsx');

for (const table of ['inventory_sessions', 'inventory_items']) {
  assert.ok(schema.includes(`'${table}'`), `falta ${table} en el esquema`);
  assert.ok(migration.includes(`CREATE TABLE \`${table}\``), `falta migración de ${table}`);
}
assert.ok(route.includes('getSessionUser(request)'), 'la API debe exigir sesión');
assert.ok(route.includes("action === 'scan'"), 'la API debe registrar lecturas');
assert.ok(route.includes("action === 'close'"), 'la API debe cerrar recuentos');
assert.ok(page.includes('lastScanRef.current'), 'la PDA debe filtrar dobles lecturas rápidas');
assert.ok(page.includes('setTimeout(() => void saveScan(barcode), 350)'), 'la lectura debe guardarse aunque el escáner no envíe Enter');
assert.ok(page.includes("event.key !== 'Enter' && event.key !== 'Tab'"), 'la lectura debe aceptar los sufijos Enter y Tab');
assert.ok(page.includes('Pulsa SCAN'), 'la pantalla debe guiar el uso del botón físico');
assert.ok(page.includes('Descargar revisión'), 'debe existir una copia de revisión');
assert.ok(header.includes('Inventarios'), 'Inventarios debe ser accesible desde la cabecera');

console.log('Módulo de inventarios con PDA verificado.');
