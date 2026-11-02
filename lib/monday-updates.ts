import { mondayRequest } from './monday-client.ts';

type MondayUpdateSource = {
  id: string;
  updates?: Array<{
    id: string;
    text_body?: string | null;
    created_at?: string | null;
    creator?: { id?: string; name?: string; email?: string } | null;
  }>;
};

export function normalizeMondayUpdates(items: MondayUpdateSource[]) {
  return items
    .flatMap((item) =>
      (item.updates || []).map((update) => ({
        id: update.id,
        itemId: item.id,
        text: String(update.text_body || '').trim(),
        createdAt: String(update.created_at || ''),
        author: String(
          update.creator?.name || update.creator?.email || 'Monday',
        ),
      })),
    )
    .filter((update) => update.text)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadMondayUpdates(ids: string[], token: string) {
  if (!ids.length) return [];
  const data = (await mondayRequest(
    `query ($ids:[ID!]!){items(ids:$ids){id updates(limit:100){id text_body created_at creator{id name email}}}}`,
    { ids },
    token,
  )) as { items?: MondayUpdateSource[] };
  return normalizeMondayUpdates(data.items || []);
}
