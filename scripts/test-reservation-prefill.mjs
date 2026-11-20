import assert from 'node:assert/strict';
import {
  reservationArticleCodeFromSku,
  reservationArticleIdForCode,
  reservationObservationFromShippingMethod,
  reservationSchoolOption,
  reservationSize,
} from '../lib/reservation-prefill.ts';

assert.equal(reservationArticleCodeFromSku('3/9508/AZUL MARINO/8'), '9508');
assert.equal(reservationSize('8'), 'T.8');
assert.equal(reservationSize('T.XL'), 'T.XL');
assert.equal(
  reservationArticleIdForCode(
    [
      { id: 'A1', code: '3/9508' },
      { id: 'A2', code: '5025' },
    ],
    '9508',
  ),
  'A1',
  'debe reconocer artículos de Monday con prefijo',
);
assert.equal(
  reservationSchoolOption(
    ['BCLC', 'TEATINAS PINTO'],
    'British College La Cañada',
  ),
  'BCLC',
);
assert.equal(
  reservationSchoolOption(['TEATINAS PINTO'], 'Teatinas Pinto Web'),
  'TEATINAS PINTO',
);
assert.equal(
  reservationObservationFromShippingMethod('Recogida en tienda Paddy'),
  'RECOGIDA EN TIENDA',
);
assert.equal(
  reservationObservationFromShippingMethod('Envío Península'),
  'ENVÍO A DOMICILIO',
);
assert.equal(
  reservationObservationFromShippingMethod('Envío a Colegio Shackleton'),
  'ENTREGA COLEGIO',
);

console.log('Autorrelleno de reservas verificado.');
