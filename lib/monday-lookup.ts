import {
  allMondayBoardItems,
  mondayRequest,
  type MondayItem,
} from '@/lib/monday-client';
import { MONDAY_BOARDS } from '@/lib/monday-config';
import {
  mondayReservationBaseReference,
  normalizeMondayItem,
} from '@/lib/monday-mapping';
import { mondayReferenceCandidates } from '@/lib/global-search';
import { enrichMondayReservations } from '@/lib/monday-reservations';

const exactReferenceQuery = `query ($board: ID!, $numbers: [String]!) { items_page_by_column_values(board_id:$board, limit:100, columns:[{column_id:"name",column_values:$numbers}]) { items { id name updated_at column_values { id text ... on BoardRelationValue { display_value linked_item_ids } ... on FormulaValue { display_value } column { title } } } } }`;

export async function lookupMondayRecords(number: string, token: string) {
  const numbers = mondayReferenceCandidates(number);
  const exactRecords = (
    await Promise.all(
      MONDAY_BOARDS.map(async (board) => {
        const data = (await mondayRequest(
          exactReferenceQuery,
          { board: board.id, numbers },
          token,
        )) as { items_page_by_column_values?: { items?: MondayItem[] } };
        return (data.items_page_by_column_values?.items || []).map((item) =>
          normalizeMondayItem(item, board),
        );
      }),
    )
  ).flat();

  const requestedReservation = mondayReservationBaseReference(number);
  let relatedRecords: ReturnType<typeof normalizeMondayItem>[] = [];
  if (/^R\d+$/i.test(requestedReservation)) {
    relatedRecords = (
      await Promise.all(
        MONDAY_BOARDS.map(async (board) =>
          (await allMondayBoardItems(board.id, token))
            .filter(
              (item) =>
                mondayReservationBaseReference(item.name) ===
                requestedReservation,
            )
            .map((item) => normalizeMondayItem(item, board)),
        ),
      )
    ).flat();
  }

  const uniqueRecords = [
    ...new Map(
      [...exactRecords, ...relatedRecords].map((record) => [record.id, record]),
    ).values(),
  ];
  return enrichMondayReservations(uniqueRecords, token);
}
