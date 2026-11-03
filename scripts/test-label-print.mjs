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
assert.match(html, /position: fixed;/);
assert.match(html, /width: 149\.8mm;/);
assert.match(html, /height: 99\.8mm;/);
assert.match(html, /page-break-after: avoid;/);
assert.doesNotMatch(html, /html, body \{ width: 150mm; height: 100mm;/);
assert.match(html, /PA49547/);
assert.match(html, /ANA &amp; JOSÉ &lt;PADDY&gt;/);
assert.match(html, /class="line-4"/);
assert.doesNotMatch(html, /ESTA LÍNEA NO DEBE IMPRIMIRSE/);
assert.doesNotMatch(html, /<PADDY>/);

console.log('Impresión independiente de etiquetas verificada.');
