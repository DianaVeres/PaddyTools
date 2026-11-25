import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = fs.readFileSync('db/schema.ts', 'utf8');
const migration = fs.readFileSync('drizzle/0018_stm_technical_sheets.sql', 'utf8');
const importer = fs.readFileSync('scripts/import-stm-technical-sheets.mjs', 'utf8');
const route = fs.readFileSync('app/api/technical-sheets/route.ts', 'utf8');

assert.ok(schema.includes("'stm_technical_sheets'"), 'falta la tabla de fichas STM');
assert.ok(schema.includes("'stm_technical_sheet_colors'"), 'faltan los colores normalizados');
assert.ok(migration.includes('raw_json'), 'la migración debe conservar toda la fila original');
assert.ok(importer.includes('position <= 18'), 'deben importarse los 18 colores posibles');
assert.ok(importer.includes('_STM_FILAS_RELACIONADAS'), 'deben conservarse las filas auxiliares de STM');
assert.ok(importer.includes('start += 1'), 'cada ficha debe cargarse en una sentencia compatible con D1');
assert.ok(importer.includes('Object.keys(rows[0] || {}).length'), 'el importador debe auditar las columnas');
assert.ok(route.includes('stmTechnicalSheetColors'), 'el detalle debe devolver los colores');
assert.ok(route.includes('stmTechnicalSheetSections'), 'el detalle debe devolver las demás pestañas de STM');
assert.ok(route.includes("searchParams.get('code')"), 'la API debe consultar una ficha exacta');

console.log('Base de fichas técnicas STM verificada.');
