import {
  allMondayBoardItems,
  mondayRequest,
  type MondayItem,
} from '@/lib/monday-client';
import { MONDAY_BOARDS } from '@/lib/monday-config';
import { normalizeMondayItem } from '@/lib/monday-mapping';
import { loadMondayCustomerContacts } from '@/lib/monday-read';
import { searchKey } from '@/lib/global-search';

type ArticleDetail = { code: string; description: string };

export async function loadMondayArticleDetails(
  articleIds: string[],
  token: string,
) {
  const details = new Map<string, ArticleDetail>();
  for (let start = 0; start < articleIds.length; start += 100) {
    const data = (await mondayRequest(
      `query ($ids:[ID!]!){items(ids:$ids){id name column_values{id text column{title}}}}`,
      { ids: articleIds.slice(start, start + 100) },
      token,
    )) as { items?: MondayItem[] };
    for (const item of data.items || []) {
      const values: Record<string, string> = {};
      for (const value of item.column_values || [])
        values[searchKey(value.column?.title || value.id)] = String(
          value.text || '',
        ).trim();
      details.set(item.id, {
        code: item.name,
        description:
          values['DESCRIPCION ARTICULO'] || values['DESCRIPCION'] || '',
      });
    }
  }
  return details;
}

export async function enrichMondayReservations(
  records: ReturnType<typeof normalizeMondayItem>[],
  token: string,
) {
  const articleIds = [
    ...new Set(records.flatMap((record) => record.articleIds)),
  ];
  const [articleDetails, contactsByCustomer] = await Promise.all([
    loadMondayArticleDetails(articleIds, token),
    loadMondayCustomerContacts(records, token),
  ]);
  return records.map((record) => {
    const detail = record.articleIds
      .map((id) => articleDetails.get(id))
      .find(Boolean);
    return {
      ...record,
      phone:
        record.phone ||
        record.customerIds
          .map((id) => contactsByCustomer.get(id)?.phone)
          .find(Boolean) ||
        '',
      customerEmail:
        record.customerIds
          .map((id) => contactsByCustomer.get(id)?.email)
          .find(Boolean) ||
        '',
      code: record.code || detail?.code || '',
      articleDescription: detail?.description || record.article || '',
    };
  });
}

export async function loadAllMondayReservations(token: string) {
  const board = MONDAY_BOARDS[0];
  const records = (await allMondayBoardItems(board.id, token)).map((item) =>
    normalizeMondayItem(item, board),
  );
  return (await enrichMondayReservations(records, token)).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
