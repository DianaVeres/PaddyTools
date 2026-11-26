import { normalizeReferenceInput } from './global-search.ts';

export function returnOrderReference(value: string) {
  let reference = value.trim();
  if (/^https?:\/\//i.test(reference)) {
    let url: URL;
    try { url = new URL(reference); } catch { return ''; }
    reference = url.searchParams.get('order') || url.searchParams.get('order_id') ||
      url.searchParams.get('post') || url.pathname.match(/(?:orders|pedido|view-order)\/((?:PA)?\d+)\/?$/i)?.[1] || '';
  }
  reference = normalizeReferenceInput(reference.replace(/^pedido\s*:?\s*/i, ''));
  return /^(?:PA)?\d{1,15}$/.test(reference) ? reference : '';
}

export function returnReceivedNote(kind: 'return' | 'incident', name: string, size: string, date: Date) {
  const day = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
  return `${kind === 'incident' ? 'Incidencia' : 'Devolución'} de ${name} Talla ${size} recibida el ${day}`;
}
