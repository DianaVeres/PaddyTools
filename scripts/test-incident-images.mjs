import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const service = read('lib/incident-images.ts');
const route = read('app/api/incidents/images/route.ts');
const form = read('components/dashboard/incident-images-field.tsx');
const compatibility = read('public/incidencias-compat.js');
const legacyForm = read('public/incidencias-app.html');

for (const expected of [
  'MAX_INCIDENT_IMAGES = 4',
  'MAX_INCIDENT_IMAGE_BYTES = 5 * 1024 * 1024',
  'incident_image_chunks',
  'images_json',
])
  assert.ok(
    service.includes(expected),
    `Falta la regla de imágenes: ${expected}`,
  );

assert.ok(
  route.includes('getSessionUser'),
  'Las imágenes deben exigir una sesión.',
);
assert.ok(
  route.includes("'X-Content-Type-Options': 'nosniff'"),
  'Falta la protección del tipo de archivo.',
);
assert.ok(
  form.includes('image/jpeg,image/png,image/webp'),
  'El formulario no limita los formatos permitidos.',
);
assert.ok(
  compatibility.includes('uploadIncidentImages'),
  'El bloque integrado de incidencias no sube imágenes.',
);
assert.ok(
  legacyForm.includes("status('Incidencia del pedido #'+current.order_number+' guardada.','ok');return current"),
  'El formulario de pedidos no devuelve la incidencia guardada para poder subir sus imágenes.',
);
assert.ok(
  compatibility.includes('function printableImages'),
  'La impresión no incorpora las imágenes.',
);
assert.ok(
  compatibility.includes('Imágenes de la incidencia'),
  'Falta el bloque de imágenes en el impreso.',
);
for (const expected of [
  'async function preparePrintableRecord',
  "credentials: 'same-origin'",
  'URL.createObjectURL(await response.blob())',
  'image.decode().catch',
  'await preparePrintableRecord(record)',
])
  assert.ok(
    compatibility.includes(expected),
    `La impresión puede iniciarse sin cargar las imágenes: ${expected}`,
  );
for (const expected of [
  'const files = [...imageDrafts.order]',
  'const files = [...imageDrafts.store]',
  "document.getElementById('storeImage').value = ''",
  'const files = [...imageDrafts.own]',
  "uploadIncidentImages('store', row, files)",
])
  assert.ok(
    compatibility.includes(expected),
    `Las imágenes pendientes pueden perderse al guardar: ${expected}`,
  );
assert.ok(
  read('drizzle/0008_incident_images.sql').includes(
    'CREATE TABLE `incident_images`',
  ),
  'Falta la migración de imágenes.',
);

console.log('Imágenes privadas de incidencias verificadas.');
