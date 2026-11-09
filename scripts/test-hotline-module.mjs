import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  splitSpanishHotlineReply,
  storedHotlineIncoming,
  storedHotlineReply,
  withSpanishHotlineInstruction,
} from '../lib/hotline-language.ts';

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
  'Traducción al castellano',
  'Respuesta en castellano',
  'Respuesta en inglés',
  'Copiar respuesta en inglés',
  'withSpanishHotlineInstruction(guidance)',
  'storedHotlineIncoming(incoming, translatedIncoming)',
  'Ver ficha del pedido',
  'hotlineOrderReference',
  'setViewingOrder(reference)',
  'iframe src={`/?order=${encodeURIComponent(viewingOrder)}&embedded=1`}',
]) {
  if (!page.includes(fragment))
    throw new Error(`El módulo Hotline ha perdido: ${fragment}`);
}
const dashboard = read('app/page.tsx');
for (const fragment of ["initialParams.get('order')", 'await search(undefined, initialOrder)'])
  if (!dashboard.includes(fragment))
    throw new Error(`La ficha de Hotline no abre el pedido automáticamente: ${fragment}`);

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

const instruction = withSpanishHotlineInstruction('Incluye el número de pedido.');
if (!instruction.includes('RESPUESTA EN CASTELLANO:'))
  throw new Error('Hotline no obliga a generar la respuesta en castellano.');
if (!instruction.includes('RESPONSE IN ENGLISH:'))
  throw new Error('Hotline no obliga a generar la respuesta en inglés.');
if (!instruction.includes('máximo 120 palabras'))
  throw new Error('Hotline ha perdido el límite que agiliza la respuesta bilingüe.');

const localized = splitSpanishHotlineReply(`TRADUCCIÓN AL CASTELLANO:
Hola, necesito cambiar la talla.

RESPUESTA EN CASTELLANO:
Hola. Te indicamos cómo realizar el cambio.

RESPONSE IN ENGLISH:
Hello. We will explain how to make the exchange.`);
if (localized.translation !== 'Hola, necesito cambiar la talla.')
  throw new Error('Hotline no separa la traducción del mensaje original.');
if (localized.reply !== 'Hola. Te indicamos cómo realizar el cambio.')
  throw new Error('Hotline no separa la respuesta en castellano.');
if (localized.englishReply !== 'Hello. We will explain how to make the exchange.')
  throw new Error('Hotline no separa la respuesta en inglés.');
if (!storedHotlineIncoming('Hello', localized.translation).includes('Hello'))
  throw new Error('Hotline no conserva el mensaje original al guardar.');
if (!storedHotlineReply(localized.reply, localized.englishReply).includes('RESPONSE IN ENGLISH:'))
  throw new Error('Hotline no conserva las dos respuestas al guardar.');

console.log('Módulo Hotline y conexión privada verificados.');
