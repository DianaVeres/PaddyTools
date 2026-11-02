import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/common.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'formatDashboardDate',
  'DashboardField',
  'SourceBadge',
  "className=\"field\"",
  "className=\"source-badge\"",
]) {
  if (!component.includes(fragment))
    throw new Error(`Los elementos comunes han perdido: ${fragment}`);
}
if (!page.includes("@/components/dashboard/common"))
  throw new Error('La pantalla no usa los elementos comunes.');
if (page.includes('function SourceBadge(') || page.includes('function Field('))
  throw new Error('La pantalla ha recuperado componentes duplicados.');

console.log('Elementos comunes del panel verificados.');
