import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deployedRoot = join(workerRoot, 'deployed');
const entryPoint = join(deployedRoot, 'index.js');
const expectedHash = 'd10e486ca6225b511f53118aac5c774a7935c5c70d2aef1d0bf64e95de695f31';

function filesBelow(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

if (!existsSync(entryPoint)) throw new Error('Falta deployed/index.js.');

const files = filesBelow(deployedRoot);
const bytes = files.reduce((total, file) => total + statSync(file).size, 0);
const hash = createHash('sha256').update(readFileSync(entryPoint)).digest('hex');

if (files.length !== 52) throw new Error(`Se esperaban 52 módulos y hay ${files.length}.`);
if (hash !== expectedHash) throw new Error('El módulo principal no coincide con la versión recuperada.');

const entrySource = readFileSync(entryPoint, 'utf8');
const missingImports = [...entrySource.matchAll(/from\s*["'](\.\.?\/[^"']+)["']/g)]
  .map((match) => resolve(dirname(entryPoint), match[1]))
  .filter((file) => !existsSync(file));

if (missingImports.length) {
  throw new Error(`Faltan módulos importados:\n${missingImports.map((file) => relative(workerRoot, file)).join('\n')}`);
}

console.log(`Worker recuperado verificado: ${files.length} módulos, ${bytes} bytes.`);
