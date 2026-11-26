import { searchKey } from './global-search.ts';

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
