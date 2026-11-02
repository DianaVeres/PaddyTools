import { allMondayBoardItems } from '@/lib/monday-client';
import { MONDAY_BOARDS } from '@/lib/monday-config';
import { normalizeMondayItem } from '@/lib/monday-mapping';
import { loadMondayCustomerContacts } from '@/lib/monday-read';
import { searchDigits, searchKey } from '@/lib/global-search';

export async function searchMondayRecords(searchText: string, token: string) {
  const rawRecords = (
    await Promise.all(
      MONDAY_BOARDS.map(async (board) =>
        (await allMondayBoardItems(board.id, token)).map((item) =>
          normalizeMondayItem(item, board),
        ),
      ),
    )
  ).flat();
  const contactsByCustomer = await loadMondayCustomerContacts(
    rawRecords,
    token,
  );
  const needle = searchKey(searchText);
  const phoneNeedle = searchDigits(searchText);
  return rawRecords
    .map((record) => ({
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
    }))
    .filter((record) => {
      const nameMatches = searchKey(record.customer).includes(needle);
      const recordPhone = searchDigits(record.phone);
      const phoneMatches =
        phoneNeedle.length >= 5 &&
        Boolean(recordPhone) &&
        (recordPhone.includes(phoneNeedle) || phoneNeedle.includes(recordPhone));
      return nameMatches || phoneMatches;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
