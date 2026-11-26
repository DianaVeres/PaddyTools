import assert from 'node:assert/strict';
import {
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
  'manual-reservation',
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
assert.equal(preparationRoute('Envío gratuito al Colegio San Pedro', true).treatment, 'manual-reservation');
assert.equal(
  preparationRoute('Envío Península', true).treatment,
  'manual-home-reservation',
  'un envío a domicilio con reserva debe conservar ambas gestiones',
);
assert.equal(
  preparationRoute('Envío a Colegio', true).treatment,
  'manual-reservation',
  'una reserva debe impedir el cambio automático aunque sea envío a colegio',
);
assert.equal(
  wooStatusSlugByName(
    [{ slug: 'wc-pedido-preparado', name: 'Pedido preparado' }],
    'Pedido preparado',
  ),
  'pedido-preparado',
);

console.log('Enrutado de pedidos preparados verificado.');
