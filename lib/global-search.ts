export function foldSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function searchKey(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
}

export function searchDigits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

export function wooSearchVariants(value: string) {
  const query = value.trim();
  if (!query) return [];
  const phone = searchDigits(query);
  const first = phone.length >= 5 ? phone : query;
  const plain = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = query.split(/\s+/).filter((word) => word.length >= 3);
  const plainWords = plain.split(/\s+/).filter((word) => word.length >= 3);
  return [first, plain, ...words, ...plainWords].filter(
    (candidate, index, candidates) =>
      Boolean(candidate) && candidates.indexOf(candidate) === index,
  );
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

export function incidentReferenceCandidates(value: string) {
  const reference = normalizeReferenceInput(value);
  if (!reference) return [];
  const withoutIncidentPrefix = reference.replace(
    /^I(?=(?:R|PA|INT-|\d))/,
    '',
  );
  return [
    reference,
    withoutIncidentPrefix,
    `I${withoutIncidentPrefix}`,
    ...shippingReferences(reference),
  ].filter(
    (candidate, index, candidates) =>
      Boolean(candidate) && candidates.indexOf(candidate) === index,
  );
}

export function incidentStorageReference(value: string) {
  const reference = linkedWooOrderReference(value);
  if (!reference) return '';
  return /^I/.test(reference) ? reference : `I${reference}`;
}

export function reservationStorageReference(value: string) {
  const reference = linkedWooOrderReference(value);
  if (!reference) return '';
  return /^R/.test(reference) ? reference : `R${reference}`;
}
