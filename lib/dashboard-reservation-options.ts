import type {
  DashboardMondayRecord,
  ReservationOptions,
} from '@/lib/dashboard-types';
import { foldSearchText } from '@/lib/global-search';

const IGNORED_SCHOOL_WORDS = new Set([
  'colegio',
  'colegios',
  'escuela',
  'centro',
  'ceip',
  'ies',
  'san',
  'santa',
  'del',
  'las',
  'los',
]);

export function mondayReservationUpdateItemIds(
  records: DashboardMondayRecord[],
): string {
  return [
    ...new Set(
      records
        .filter((record) => record.kind === 'reserva')
        .map((record) => record.id)
        .filter(Boolean),
    ),
  ]
    .sort()
    .join(',');
}

export function reservationArticlesForSchool(
  articles: ReservationOptions['articles'],
  schoolName: string,
): ReservationOptions['articles'] {
  const school = foldSearchText(schoolName);
  if (!school) return [];

  const schoolWords = schoolName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) => word.length >= 4 && !IGNORED_SCHOOL_WORDS.has(word),
    );
  const matches = articles.filter((item) => {
    const article = foldSearchText(`${item.code} ${item.description}`);
    return (
      article.includes(school) ||
      schoolWords.some((word) => article.includes(foldSearchText(word)))
    );
  });

  // Algunas descripciones antiguas no incluyen el colegio. En ese caso se
  // conserva el catálogo completo para no impedir crear la reserva.
  return matches.length ? matches : articles;
}
