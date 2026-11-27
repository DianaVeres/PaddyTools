import { reservationBarcodeMatches } from './reservation-preparation.ts';

export type PreparationTreatment =
  | 'school-ready'
  | 'store-ready'
  | 'manual-reservation'
  | 'total-reservation'
  | 'manual-home-delivery'
  | 'manual-home-reservation'
  | 'manual-review';

export type PreparationRoute = {
  treatment: PreparationTreatment;
  targetStatusName: string;
  message: string;
  automatic: boolean;
};

const folded = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function preparationRoute(
  shippingMethod: string,
  hasReservation: boolean,
  totalReservation = false,
): PreparationRoute {
  const method = folded(shippingMethod).replace(/^via\s+/, '');
  const isHomeDelivery =
    method.includes('envio valencia y comunidad valenciana') ||
    /^(?:envios?[\s:–—-]+(?:gratuitos?\s+)?(?:(?:a|al|a la|para)\s+)?)?(?:espana\s+)?peninsul(?:a|ar)\b/.test(method);

  if (totalReservation)
    return {
      treatment: 'total-reservation',
      targetStatusName: 'Reserva Total',
      message: 'Estado cambiado a Reserva Total.',
      automatic: true,
    };

  if (hasReservation && isHomeDelivery)
    return {
      treatment: 'manual-home-reservation',
      targetStatusName: '',
      message:
        'Pendiente de tratamiento manual: envío a domicilio con reserva.',
      automatic: false,
    };

  if (method.includes('recogida en tienda paddy'))
    return {
      treatment: 'store-ready',
      targetStatusName: 'Disponible para recogida en tienda',
      message: 'Estado cambiado a Disponible para recogida en tienda.',
      automatic: true,
    };

  if (isHomeDelivery)
    return {
      treatment: 'manual-home-delivery',
      targetStatusName: '',
      message: 'Pendiente de tratamiento manual: envío a domicilio.',
      automatic: false,
    };

  if (/^envio (?:gratuito )?(?:a|al)\b/.test(method))
    return {
      treatment: 'school-ready',
      targetStatusName: 'Pedido preparado',
      message: 'Estado cambiado a Pedido preparado.',
      automatic: true,
    };

  return {
    treatment: hasReservation ? 'manual-reservation' : 'manual-review',
    targetStatusName: '',
    message:
      'Pendiente de tratamiento manual: método de entrega no reconocido.',
    automatic: false,
  };
}

export function isTotalPreparationReservation(
  items: Array<{ sku: string; size: string; quantity: number }>,
  reservations: Array<{ code: string; size: string; quantity: number }>,
) {
  if (!reservations.length) return false;
  const remaining = items.map((item) => item.quantity);
  for (const reservation of reservations) {
    let units = reservation.quantity;
    if (!Number.isSafeInteger(units) || units <= 0)
      throw new Error('Revisa las unidades pendientes de la reserva en Monday.');
    for (const [index, item] of items.entries()) {
      if (!remaining[index] || !reservationBarcodeMatches(reservation, {
        article: item.sku,
        size: item.size === '—' && item.sku.includes('/') ? item.sku.split('/').at(-1) || '' : item.size,
      })) continue;
      const used = Math.min(units, remaining[index]);
      remaining[index] -= used;
      units -= used;
      if (!units) break;
    }
    if (units) throw new Error('Hay artículos o unidades reservadas en Monday que no coinciden con el pedido. Revisa la referencia y la talla.');
  }
  return remaining.every((units) => units === 0);
}

export function preparedTreatment(
  order: { shippingMethod: string; hasReservation: boolean; treatment: string },
) {
  if (order.treatment === 'sent' || order.treatment === 'total-reservation') return order.treatment;
  const { treatment } = preparationRoute(order.shippingMethod, order.hasReservation);
  return treatment === 'manual-home-delivery' || treatment === 'manual-home-reservation'
    ? treatment
    : order.treatment;
}

export function wooStatusSlugByName(
  statuses: Array<{ slug?: string; name?: string }>,
  statusName: string,
) {
  const wanted = folded(statusName);
  const aliases = wanted === 'disponible para recogida en tienda' ? [wanted, 'disponible en tienda'] : [wanted];
  const found = statuses.find(
    (status) =>
      aliases.includes(folded(status.name)) ||
      aliases.includes(folded(status.slug).replace(/^wc-/, '').replace(/-/g, ' ')),
  );
  return String(found?.slug || '').replace(/^wc-/, '');
}
