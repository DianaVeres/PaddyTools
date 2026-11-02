export type MondayColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
  display_value?: string | null;
  linked_item_ids?: Array<string | number> | null;
  column?: { title?: string | null };
};

export type MondayItem = {
  id: string;
  name: string;
  updated_at?: string;
  column_values: MondayColumnValue[];
};

const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_VERSION = '2025-04';
const MONDAY_ITEM_FIELDS = `id name updated_at column_values{id text value ... on BoardRelationValue {display_value linked_item_ids} ... on MirrorValue {display_value} ... on FormulaValue {display_value} column{title}}`;

export async function mondayRequest(
  query: string,
  variables: Record<string, unknown>,
  token: string,
) {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      authorization: token,
      'content-type': 'application/json',
      'api-version': MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Monday respondió ${response.status}`);
  const result = (await response.json()) as {
    data?: Record<string, unknown>;
    errors?: Array<{ message?: string }>;
  };
  if (result.errors?.length) {
    throw new Error(
      result.errors
        .map((error) => error.message)
        .filter(Boolean)
        .join(', '),
    );
  }
  return result.data || {};
}

export async function allMondayBoardItems(boardId: string, token: string) {
  const firstPage = (await mondayRequest(
    `query ($board:[ID!]!){boards(ids:$board){items_page(limit:500){cursor items{${MONDAY_ITEM_FIELDS}}}}}`,
    { board: [boardId] },
    token,
  )) as {
    boards?: Array<{
      items_page?: { cursor?: string | null; items?: MondayItem[] };
    }>;
  };
  const items = [...(firstPage.boards?.[0]?.items_page?.items || [])];
  let cursor = firstPage.boards?.[0]?.items_page?.cursor || '';

  while (cursor) {
    const nextPage = (await mondayRequest(
      `query ($cursor:String!){next_items_page(limit:500,cursor:$cursor){cursor items{${MONDAY_ITEM_FIELDS}}}}`,
      { cursor },
      token,
    )) as {
      next_items_page?: { cursor?: string | null; items?: MondayItem[] };
    };
    items.push(...(nextPage.next_items_page?.items || []));
    cursor = nextPage.next_items_page?.cursor || '';
  }

  return items;
}
