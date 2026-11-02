import { allMondayBoardItems } from '@/lib/monday-client';
import { MONDAY_RESERVATION_OPTIONS } from '@/lib/monday-config';
import {
  mondayColumnEmail,
  mondayColumnPhone,
} from '@/lib/monday-mapping';
import { searchKey } from '@/lib/global-search';

const CUSTOMER_BOARD_ID = '5098189262';
const ARTICLE_BOARD_ID = '5098177612';

export async function loadMondayReservationOptions(token: string) {
  const [customerItems, articleItems] = await Promise.all([
    allMondayBoardItems(CUSTOMER_BOARD_ID, token),
    allMondayBoardItems(ARTICLE_BOARD_ID, token),
  ]);
  const customers = customerItems
    .map((item) => {
      const phoneColumn = (item.column_values || []).find((value) =>
        /TELEFONO|MOVIL|MOBILE|PHONE/.test(
          searchKey(value.column?.title || value.id),
        ),
      );
      const emailColumn = (item.column_values || []).find((value) =>
        /EMAIL|E MAIL|CORREO|MAIL/.test(
          searchKey(value.column?.title || value.id),
        ),
      );
      const schoolColumn = (item.column_values || []).find((value) =>
        /COLEGIO|CENTRO|ESCUELA|SCHOOL/.test(
          searchKey(value.column?.title || value.id),
        ),
      );
      const rawSchool = String(
        schoolColumn?.text || schoolColumn?.display_value || '',
      ).trim();
      const school =
        MONDAY_RESERVATION_OPTIONS.schools.find(
          (option) => searchKey(option) === searchKey(rawSchool),
        ) || rawSchool;
      return {
        id: item.id,
        name: item.name,
        phone: mondayColumnPhone(phoneColumn),
        email: mondayColumnEmail(emailColumn),
        school,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const articles = articleItems
    .map((item) => {
      const values: Record<string, string> = {};
      for (const value of item.column_values || [])
        values[searchKey(value.column?.title || value.id)] = String(
          value.text || '',
        );
      return {
        id: item.id,
        code: item.name,
        description:
          values['DESCRIPCION ARTICULO'] || values['DESCRIPCION'] || '',
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'es'));
  return { ...MONDAY_RESERVATION_OPTIONS, customers, articles };
}
