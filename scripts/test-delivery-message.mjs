import assert from 'node:assert/strict';
import {
  createDeliveryEmailDraft,
  deliveryKindFromText,
  updateDeliveryEmailDraft,
} from '../lib/delivery-message.ts';

assert.equal(deliveryKindFromText('ENTREGA COLEGIO', 'domicilio'), 'colegio');
assert.equal(deliveryKindFromText('Envío a domicilio', 'tienda'), 'domicilio');
assert.equal(deliveryKindFromText('Recogida en tienda', 'domicilio'), 'tienda');
assert.equal(deliveryKindFromText('', 'domicilio'), 'domicilio');

const base = {
  to: 'cliente@example.com',
  phone: '600000000',
  customerName: 'Ana',
  recordKind: 'reserva',
  reference: 'R10692',
  school: 'PURISIMA',
  delivery: 'colegio',
};
const schoolDraft = createDeliveryEmailDraft(base);
assert.equal(schoolDraft.subject, 'Reserva R10692 preparada');
assert.match(schoolDraft.body, /COLEGIO PURISIMA/);
assert.match(schoolDraft.body, /reserva R10692/);

const homeDraft = updateDeliveryEmailDraft(schoolDraft, {
  delivery: 'domicilio',
  carrier: 'dhl',
  trackingNumber: 'DHL123',
});
assert.match(homeDraft.body, /DHL123/);
assert.match(homeDraft.body, /https:\/\/www\.dhl\.com\//);

const storeDraft = updateDeliveryEmailDraft(schoolDraft, {
  delivery: 'tienda',
});
assert.match(storeDraft.body, /tienda de Paddy/);

const incidentDraft = updateDeliveryEmailDraft(homeDraft, {
  recordKind: 'incidencia',
});
assert.equal(incidentDraft.subject, 'Incidencia R10692 preparada');
assert.match(incidentDraft.body, /Su incidencia R10692 está preparada/);
assert.doesNotMatch(incidentDraft.body, /Su pedido/);

const specialGarmentDraft = createDeliveryEmailDraft({
  ...base,
  recordKind: 'prenda',
  reference: '9876543210',
});
assert.equal(
  specialGarmentDraft.subject,
  'Prenda especial 9876543210 preparada',
);
assert.match(specialGarmentDraft.body, /prenda especial 9876543210/);

console.log('Mensajes de entrega verificados.');
