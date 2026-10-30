export function foldSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function shippingReferences(value: string) {
  const reference = value.trim().replace(/^#/, '').toUpperCase();
  if (!reference) return [];
  if (/^[RI]\d+$/.test(reference)) return [reference];

  const linked = reference.match(/^(?:I|R)?PA(.+)$/);
  if (!linked) return [reference];

  const suffix = linked[1];
  return [reference, `PA${suffix}`, `IPA${suffix}`, `RPA${suffix}`].filter(
    (item, index, items) => items.indexOf(item) === index,
  );
}
