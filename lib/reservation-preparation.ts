import { foldSearchText, searchKey } from './global-search.ts';

export function reservationBarcodeMatches(
  row: { code: string; size: string },
  product: { article: string; size: string },
) {
  const article = (value: string) => foldSearchText(value.replace(/^\d+\/(?=\d+\/)/, '').split('/')[0]);
  const size = (value: string) => foldSearchText(value.replace(/^\s*(?:talla\s+|t\.\s*|t\s*(?=\d))/i, ''));
  return Boolean(row.code && row.size && product.article && product.size &&
    article(row.code) === article(product.article) && size(row.size) === size(product.size));
}

export function reservationReference(value: string) {
  return value.trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
}

export function isDeliveredReservation(status: string) {
  return /^(?:RESERVA )?(?:ENTREGADA|ENTREGADO)(?: (?:ENVIADA|ENVIADO))?$/.test(searchKey(status));
}

export function canPrepareReservation(status: string, pending: string) {
  return !isDeliveredReservation(status)
    && !/ANULAD|CANCELAD|BLOQUEAD/.test(searchKey(status))
    && (!pending.trim() || Number(pending) > 0);
}

export function deliveredReservationLabel(labels: string[]) {
  return labels.find((label) => searchKey(label) === 'RESERVA ENTREGADA ENVIADA')
    ?? labels.find((label) => searchKey(label) === 'ENTREGADO ENVIADO');
}
