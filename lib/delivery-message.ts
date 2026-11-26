import { foldSearchText } from './global-search.ts';

export type DeliveryEmailKind =
  | 'colegio'
  | 'domicilio'
  | 'tienda'
  | 'reserva-pendiente';
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
  reservationSummary?: string;
};

const trackingLinks: Record<DeliveryEmailDraft['carrier'], string> = {
  viaxpress: 'https://viaxpress.es/envios/',
  dhl: 'https://www.dhl.com/es-es/home/seguimiento.html',
};

export function buildPrivateShippingNote(
  carrier: DeliveryEmailDraft['carrier'],
  trackingNumber: string,
) {
  return [
    `Su pedido está preparado para ser enviado. El número de envío es ${trackingNumber.trim()}.`,
    'Podrá hacer el seguimiento en el siguiente enlace:',
    trackingLinks[carrier],
  ].join('\n');
}

type ReservationLine = {
  reference: string;
  description: string;
  size: string;
  units: string;
};

type ReservationDelivery =
  | { kind: 'school' | 'store' }
  | { kind: 'home'; carrier: DeliveryEmailDraft['carrier']; trackingNumber: string };

export function buildPrivateReservationNote(
  reservations: ReservationLine[],
  delivery: ReservationDelivery,
) {
  const rows = reservations.flatMap(({ reference, description, size, units }) => [
    `- ${description} ${size} (${units} ${units === '1' ? 'unidad' : 'unidades'})`,
    `- Nº RESERVA: ${reference}`,
  ]);
  const lines = [
    delivery.kind === 'home' && rows.length === 2
      ? 'Su pedido contiene un artículo reservado y pagado del que no tenemos stock actualmente:'
      : 'Su pedido contiene artículos reservados y pagados de los que no tenemos stock actualmente:',
    ...rows,
  ];
  if (delivery.kind === 'store') {
    lines.unshift('Estimada cliente.');
    lines.push(
      'Procederemos a avisarle en cuanto la tengamos disponible.',
      'El resto de prendas están preparadas para que pase por nuestra tienda a recogerlas.',
      'No dude en consultarnos para cualquier aclaración de su pedido on-line.',
    );
  } else {
    lines.push('Procederemos a enviárselo al colegio en cuanto esté disponible.');
    if (delivery.kind === 'home') {
      lines.push(
        `El resto de las prendas están preparadas para ser enviadas. El número de envío es ${delivery.trackingNumber.trim()}.`,
        `Podrá hacer el seguimiento en el siguiente enlace: ${trackingLinks[delivery.carrier]}`,
      );
    } else {
      lines.push(
        'El resto de prendas están preparadas para ser enviadas al colegio (les avisaremos mediante correo electrónico cuando pueda pasar a recogerlas).',
      );
    }
  }
  return [...lines, 'Gracias y disculpe las molestias'].join('\n');
}

function recordKindLabel(kind: DeliveryRecordKind) {
  return kind === 'pedido'
    ? {
        lower: 'pedido',
        title: 'Pedido',
        prepared: 'preparado',
        sent: 'enviado',
      }
    : kind === 'reserva' || kind === 'prenda'
      ? kind === 'reserva'
        ? {
            lower: 'reserva',
            title: 'Reserva',
            prepared: 'preparada',
            sent: 'enviada',
          }
        : {
            lower: 'prenda especial',
            title: 'Prenda especial',
            prepared: 'preparada',
            sent: 'enviada',
          }
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
  if (draft.delivery === 'reserva-pendiente') {
    const pending = draft.reservationSummary?.trim() || 'artículo pendiente';
    return `Hola ${draft.customerName}, su ${record.lower} ${draft.reference} está ${record.prepared}, pero queda pendiente en reserva: ${pending}. Le avisaremos cuando recibamos el artículo pendiente. Gracias, un saludo.`;
  }
  if (draft.delivery === 'colegio') {
    return `Hola ${draft.customerName}. IMPORTANTE: su ${record.lower} ${draft.reference} YA ESTÁ EN EL COLEGIO ${draft.school}. YA PUEDE IR AL COLEGIO A RECOGERLO. Gracias, un saludo.`;
  }
  if (draft.delivery === 'tienda') {
    return `Hola ${draft.customerName}, le comunicamos que ya tenemos su ${record.lower} ${draft.reference} disponible para recoger en nuestra tienda de Paddy. Recuerde que ya estamos en el horario habitual (Mañanas de Lunes a Viernes de 10.00 a 14.00 y Tardes sólo Martes y Jueves de 15.00 a 19.00). Puede pasar cuando quiera a recogerlo. Gracias, un saludo`;
  }
  const trackingUrl = trackingLinks[draft.carrier];
  const reservationText = draft.reservationSummary?.trim()
    ? ` Queda pendiente en reserva: ${draft.reservationSummary.trim()}. Le avisaremos cuando recibamos el artículo pendiente.`
    : '';
  return `Su ${record.lower} ${draft.reference} está ${record.prepared} para ser ${record.sent}. El número de envío es ${draft.trackingNumber || '[Nº ENVÍO]'}. Podrá hacer el seguimiento en el siguiente enlace: ${trackingUrl}.${reservationText}`;
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
  if (
    input.delivery === 'reserva-pendiente' ||
    input.reservationSummary?.trim()
  )
    draft.subject = `${recordKindLabel(input.recordKind).title} ${input.reference} preparado con reserva pendiente`;
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
