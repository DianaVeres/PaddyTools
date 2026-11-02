import { incidentReferenceCandidates } from '@/lib/global-search';
import {
  incidentTextValue,
  mapStoredIncident,
  readAllIncidentRows,
} from '@/lib/incident-store';

export async function listIncidents(scope: 'all' | 'pickups') {
  const rows = await readAllIncidentRows();
  const selected =
    scope === 'pickups'
      ? rows.filter((row) => Boolean(Number(row.data.pickup_school)))
      : rows;
  return selected.map((row) => mapStoredIncident(row));
}

export async function findIncidents(id: string, number: string) {
  const rows = await readAllIncidentRows();
  const candidates = incidentReferenceCandidates(number).map((value) =>
    value.toUpperCase(),
  );
  const matches = id
    ? rows.filter((row) => row.id === id)
    : rows.filter((row) =>
        candidates.includes(
          incidentTextValue(row.data.order_number).toUpperCase(),
        ),
      );
  if (!matches.length)
    return { found: false, incident: null, incidents: [] };
  return {
    found: true,
    incident: mapStoredIncident(matches[0], number),
    incidents: matches.map((row) => mapStoredIncident(row, number)),
  };
}
