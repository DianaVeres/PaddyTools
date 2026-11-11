export type HistoricalHotlineCase = {
  id?: string;
  fecha?: string;
  email?: string;
  asunto?: string;
  consulta?: string;
  respuesta?: string;
  siguiente_paso?: string;
};

const normalizeReference = (prefix: string, digits: string) =>
  `${prefix.toUpperCase()}${digits}`;

export function historicalHotlineReferences(contact: HistoricalHotlineCase) {
  const text = [
    contact.asunto,
    contact.consulta,
    contact.respuesta,
    contact.siguiente_paso,
  ]
    .filter(Boolean)
    .join(' ');
  const references = new Set<string>();

  for (const match of text.matchAll(/\b(RPA|IPA|PA|R)\s*[#\s-]*\s*(\d{4,})\b/gi))
    references.add(normalizeReference(match[1], match[2]));

  for (const match of text.matchAll(
    /\b(pedido|order|reserva)\s*(?:n[ºo°.]*)?\s*#?\s*(\d{4,})\b/gi,
  ))
    references.add(
      normalizeReference(/^reserva$/i.test(match[1]) ? 'R' : 'PA', match[2]),
    );

  return [...references];
}

