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

const compactReferences = (text: string) =>
  text
    .toUpperCase()
    .replace(/(RPA|IPA|PA|R)[\s#-]+(?=\d)/g, '$1');

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
  const text = compactReferences(
    [contact.asunto, contact.consulta, contact.respuesta, contact.siguiente_paso]
      .filter(Boolean)
      .join(' '),
  );
  return [...candidates].some((reference) =>
    new RegExp(`(^|[^A-Z0-9])${reference}(?![A-Z0-9])`).test(text),
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
