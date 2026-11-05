import { desc } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import type { IncidentImage } from '@/lib/incident-record';

export const incidentTextValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export type StoredIncident = { id: string; data: Record<string, unknown> };

export function decodeIncidentRow(
  row: typeof incidentRecords.$inferSelect,
): StoredIncident {
  try {
    return {
      id: row.id,
      data: JSON.parse(row.rawJson) as Record<string, unknown>,
    };
  } catch {
    return { id: row.id, data: {} };
  }
}

export async function readAllIncidentRows() {
  return (
    await getDb()
      .select()
      .from(incidentRecords)
      .orderBy(desc(incidentRecords.updatedAt))
  ).map(decodeIncidentRow);
}

export function mapStoredIncident(stored: StoredIncident, fallback = '') {
  const row = stored.data;
  let products: unknown[] = [];
  let images: IncidentImage[] = [];
  try {
    products = JSON.parse(incidentTextValue(row.products_json) || '[]');
  } catch {
    products = [];
  }
  try {
    const parsed = JSON.parse(incidentTextValue(row.images_json) || '[]');
    images = Array.isArray(parsed) ? parsed : [];
  } catch {
    images = [];
  }
  const storedText = incidentTextValue(row.incident_text);
  const observationMatch = storedText.match(/\n\nOBSERVACIONES:\s*([\s\S]*)$/i);
  const storedSource = incidentTextValue(row.source_type).toLowerCase();
  const explicitSource =
    storedSource === 'store' || storedSource === 'tienda'
      ? 'tienda'
      : storedSource === 'manual'
        ? 'manual'
        : ['order', 'pedido', 'reservation', 'reserva'].includes(storedSource)
          ? 'order'
          : '';
  const sourceType =
    explicitSource ||
    (incidentTextValue(row.ticket_number) ||
    incidentTextValue(row.amount) ||
    incidentTextValue(row.ticket_file_id)
      ? 'tienda'
      : storedSource || 'order');
  return {
    id: stored.id,
    orderNumber: incidentTextValue(row.order_number) || fallback,
    sourceType,
    ticketNumber:
      incidentTextValue(row.ticket_number) ||
      incidentTextValue(row.order_number) ||
      fallback,
    customerName: incidentTextValue(row.customer_name),
    customerEmail: incidentTextValue(row.customer_email),
    customerPhone: incidentTextValue(row.customer_phone),
    incidentText: observationMatch
      ? storedText.slice(0, observationMatch.index).trim()
      : storedText,
    observations: observationMatch?.[1]?.trim() || '',
    incidentDate:
      incidentTextValue(row.incident_date) || incidentTextValue(row.created_at),
    solved: Boolean(Number(row.solved)),
    shippingRequired: Boolean(Number(row.shipping_required)),
    sent: Boolean(Number(row.sent)),
    solvedAt: incidentTextValue(row.solved_at),
    updatedAt: incidentTextValue(row.updated_at),
    pickupSchool: Boolean(Number(row.pickup_school)),
    pickupSchoolName: incidentTextValue(row.pickup_school_name),
    pickupDetails: incidentTextValue(row.pickup_details),
    pickupReceived: Boolean(Number(row.pickup_received)),
    pickupReceivedAt: incidentTextValue(row.pickup_received_at),
    school: incidentTextValue(row.incident_school_name),
    amount: incidentTextValue(row.amount) || incidentTextValue(row.order_total),
    shippingAddress: incidentTextValue(row.shipping_address),
    ticketFileId: incidentTextValue(row.ticket_file_id),
    isRecurrence: Boolean(Number(row.is_recurrence)),
    recurrenceCount: Number(row.recurrence_count || 0),
    products,
    images,
  };
}

export function incidentFieldsFor(id: string, data: Record<string, unknown>) {
  return {
    id,
    orderNumber: incidentTextValue(data.order_number).trim().toUpperCase(),
    sourceType: incidentTextValue(data.source_type) || 'order',
    incidentDate:
      incidentTextValue(data.incident_date) ||
      incidentTextValue(data.created_at),
    updatedAt: incidentTextValue(data.updated_at) || new Date().toISOString(),
    pickupSchool: Boolean(Number(data.pickup_school)),
    rawJson: JSON.stringify(data),
  };
}

export async function nextAutomaticIncidentId(rows: StoredIncident[]) {
  const highestExisting = rows.reduce((highest, row) => {
    const match = incidentTextValue(row.data.order_number)
      .trim()
      .toUpperCase()
      .match(/^I?INC-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS incident_sequences (name TEXT PRIMARY KEY, value INTEGER NOT NULL)',
  ).run();
  await env.DB.prepare(
    'INSERT INTO incident_sequences(name, value) VALUES(?, ?) ON CONFLICT(name) DO NOTHING',
  )
    .bind('incidents', highestExisting)
    .run();
  const result = await env.DB.prepare(
    'UPDATE incident_sequences SET value = MAX(value, ?) + 1 WHERE name = ? RETURNING value',
  )
    .bind(highestExisting, 'incidents')
    .first<{ value: number }>();
  if (!result?.value)
    throw new Error('No se pudo generar el número automático.');
  return `INC-${String(result.value).padStart(6, '0')}`;
}
