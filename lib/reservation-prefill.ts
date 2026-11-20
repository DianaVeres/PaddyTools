export const reservationPrefillStorageKey = 'paddytools:reservation-prefill';

export type ReservationPrefill = {
  reference: string;
  customerName: string;
  phone: string;
  customerEmail: string;
  school: string;
  articleCode: string;
  size: string;
  units: number;
};

const comparableCode = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();

export function reservationArticleCodeFromSku(sku: string) {
  const parts = String(sku || '').split('/');
  return comparableCode(parts[1] || parts[0]);
}

export function reservationArticleIdForCode(
  articles: Array<{ id: string; code: string }>,
  code: string,
) {
  const expected = comparableCode(code);
  return (
    articles.find((article) => comparableCode(article.code) === expected)?.id ||
    ''
  );
}
