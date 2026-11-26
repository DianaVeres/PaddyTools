export type PreparationTreatment =
  | 'school-ready'
  | 'store-ready'
  | 'manual-reservation'
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
): PreparationRoute {
  const method = folded(shippingMethod).replace(/^via\s+/, '');
  const isHomeDelivery =
    method.includes('envio valencia y comunidad valenciana') ||
    /^(?:envios?[\s:–—-]+(?:gratuitos?\s+)?(?:(?:a|al|a la|para)\s+)?)?(?:espana\s+)?peninsul(?:a|ar)\b/.test(method);

  if (hasReservation && isHomeDelivery)
    return {
      treatment: 'manual-home-reservation',
      targetStatusName: '',
      message:
        'Pendiente de tratamiento manual: envío a domicilio con reserva.',
      automatic: false,
    };

  if (hasReservation)
    return {
      treatment: 'manual-reservation',
      targetStatusName: '',
      message: 'Pendiente de tratamiento manual: lleva reserva.',
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
    treatment: 'manual-review',
    targetStatusName: '',
    message:
      'Pendiente de tratamiento manual: método de entrega no reconocido.',
    automatic: false,
  };
}

export function preparedTreatment(
  order: { shippingMethod: string; hasReservation: boolean; treatment: string },
) {
  if (order.treatment === 'sent') return order.treatment;
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
  const found = statuses.find(
    (status) =>
      folded(status.name) === wanted ||
      folded(status.slug).replace(/^wc-/, '').replace(/-/g, ' ') === wanted,
  );
  return String(found?.slug || '').replace(/^wc-/, '');
}
