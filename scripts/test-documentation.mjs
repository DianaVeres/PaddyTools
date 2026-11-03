import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
const manual = readFileSync(
  resolve(root, 'docs/MANUAL_DE_USO_PADDYTOOLS.md'),
  'utf8',
);

if (!readme.includes('docs/MANUAL_DE_USO_PADDYTOOLS.md'))
  throw new Error('El README no enlaza el manual oficial.');

for (const section of [
  'Pantalla principal y consulta global',
  'PackingList',
  'Reservas',
  'Recogidas',
  'Incidencias',
  'Hotline',
  'Contador de productividad',
  'Lecturas de productividad',
  'Lecturas de tiempos',
  'Calidad y errores',
  'Errores por cada 100 tareas',
  'Reglas para obtener datos fiables',
]) {
  if (!manual.includes(section))
    throw new Error(`El manual ha perdido la sección: ${section}`);
}

console.log('Manual de PaddyTools y lectura de KPIs verificado.');
