import { linkedWooOrderReference, normalizeReferenceInput } from './global-search.ts';

export function returnSearchTerm(value: string) {
  let reference = value.trim();
  if (/^https?:\/\//i.test(reference)) {
    let url: URL;
    try { url = new URL(reference); } catch { return ''; }
    reference = url.searchParams.get('order') || url.searchParams.get('order_id') ||
      url.searchParams.get('post') || url.searchParams.get('number') || url.searchParams.get('reference') ||
      url.pathname.match(/(?:orders|pedido|view-order)\/([\w-]+)\/?$/i)?.[1] || '';
  }
  return reference.replace(/^pedido\s*:\s*|^pedido\s+(?=[#\d]|[IR]?PA\d)/i, '').trim();
}

export function returnOrderReference(value: string) {
  const reference = linkedWooOrderReference(returnSearchTerm(value));
  return /^(?:PA)?\d{1,15}$/.test(reference) ? reference : '';
}

export function isExactReturnReference(value: string) {
  return /^(?:[IR]?PA\d+|[IR]\d+|IR\d+|I?INT-[\w-]+|\d+)$/i.test(normalizeReferenceInput(value));
}

export function returnReceivedNote(kind: 'return' | 'incident', name: string, size: string, date: Date, quantity = 1) {
  const day = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
  return `${kind === 'incident' ? 'Incidencia' : 'Devolución'} de ${name} Talla ${size} recibida el ${day} (${quantity} ${quantity === 1 ? 'unidad' : 'unidades'})`;
}
