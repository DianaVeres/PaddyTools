import { historicalHotlineReferences } from '@/lib/hotline-backfill';

export type HotlineOrderContact = {
  id?: string;
  fecha: string;
  email: string;
  asunto: string;
  consulta: string;
  respuesta: string;
  estado: string;
  siguiente_paso: string;
  procedimiento: string;
};

export function hotlineContactMatchesOrder(
  contact: HotlineOrderContact,
  orderNumber: string,
) {
  const normalized = orderNumber.trim().toUpperCase().replace(/^#/, '');
  if (!normalized) return false;
  const candidates = new Set([normalized]);
  const prefixed = /^(RPA|IPA|PA)(\d+)$/.exec(normalized);
  if (prefixed) {
    candidates.add(`PA${prefixed[2]}`);
    candidates.add(`IPA${prefixed[2]}`);
    candidates.add(`RPA${prefixed[2]}`);
  }
  return historicalHotlineReferences(contact).some((reference) =>
    candidates.has(reference),
  );
}

export function hotlineContactsForOrder(
  contacts: HotlineOrderContact[],
  orderNumber: string,
) {
  return contacts
    .filter((contact) => hotlineContactMatchesOrder(contact, orderNumber))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}
