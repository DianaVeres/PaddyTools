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
import type { AuthUser } from '@/lib/auth';
import { appendIncidentAudit } from '@/lib/incident-audit';

export class IncidentValidationError extends Error {}
export class IncidentPermissionError extends Error {}

export async function allocateAutomaticIncidentId() {
  return nextAutomaticIncidentId(await readAllIncidentRows());
}

export async function saveIncident(
  incoming: Record<string, unknown>,
  options: { allowManual?: boolean; actor?: AuthUser | null } = {},
) {
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
    audit_log_json: appendIncidentAudit(
      previous?.data.audit_log_json,
      previous ? 'Incidencia modificada' : 'Incidencia creada',
      options.actor || null,
      now,
    ),
  };
  if (
    incidentTextValue(saved.source_type).toLowerCase() === 'manual' &&
    !options.allowManual
  )
    throw new IncidentPermissionError(
      'Solo Rocío o Administración pueden crear Incidencias nuestras.',
    );
  const solved = resolvedIncidentState(
    incidentResolutionFromRecord(saved),
    Boolean(Number(saved.solved)),
  );
  saved.solved = solved ? 1 : 0;
  saved.solved_at = solved
    ? incidentTextValue(previous?.data.solved_at) || now
    : '';
  const statusChanges = [
    {
      field: 'pickup_received',
      enabled: 'Recogida marcada como recibida',
      disabled: 'Recogida devuelta a pendiente',
    },
    {
      field: 'sent',
      enabled: 'Envío marcado como enviado',
      disabled: 'Envío devuelto a pendiente',
    },
    {
      field: 'solved',
      enabled: 'Incidencia marcada como solucionada',
      disabled: 'Incidencia reabierta',
    },
  ] as const;
  for (const change of statusChanges) {
    const before = Boolean(Number(previous?.data[change.field]));
    const after = Boolean(Number(saved[change.field]));
    if (before === after) continue;
    saved.audit_log_json = appendIncidentAudit(
      saved.audit_log_json,
      after ? change.enabled : change.disabled,
      options.actor || null,
      now,
    );
  }
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
