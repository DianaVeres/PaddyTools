import type { IncidentRecord } from '@/lib/incident-record';
import {
  foldSearchText,
  incidentReferenceCandidates,
  normalizeReferenceInput,
} from '@/lib/global-search';

export function incidentsMatchingCustomerQuery(
  rows: IncidentRecord[],
  query: string,
): IncidentRecord[] {
  const normalizedQuery = foldSearchText(query);
  const queryDigits = query.replace(/\D/g, '');
  const referenceCandidates = incidentReferenceCandidates(query).map(
    normalizeReferenceInput,
  );

  return rows.filter((row) => {
    const storedReferences = [row.orderNumber, row.ticketNumber]
      .filter(Boolean)
      .map((value) => normalizeReferenceInput(String(value)));
    const referenceMatches = storedReferences.some((reference) =>
      referenceCandidates.includes(reference),
    );
    const nameMatches = foldSearchText(row.customerName).includes(
      normalizedQuery,
    );
    const phone = row.customerPhone.replace(/\D/g, '');
    const phoneMatches =
      queryDigits.length >= 5 &&
      Boolean(phone) &&
      (phone.includes(queryDigits) || queryDigits.includes(phone));
    return referenceMatches || nameMatches || phoneMatches;
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
