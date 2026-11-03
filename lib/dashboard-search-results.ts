import type { IncidentRecord } from '@/lib/incident-record';
import { foldSearchText } from '@/lib/global-search';

export function incidentsMatchingCustomerQuery(
  rows: IncidentRecord[],
  query: string,
): IncidentRecord[] {
  const normalizedQuery = foldSearchText(query);
  const queryDigits = query.replace(/\D/g, '');

  return rows.filter((row) => {
    const nameMatches = foldSearchText(row.customerName).includes(
      normalizedQuery,
    );
    const phone = row.customerPhone.replace(/\D/g, '');
    const phoneMatches =
      queryDigits.length >= 5 &&
      Boolean(phone) &&
      (phone.includes(queryDigits) || queryDigits.includes(phone));
    return nameMatches || phoneMatches;
  });
}

export function hasConnectedSearchResults(
  ...resultGroups: ReadonlyArray<readonly unknown[]>
): boolean {
  return resultGroups.some((group) => group.length > 0);
}

export function emptyConnectedSearchMessage(searchTerm: string): string {
  return `No se encontraron pedidos, reservas, prendas ni incidencias para “${searchTerm}”.`;
}
