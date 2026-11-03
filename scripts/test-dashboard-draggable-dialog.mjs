import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const hook = readFileSync(resolve(root, 'lib/use-draggable-dialog.ts'), 'utf8');
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');
for (const fragment of ['innerWidth < 768', 'setPointerCapture', 'minX', 'maxX', 'reset'])
  assert.ok(hook.includes(fragment), `Falta protección de arrastre: ${fragment}`);
for (const fragment of ['useDraggableDialog()', 'reservationDialog.reset()', 'reservationDialog.start', 'reservationDialog.move', 'reservationDialog.stop'])
  assert.ok(page.includes(fragment), `La pantalla no usa el arrastre compartido: ${fragment}`);
console.log('Movimiento compartido de ventanas verificado.');
