import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import { incidentReferenceCandidates } from '@/lib/global-search';
import {
  incidentFieldsFor,
  incidentTextValue,
  mapStoredIncident,
  readAllIncidentRows,
  type StoredIncident,
} from '@/lib/incident-store';
import {
  incidentResolutionFromRecord,
  resolvedIncidentState,
} from '@/lib/incident-resolution';

export type IncidentSelector = { id?: string; orderNumber?: string };
export type IncidentStatusChanges = IncidentSelector & {
  received?: boolean;
  solved?: boolean;
  sent?: boolean;
};

export function findStoredIncident(
  rows: StoredIncident[],
  selector: IncidentSelector,
) {
  const references = incidentReferenceCandidates(
    selector.orderNumber || '',
  ).map((value) => value.toUpperCase());
  return rows.find((row) =>
    selector.id
      ? row.id === selector.id
      : references.includes(
          incidentTextValue(row.data.order_number).toUpperCase(),
        ),
  );
}

export async function updateIncidentStatus(changes: IncidentStatusChanges) {
  const stored = findStoredIncident(await readAllIncidentRows(), changes);
  if (!stored) return null;
  const now = new Date().toISOString();
  const requested = {
    ...stored.data,
    ...(typeof changes.received === 'boolean'
      ? {
          pickup_received: changes.received ? 1 : 0,
          pickup_received_at: changes.received ? now : '',
        }
      : {}),
    ...(typeof changes.solved === 'boolean'
      ? {
          solved: changes.solved ? 1 : 0,
          solved_at: changes.solved ? now : '',
        }
      : {}),
    ...(typeof changes.sent === 'boolean'
      ? { sent: changes.sent ? 1 : 0 }
      : {}),
    updated_at: now,
  };
  const solved = resolvedIncidentState(
    incidentResolutionFromRecord(requested),
    Boolean(Number(requested.solved)),
  );
  const data = {
    ...requested,
    solved: solved ? 1 : 0,
    solved_at: solved ? incidentTextValue(stored.data.solved_at) || now : '',
  };
  await getDb()
    .update(incidentRecords)
    .set(incidentFieldsFor(stored.id, data))
    .where(eq(incidentRecords.id, stored.id));
  return mapStoredIncident({ id: stored.id, data }, changes.orderNumber);
}

export async function deleteStoredIncident(selector: IncidentSelector) {
  const stored = findStoredIncident(await readAllIncidentRows(), selector);
  if (!stored) return null;
  await getDb()
    .delete(incidentRecords)
    .where(eq(incidentRecords.id, stored.id));
  try {
    const images = JSON.parse(
      incidentTextValue(stored.data.images_json) || '[]',
    ) as Array<{ key?: string }>;
    for (const image of images) {
      if (!image.key) continue;
      await env.DB.prepare(
        'DELETE FROM incident_image_chunks WHERE image_id = ?',
      )
        .bind(image.key)
        .run();
      await env.DB.prepare('DELETE FROM incident_images WHERE id = ?')
        .bind(image.key)
        .run();
    }
  } catch {
    // La incidencia ya se ha eliminado; una imagen antigua no debe bloquearlo.
  }
  return {
    deleted: true,
    id: stored.id,
    orderNumber: incidentTextValue(stored.data.order_number),
  };
}
