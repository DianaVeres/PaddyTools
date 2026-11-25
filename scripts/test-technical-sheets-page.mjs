import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/fichas-tecnicas/page.tsx', 'utf8');
const css = fs.readFileSync('app/fichas-tecnicas/technical-sheets.css', 'utf8');
const header = fs.readFileSync('components/dashboard/dashboard-header.tsx', 'utf8');
const home = fs.readFileSync('app/page.tsx', 'utf8');

assert.ok(header.includes('Fichas técnicas'), 'falta el acceso visible en la cabecera');
assert.ok(home.includes("window.location.assign('/fichas-tecnicas')"), 'el acceso no abre la pantalla');
assert.ok(page.includes('/api/technical-sheets?q='), 'falta el buscador de fichas');
assert.ok(page.includes('/api/technical-sheets?code='), 'falta el detalle individual');
assert.ok(page.includes('Resto de la información STM'), 'la ficha debe mostrar los campos no normalizados');
assert.ok(page.includes('Imprimir completa'), 'falta la impresión completa');
assert.ok(page.includes('Descargar todos los datos'), 'falta la descarga completa');
assert.ok(page.includes('sectionGroups.map'), 'faltan las pestañas secundarias');
assert.ok(css.includes('@media(max-width:700px)'), 'falta la adaptación móvil');
assert.ok(css.includes('@media print'), 'falta el formato de impresión');

console.log('Pantalla de fichas técnicas verificada.');
