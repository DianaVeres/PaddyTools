import { normalizeInventoryCode } from './inventory-catalog';

export type PreparationCatalogRow = {
  code: string;
  article: string;
  color: string;
  colorDescription: string;
  size: string;
  sourceCode: string;
};
export type PreparationCatalogItem = { sku: string; size: string };

const normalizedText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();

export function preparationSkuParts(sku: string) {
  const parts = String(sku || '')
    .split('/')
    .map((part) => part.trim());
  return {
    article: normalizedText(parts[1] || parts[0]),
    color: normalizedText(parts[2]),
    size: normalizedText(parts.at(-1)),
  };
}

function rowMatchesItem(
  row: PreparationCatalogRow,
  item: PreparationCatalogItem,
) {
  const sku = preparationSkuParts(item.sku);
  if (!sku.article || normalizedText(row.article) !== sku.article) return false;
  const expectedSize = normalizedText(item.size) || sku.size;
  if (expectedSize && normalizedText(row.size) !== expectedSize) return false;
  if (!sku.color) return true;
  return [row.color, row.colorDescription].some(
    (value) => normalizedText(value) === sku.color,
  );
}

export function barcodesForPreparationItem(
  item: PreparationCatalogItem,
  rows: PreparationCatalogRow[],
) {
  const codes = new Set<string>();
  rows
    .filter((row) => rowMatchesItem(row, item))
    .forEach((row) => {
      [row.code, row.sourceCode].forEach((value) => {
        const code = normalizeInventoryCode(value);
        if (code) codes.add(code);
      });
    });
  return [...codes];
}
