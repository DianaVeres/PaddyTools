import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const component = readFileSync(
  resolve(root, 'components/dashboard/customer-message-dialog.tsx'),
  'utf8',
);
const page = readFileSync(resolve(root, 'app/page.tsx'), 'utf8');

for (const fragment of [
  'Preparar aviso al cliente',
  'Entrega en colegio',
  'Envío a domicilio',
  'Recogida en tienda',
  "draft.delivery === 'colegio'",
  "draft.delivery === 'domicilio'",
  'Empresa de transporte',
  'Número de envío',
  'Copiar texto',
  'Abrir WhatsApp',
  'Abrir correo',
  '!nextOpen && onClose()',
]) {
  if (!component.includes(fragment))
    throw new Error(`El diálogo de avisos ha perdido: ${fragment}`);
}

for (const fragment of [
  '@/components/dashboard/customer-message-dialog',
  '<CustomerMessageDialog',
  "open={modal === 'email'}",
  'draft={emailDraft}',
  'onGeneratedChange={updateGeneratedEmail}',
  'onCopy={() => void copyEmailText()}',
  'onWhatsApp={launchWhatsApp}',
  'onEmail={launchEmail}',
]) {
  if (!page.includes(fragment))
    throw new Error(`La pantalla no conecta el diálogo de avisos: ${fragment}`);
}

console.log('Diálogo de email y WhatsApp verificado.');
