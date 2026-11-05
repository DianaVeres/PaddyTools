import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import {
  incidentFieldsFor,
  incidentTextValue,
  mapStoredIncident,
  nextAutomaticIncidentId,
  readAllIncidentRows,
} from '@/lib/incident-store';
import {
  incidentResolutionFromRecord,
  resolvedIncidentState,
} from '@/lib/incident-resolution';

export class IncidentValidationError extends Error {}

export async function allocateAutomaticIncidentId() {
  return nextAutomaticIncidentId(await readAllIncidentRows());
}

export async function saveIncident(incoming: Record<string, unknown>) {
  const rows = await readAllIncidentRows();
  let originalReference = incidentTextValue(incoming.order_number)
    .trim()
    .toUpperCase();
  if (!originalReference && Boolean(incoming.auto_generate_id))
    originalReference = await nextAutomaticIncidentId(rows);
  if (!originalReference)
    throw new IncidentValidationError('Falta el número de pedido.');

  const record: Record<string, unknown> = {
    ...incoming,
    order_number: /^I/.test(originalReference)
      ? originalReference
      : `I${originalReference}`,
  };
  if (!incidentTextValue(record.incident_school_name).trim())
    throw new IncidentValidationError(
      'Selecciona el colegio de la incidencia.',
    );
  if (!incidentTextValue(record.incident_text).trim())
    throw new IncidentValidationError(
      'Describe la incidencia antes de guardar.',
    );

  const requestedId = incidentTextValue(incoming.record_id).trim();
  const previous = requestedId
    ? rows.find((row) => row.id === requestedId)
    : undefined;
  const now = new Date().toISOString();
  const saved: Record<string, unknown> = {
    ...previous?.data,
    ...record,
    source_type:
      incidentTextValue(record.source_type) ||
      incidentTextValue(previous?.data.source_type) ||
      'order',
    products_json:
      typeof record.products_json === 'string'
        ? record.products_json
        : JSON.stringify(record.products_json || []),
    created_at: incidentTextValue(previous?.data.created_at) || now,
    updated_at: now,
    recurrence_count:
      Number(previous?.data.recurrence_count || 0) +
      (Boolean(record.is_recurrence) ? 1 : 0),
  };
  const solved = resolvedIncidentState(
    incidentResolutionFromRecord(saved),
    Boolean(Number(saved.solved)),
  );
  saved.solved = solved ? 1 : 0;
  saved.solved_at = solved
    ? incidentTextValue(previous?.data.solved_at) || now
    : '';
  const id = previous?.id || `INC-${crypto.randomUUID()}`;
  if (previous)
    await getDb()
      .update(incidentRecords)
      .set(incidentFieldsFor(id, saved))
      .where(eq(incidentRecords.id, id));
  else
    await getDb().insert(incidentRecords).values(incidentFieldsFor(id, saved));
  return {
    ok: true,
    id,
    row: { ...saved, record_id: id },
    incident: mapStoredIncident({ id, data: saved }),
  };
}
