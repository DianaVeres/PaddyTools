import { foldSearchText } from './global-search.ts';

export type DeliveryEmailKind = 'colegio' | 'domicilio' | 'tienda';
export type DeliveryEmailDraft = {
  to: string;
  phone: string;
  subject: string;
  body: string;
  delivery: DeliveryEmailKind;
  carrier: 'viaxpress' | 'dhl';
  trackingNumber: string;
  customerName: string;
  recordKind: 'pedido' | 'reserva';
  reference: string;
  school: string;
};

export function deliveryKindFromText(
  value: string,
  fallback: DeliveryEmailKind,
): DeliveryEmailKind {
  const normalized = foldSearchText(value);
  if (normalized.includes('colegio')) return 'colegio';
  if (normalized.includes('domicilio')) return 'domicilio';
  if (normalized.includes('recog') || normalized.includes('tienda')) {
    return 'tienda';
  }
  return fallback;
}

export function deliveryEmailBody(draft: DeliveryEmailDraft) {
  if (draft.delivery === 'colegio') {
    return `Hola ${draft.customerName}. IMPORTANTE: su ${draft.recordKind} ${draft.reference} YA ESTÁ EN EL COLEGIO ${draft.school}. YA PUEDE IR AL COLEGIO A RECOGERLO. Gracias, un saludo.`;
  }
  if (draft.delivery === 'tienda') {
    return `Hola ${draft.customerName}, le comunicamos que ya tenemos su ${draft.recordKind} ${draft.reference} disponible para recoger en nuestra tienda de Paddy. Recuerde que ya estamos en el horario habitual (Mañanas de Lunes a Viernes de 10.00 a 14.00 y Tardes sólo Martes y Jueves de 15.00 a 19.00). Puede pasar cuando quiera a recogerlo. Gracias, un saludo`;
  }
  const trackingUrl =
    draft.carrier === 'dhl'
      ? 'https://www.dhl.com/'
      : 'https://viaxpress.es/envios/';
  return `Su pedido está preparado para ser enviado. El número de envío es ${draft.trackingNumber || '[Nº ENVÍO]'}. Podrá hacer el seguimiento en el siguiente enlace: ${trackingUrl}`;
}

export function createDeliveryEmailDraft(
  input: Omit<
    DeliveryEmailDraft,
    'subject' | 'body' | 'carrier' | 'trackingNumber'
  >,
): DeliveryEmailDraft {
  const draft: DeliveryEmailDraft = {
    ...input,
    carrier: 'viaxpress',
    trackingNumber: '',
    subject: `${input.recordKind === 'reserva' ? 'Reserva' : 'Pedido'} ${input.reference} preparado`,
    body: '',
  };
  return { ...draft, body: deliveryEmailBody(draft) };
}

export function updateDeliveryEmailDraft(
  current: DeliveryEmailDraft,
  changes: Partial<DeliveryEmailDraft>,
) {
  const next = { ...current, ...changes };
  return { ...next, body: deliveryEmailBody(next) };
}
