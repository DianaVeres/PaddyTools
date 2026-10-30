export function foldSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function normalizeReferenceInput(value: string) {
  return value.trim().replace(/^#/, '').toUpperCase();
}

export function linkedWooOrderReference(value: string) {
  const reference = normalizeReferenceInput(value);
  if (/^I(?=R\d+$)/.test(reference)) return reference.slice(1);
  const linked = reference.match(/^(?:I|R)?PA(.+)$/);
  return linked ? `PA${linked[1]}` : reference;
}

export function isWooOrderReference(value: string) {
  return /^PA.+/.test(linkedWooOrderReference(value));
}

export function isExactRecordReference(value: string) {
  const reference = linkedWooOrderReference(value);
  return isWooOrderReference(reference) || /^(?:R\d+|\d+)$/.test(reference);
}

export function shippingReferences(value: string) {
  const reference = normalizeReferenceInput(value);
  if (!reference) return [];
  if (/^[RI]\d+$/.test(reference)) return [reference];

  const linked = reference.match(/^(?:I|R)?PA(.+)$/);
  if (!linked) return [reference];

  const suffix = linked[1];
  return [reference, `PA${suffix}`, `IPA${suffix}`, `RPA${suffix}`].filter(
    (item, index, items) => items.indexOf(item) === index,
  );
}

export function mondayReferenceCandidates(value: string) {
  const reference = normalizeReferenceInput(value);
  if (!reference) return [];
  const linked = reference.match(/^(?:I|R)?PA(.+)$/);
  const orderReference = linkedWooOrderReference(reference);
  const plain = linked ? linked[1] : reference.replace(/^PA/, '');
  return [
    reference,
    orderReference,
    linked ? `IPA${plain}` : '',
    linked ? `RPA${plain}` : '',
    plain,
    `#${plain}`,
  ].filter(
    (candidate, index, candidates) =>
      Boolean(candidate) && candidates.indexOf(candidate) === index,
  );
}
