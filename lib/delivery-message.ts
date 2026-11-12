import { foldSearchText } from './global-search.ts';

export type DeliveryEmailKind = 'colegio' | 'domicilio' | 'tienda';
export type DeliveryRecordKind = 'pedido' | 'reserva' | 'prenda' | 'incidencia';
export type DeliveryEmailDraft = {
  to: string;
  phone: string;
  subject: string;
  body: string;
  delivery: DeliveryEmailKind;
  carrier: 'viaxpress' | 'dhl';
  trackingNumber: string;
  customerName: string;
  recordKind: DeliveryRecordKind;
  reference: string;
  school: string;
};

function recordKindLabel(kind: DeliveryRecordKind) {
  return kind === 'pedido'
    ? { lower: 'pedido', title: 'Pedido', prepared: 'preparado', sent: 'enviado' }
    : kind === 'reserva' || kind === 'prenda'
      ? kind === 'reserva'
        ? { lower: 'reserva', title: 'Reserva', prepared: 'preparada', sent: 'enviada' }
        : { lower: 'prenda especial', title: 'Prenda especial', prepared: 'preparada', sent: 'enviada' }
      : {
          lower: 'incidencia',
          title: 'Incidencia',
          prepared: 'preparada',
          sent: 'enviada',
        };
}

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
  const record = recordKindLabel(draft.recordKind);
  if (draft.delivery === 'colegio') {
    return `Hola ${draft.customerName}. IMPORTANTE: su ${record.lower} ${draft.reference} YA ESTÁ EN EL COLEGIO ${draft.school}. YA PUEDE IR AL COLEGIO A RECOGERLO. Gracias, un saludo.`;
  }
  if (draft.delivery === 'tienda') {
    return `Hola ${draft.customerName}, le comunicamos que ya tenemos su ${record.lower} ${draft.reference} disponible para recoger en nuestra tienda de Paddy. Recuerde que ya estamos en el horario habitual (Mañanas de Lunes a Viernes de 10.00 a 14.00 y Tardes sólo Martes y Jueves de 15.00 a 19.00). Puede pasar cuando quiera a recogerlo. Gracias, un saludo`;
  }
  const trackingUrl =
    draft.carrier === 'dhl'
      ? 'https://www.dhl.com/'
      : 'https://viaxpress.es/envios/';
  return `Su ${record.lower} ${draft.reference} está ${record.prepared} para ser ${record.sent}. El número de envío es ${draft.trackingNumber || '[Nº ENVÍO]'}. Podrá hacer el seguimiento en el siguiente enlace: ${trackingUrl}`;
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
    subject: `${recordKindLabel(input.recordKind).title} ${input.reference} ${recordKindLabel(input.recordKind).prepared}`,
    body: '',
  };
  return { ...draft, body: deliveryEmailBody(draft) };
}

export function updateDeliveryEmailDraft(
  current: DeliveryEmailDraft,
  changes: Partial<DeliveryEmailDraft>,
) {
  const next = { ...current, ...changes };
  const record = recordKindLabel(next.recordKind);
  const subject =
    changes.recordKind === undefined && changes.reference === undefined
      ? next.subject
      : `${record.title} ${next.reference} ${record.prepared}`;
  return { ...next, subject, body: deliveryEmailBody(next) };
}
