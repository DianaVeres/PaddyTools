import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const page = read('app/hotline/page.tsx');
const gateway = read('lib/hotline-gateway.ts');
const config = read('wrangler.independent.jsonc');

for (const fragment of [
  'Asistente',
  'Registro',
  'Plantillas',
  'Análisis',
  '/api/hotline/analyze',
  '/api/hotline/cases',
  '/api/hotline/templates',
  'Guardar contacto',
  'Nueva plantilla',
  "beginAutomaticWork(\n      HOTLINE_TIMER_KEY,\n      'correos'",
  'completeAutomaticWork(HOTLINE_TIMER_KEY',
  'Medición activa desde',
]) {
  if (!page.includes(fragment))
    throw new Error(`El módulo Hotline ha perdido: ${fragment}`);
}

const saved = page.indexOf(
  "if (!response.ok) throw new Error(data.error || 'No se pudo guardar el contacto.')",
);
const completed = page.indexOf('await completeAutomaticWork(HOTLINE_TIMER_KEY');
if (saved < 0 || completed < saved)
  throw new Error(
    'Hotline termina el contador antes de confirmar el guardado del contacto.',
  );

for (const fragment of [
  "new Set(['analyze', 'cases', 'templates'])",
  'HOTLINE_SERVICE',
  'service.fetch',
  'request.arrayBuffer()',
]) {
  if (!gateway.includes(fragment))
    throw new Error(`La conexión privada de Hotline ha perdido: ${fragment}`);
}

if (!config.includes('"service": "paddy-hotline"'))
  throw new Error('Cloudflare no tiene configurado el servicio privado Hotline.');

console.log('Módulo Hotline y conexión privada verificados.');
