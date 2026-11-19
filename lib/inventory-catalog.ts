export function normalizeInventoryCode(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 40);
}

export function inventoryCodeCandidates(value: unknown) {
  const original = normalizeInventoryCode(value);
  const candidates = new Set<string>();
  if (original) candidates.add(original);
  if (/^\d+$/.test(original)) {
    const withoutZeros = original.replace(/^0+/, '') || '0';
    candidates.add(withoutZeros);
    if (withoutZeros.length > 6) candidates.add(withoutZeros.slice(0, -1));
  }
  return [...candidates];
}
