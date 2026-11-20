import { inventoryCodeCandidates } from './inventory-catalog';

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

const normalizedSize = (value: unknown) =>
  normalizedText(value).replace(/^(?:TALLA|T)(?=\d)/, '');

function compatibleText(left: unknown, right: unknown) {
  const a = normalizedText(left);
  const b = normalizedText(right);
  if (!a || !b) return false;
  return (
    a === b ||
    (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)))
  );
}

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

function rowMatchesArticleAndSize(
  row: PreparationCatalogRow,
  item: PreparationCatalogItem,
) {
  const sku = preparationSkuParts(item.sku);
  if (!sku.article || normalizedText(row.article) !== sku.article) return false;
  const expectedSize = normalizedSize(item.size) || normalizedSize(sku.size);
  return !expectedSize || normalizedSize(row.size) === expectedSize;
}

export function barcodesForPreparationItem(
  item: PreparationCatalogItem,
  rows: PreparationCatalogRow[],
) {
  const sku = preparationSkuParts(item.sku);
  const articleRows = rows.filter((row) => rowMatchesArticleAndSize(row, item));
  const exactColorRows = articleRows.filter((row) =>
    [row.color, row.colorDescription].some(
      (value) => normalizedText(value) === sku.color,
    ),
  );
  const matchingRows =
    !sku.color || exactColorRows.length
      ? sku.color
        ? exactColorRows
        : articleRows
      : articleRows.filter((row) =>
          [row.color, row.colorDescription].some((value) =>
            compatibleText(value, sku.color),
          ),
        );
  const codes = new Set<string>();
  matchingRows.forEach((row) => {
    [row.code, row.sourceCode].forEach((value) => {
      inventoryCodeCandidates(value).forEach((code) => codes.add(code));
    });
  });
  return [...codes];
}

export function barcodeMatchesPreparationItem(
  barcodes: string[],
  scanned: unknown,
) {
  const allowed = new Set(
    barcodes.flatMap((code) => inventoryCodeCandidates(code)),
  );
  return inventoryCodeCandidates(scanned).some((candidate) =>
    allowed.has(candidate),
  );
}
