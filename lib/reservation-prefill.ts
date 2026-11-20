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
  observations: 'ENTREGA COLEGIO' | 'RECOGIDA EN TIENDA' | 'ENVÍO A DOMICILIO';
  status: 'PARA PREPARAR';
};

const comparableCode = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();

const codeCandidates = (value: unknown) => {
  const raw = String(value ?? '').trim();
  return [raw, ...raw.split(/[\/|]+/)]
    .map(comparableCode)
    .filter((item, index, items) => item && items.indexOf(item) === index);
};

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
    articles.find((article) => codeCandidates(article.code).includes(expected))
      ?.id || ''
  );
}
import { sameSchool } from './school-matching.ts';

export function reservationSchoolOption(options: string[], school: string) {
  if (!school.trim()) return '';
  const schoolInitials = school
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('');
  return (
    options.find((option) => sameSchool(option, school)) ||
    options.find(
      (option) => comparableCode(option) === comparableCode(schoolInitials),
    ) ||
    options.find(
      (option) =>
        option.localeCompare(school, 'es', { sensitivity: 'base' }) === 0,
    ) ||
    ''
  );
}

export function reservationObservationFromShippingMethod(value: string) {
  const method = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (method.includes('recogida') || method.includes('tienda'))
    return 'RECOGIDA EN TIENDA' as const;
  if (
    method.includes('valencia y comunidad valenciana') ||
    method.includes('peninsula') ||
    method.includes('domicilio')
  )
    return 'ENVÍO A DOMICILIO' as const;
  return 'ENTREGA COLEGIO' as const;
}
