import assert from 'node:assert/strict';
import { buildStandaloneLabelHtml } from '../lib/label-print.ts';

const html = buildStandaloneLabelHtml([
  'PA49547',
  'Ana & José <Paddy>',
  'Teatinas Pinto Web',
  'Sudadera azul',
  'Esta línea no debe imprimirse',
]);

assert.match(html, /@page \{ size: 150mm 100mm; margin: 0; \}/);
assert.match(html, /PA49547/);
assert.match(html, /ANA &amp; JOSÉ &lt;PADDY&gt;/);
assert.match(html, /class="line-4"/);
assert.doesNotMatch(html, /ESTA LÍNEA NO DEBE IMPRIMIRSE/);
assert.doesNotMatch(html, /<PADDY>/);

console.log('Impresión independiente de etiquetas verificada.');
