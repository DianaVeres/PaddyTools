import assert from 'node:assert/strict';
import {
  isTotalPreparationReservation,
  preparationRoute,
  preparedTreatment,
  wooStatusSlugByName,
} from '../lib/order-preparation-routing.ts';

assert.equal(
  preparationRoute('vía Envío al Colegio', false).targetStatusName,
  'Pedido preparado',
);
assert.equal(
  preparationRoute('vía Envío al Colegio', true).treatment,
  'school-ready',
);
assert.deepEqual(preparationRoute('Envío a British College La Cañada', false), {
  treatment: 'school-ready',
  targetStatusName: 'Pedido preparado',
  message: 'Estado cambiado a Pedido preparado.',
  automatic: true,
});
assert.equal(
  preparationRoute('vía Recogida en tienda Paddy', false).targetStatusName,
  'Disponible para recogida en tienda',
);
assert.equal(
  preparationRoute('Envío Valencia y Comunidad Valenciana', false).treatment,
  'manual-home-delivery',
);
assert.equal(
  preparationRoute('Envío Península', false).treatment,
  'manual-home-delivery',
);
for (const method of ['Península', 'vía Envío a Península', 'Envío a la Península', 'Envío - España peninsular', 'Envío gratuito a Península']) {
  assert.equal(preparationRoute(method, false).treatment, 'manual-home-delivery');
  assert.equal(preparedTreatment({ shippingMethod: method, hasReservation: true, treatment: 'manual-review' }), 'manual-home-reservation');
  assert.equal(preparedTreatment({ shippingMethod: method, hasReservation: false, treatment: 'sent' }), 'sent');
}
assert.equal(preparationRoute('Envío al Colegio Peninsular', false).treatment, 'school-ready');
assert.equal(preparationRoute('vía Envío gratuito a Colegio San Pedro', false).targetStatusName, 'Pedido preparado');
assert.equal(preparationRoute('Envío gratuito al Colegio San Pedro', true).treatment, 'school-ready');
assert.equal(
  preparationRoute('Envío Península', true).treatment,
  'manual-home-reservation',
  'un envío a domicilio con reserva debe conservar ambas gestiones',
);
assert.equal(
  preparationRoute('Envío a Colegio', true).treatment,
  'school-ready',
  'una reserva parcial de colegio pasa a preparado',
);
assert.equal(
  wooStatusSlugByName(
    [{ slug: 'wc-pedido-preparado', name: 'Pedido preparado' }],
    'Pedido preparado',
  ),
  'pedido-preparado',
);

assert.equal(preparationRoute('Recogida en tienda Paddy', true).treatment, 'store-ready');
assert.equal(wooStatusSlugByName([{ slug: 'wc-tienda', name: 'Disponible en tienda' }], 'Disponible para recogida en tienda'), 'tienda');
for (const method of ['Envío a colegio', 'Recogida en tienda Paddy', 'Envío Península']) {
  assert.equal(preparationRoute(method, true, true).targetStatusName, 'Reserva Total');
  assert.equal(preparedTreatment({ shippingMethod: method, hasReservation: true, treatment: 'total-reservation' }), 'total-reservation');
}
const items = [{ sku: '3/9508/AZUL/8', size: '8', quantity: 2 }];
assert.equal(isTotalPreparationReservation(items, [{ code: '9508', size: 'T.8', quantity: 1 }]), false);
assert.equal(isTotalPreparationReservation(items, [{ code: '9508', size: 'T.8', quantity: 2 }]), true);
assert.throws(() => isTotalPreparationReservation(items, [{ code: '9508', size: 'T.10', quantity: 2 }]));
console.log('Enrutado de pedidos preparados verificado.');
