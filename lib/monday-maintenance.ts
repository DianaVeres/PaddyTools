import { mondayRequest } from '@/lib/monday-client';
import { MONDAY_BOARDS } from '@/lib/monday-config';
import { searchKey } from '@/lib/global-search';

export const MONDAY_MAINTENANCE_KEY =
  'f8626767-5497-41dd-8d0a-cc43668155d8';

export function isMondayMaintenanceKey(value: string | null) {
  return value === MONDAY_MAINTENANCE_KEY;
}

export async function removeMondayLabelColumn(token: string) {
  const boardId = MONDAY_BOARDS[0].id;
  const schema = (await mondayRequest(
    `query ($id:[ID!]!){boards(ids:$id){columns{id title}}}`,
    { id: [boardId] },
    token,
  )) as {
    boards?: Array<{ columns?: Array<{ id: string; title: string }> }>;
  };
  const column = schema.boards?.[0]?.columns?.find(
    (candidate) => searchKey(candidate.title) === 'ETIQUETA',
  );
  if (!column)
    return {
      removed: false,
      message: 'La columna ETIQUETA ya no existe.',
    };
  await mondayRequest(
    `mutation ($board:ID!,$column:String!){delete_column(board_id:$board,column_id:$column){id}}`,
    { board: boardId, column: column.id },
    token,
  );
  return { removed: true, column: 'ETIQUETA' };
}
