import assert from 'node:assert/strict';
import {
  buildEmailLink,
  buildWhatsAppLink,
  normalizeWhatsAppPhone,
} from '../lib/contact-links.ts';

assert.equal(normalizeWhatsAppPhone('612 345 678'), '34612345678');
assert.equal(normalizeWhatsAppPhone('+34 612 345 678'), '34612345678');
assert.equal(normalizeWhatsAppPhone('0034 612 345 678'), '34612345678');
assert.equal(normalizeWhatsAppPhone('12345'), null);

const email = buildEmailLink(
  ' cliente@example.com ',
  'Pedido PA123 preparado',
  'Hola Ana & José',
);
assert.match(email, /^mailto:cliente@example\.com\?/);
assert.match(email, /subject=Pedido\+PA123\+preparado/);
assert.match(email, /body=Hola\+Ana\+%26\+Jos%C3%A9/);
assert.equal(buildEmailLink('correo-invalido', 'Asunto', 'Texto'), null);

assert.equal(
  buildWhatsAppLink('612 345 678', 'Pedido PA123 preparado'),
  'https://wa.me/34612345678?text=Pedido%20PA123%20preparado',
);
assert.equal(buildWhatsAppLink('12345', 'Texto'), null);

console.log('Enlaces de contacto verificados.');
