import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { canDeleteIncidents } from '@/lib/permissions';
import {
  incidentReferenceCandidates,
  normalizeReferenceInput,
} from '@/lib/global-search';

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

type StoredIncident = { id: string; data: Record<string, unknown> };

function decodeRow(row: typeof incidentRecords.$inferSelect): StoredIncident {
  try {
    return {
      id: row.id,
      data: JSON.parse(row.rawJson) as Record<string, unknown>,
    };
  } catch {
    return { id: row.id, data: {} };
  }
}

async function readAllRows() {
  return (
    await getDb()
      .select()
      .from(incidentRecords)
      .orderBy(desc(incidentRecords.updatedAt))
  ).map(decodeRow);
}

function mapIncident(stored: StoredIncident, fallback = '') {
  const row = stored.data;
  let products: unknown[] = [];
  try {
    products = JSON.parse(textValue(row.products_json) || '[]');
  } catch {
    products = [];
  }
  const storedText = textValue(row.incident_text);
  const observationMatch = storedText.match(/\n\nOBSERVACIONES:\s*([\s\S]*)$/i);
  const storedSource = textValue(row.source_type).toLowerCase();
  const sourceType =
    storedSource === 'store' || storedSource === 'tienda'
      ? 'tienda'
      : storedSource === 'manual'
        ? 'manual'
        : textValue(row.ticket_number) ||
            textValue(row.amount) ||
            textValue(row.ticket_file_id)
          ? 'tienda'
          : storedSource || 'order';
  return {
    id: stored.id,
    orderNumber: textValue(row.order_number) || fallback,
    sourceType,
    ticketNumber:
      textValue(row.ticket_number) || textValue(row.order_number) || fallback,
    customerName: textValue(row.customer_name),
    customerEmail: textValue(row.customer_email),
    customerPhone: textValue(row.customer_phone),
    incidentText: observationMatch
      ? storedText.slice(0, observationMatch.index).trim()
      : storedText,
    observations: observationMatch?.[1]?.trim() || '',
    incidentDate: textValue(row.incident_date) || textValue(row.created_at),
    solved: Boolean(Number(row.solved)),
    sent: Boolean(Number(row.sent)),
    solvedAt: textValue(row.solved_at),
    updatedAt: textValue(row.updated_at),
    pickupSchool: Boolean(Number(row.pickup_school)),
    pickupSchoolName: textValue(row.pickup_school_name),
    pickupDetails: textValue(row.pickup_details),
    pickupReceived: Boolean(Number(row.pickup_received)),
    pickupReceivedAt: textValue(row.pickup_received_at),
    school: textValue(row.incident_school_name),
    amount: textValue(row.amount) || textValue(row.order_total),
    shippingAddress: textValue(row.shipping_address),
    ticketFileId: textValue(row.ticket_file_id),
    isRecurrence: Boolean(Number(row.is_recurrence)),
    recurrenceCount: Number(row.recurrence_count || 0),
    products,
  };
}

function fieldsFor(id: string, data: Record<string, unknown>) {
  return {
    id,
    orderNumber: textValue(data.order_number).trim().toUpperCase(),
    sourceType: textValue(data.source_type) || 'order',
    incidentDate: textValue(data.incident_date) || textValue(data.created_at),
    updatedAt: textValue(data.updated_at) || new Date().toISOString(),
    pickupSchool: Boolean(Number(data.pickup_school)),
    rawJson: JSON.stringify(data),
  };
}

async function nextAutomaticIncidentId(rows: StoredIncident[]) {
  const highestExisting = rows.reduce((highest, row) => {
    const match = textValue(row.data.order_number)
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

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope');
  const id = request.nextUrl.searchParams.get('id')?.trim();
  const number = normalizeReferenceInput(
    request.nextUrl.searchParams.get('number') || '',
  );
  if (!id && !number && scope !== 'all' && scope !== 'pickups')
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  try {
    const rows = await readAllRows();
    if (scope === 'all' || scope === 'pickups') {
      const selected =
        scope === 'pickups'
          ? rows.filter((row) => Boolean(Number(row.data.pickup_school)))
          : rows;
      return NextResponse.json({
        rows: selected.map((row) => mapIncident(row)),
      });
    }
    const matches = id
      ? rows.filter((row) => row.id === id)
      : rows.filter((row) =>
          incidentReferenceCandidates(number || '').includes(
            textValue(row.data.order_number).toUpperCase(),
          ),
        );
    if (!matches.length)
      return NextResponse.json({ found: false, incident: null, incidents: [] });
    return NextResponse.json({
      found: true,
      incident: mapIncident(matches[0], number),
      incidents: matches.map((row) => mapIncident(row, number)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo consultar incidencias en Cloudflare: ${error.message}`
            : 'No se pudo consultar incidencias.',
      },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      orderNumber?: string;
      received?: boolean;
      solved?: boolean;
      sent?: boolean;
    };
    if (!body.id && !body.orderNumber)
      return NextResponse.json(
        { error: 'Falta la incidencia.' },
        { status: 400 },
      );
    if (
      typeof body.received !== 'boolean' &&
      typeof body.solved !== 'boolean' &&
      typeof body.sent !== 'boolean'
    )
      return NextResponse.json(
        { error: 'No se ha indicado ningún cambio.' },
        { status: 400 },
      );
    const rows = await readAllRows();
    const references = incidentReferenceCandidates(body.orderNumber || '').map((value) =>
      value.toUpperCase(),
    );
    const stored = rows.find((row) =>
      body.id
        ? row.id === body.id
        : references.includes(textValue(row.data.order_number).toUpperCase()),
    );
    if (!stored)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para actualizarla.' },
        { status: 404 },
      );
    const now = new Date().toISOString();
    const data = {
      ...stored.data,
      ...(typeof body.received === 'boolean'
        ? {
            pickup_received: body.received ? 1 : 0,
            pickup_received_at: body.received ? now : '',
          }
        : {}),
      ...(typeof body.solved === 'boolean'
        ? { solved: body.solved ? 1 : 0, solved_at: body.solved ? now : '' }
        : {}),
      ...(typeof body.sent === 'boolean' ? { sent: body.sent ? 1 : 0 } : {}),
      updated_at: now,
    };
    await getDb()
      .update(incidentRecords)
      .set(fieldsFor(stored.id, data))
      .where(eq(incidentRecords.id, stored.id));
    return NextResponse.json({
      ok: true,
      incident: mapIncident({ id: stored.id, data }, body.orderNumber),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo actualizar la incidencia: ${error.message}`
            : 'No se pudo actualizar la incidencia.',
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = (await request.json()) as Record<string, unknown>;
    const rows = await readAllRows();
    if (Boolean(incoming.allocate_id_only))
      return NextResponse.json({
        generatedId: await nextAutomaticIncidentId(rows),
      });
    let originalReference = textValue(incoming.order_number)
      .trim()
      .toUpperCase();
    if (!originalReference && Boolean(incoming.auto_generate_id))
      originalReference = await nextAutomaticIncidentId(rows);
    if (!originalReference)
      return NextResponse.json(
        { error: 'Falta el número de pedido.' },
        { status: 400 },
      );
    const record: Record<string, unknown> = {
      ...incoming,
      order_number: /^I/.test(originalReference)
        ? originalReference
        : `I${originalReference}`,
    };
    if (!textValue(record.incident_school_name).trim())
      return NextResponse.json(
        { error: 'Selecciona el colegio de la incidencia.' },
        { status: 400 },
      );
    if (!textValue(record.incident_text).trim())
      return NextResponse.json(
        { error: 'Describe la incidencia antes de guardar.' },
        { status: 400 },
      );
    const requestedId = textValue(incoming.record_id).trim();
    const previous = requestedId
      ? rows.find((row) => row.id === requestedId)
      : undefined;
    const now = new Date().toISOString();
    const saved: Record<string, unknown> = {
      ...previous?.data,
      ...record,
      source_type:
        textValue(record.source_type) ||
        textValue(previous?.data.source_type) ||
        'order',
      products_json:
        typeof record.products_json === 'string'
          ? record.products_json
          : JSON.stringify(record.products_json || []),
      created_at: textValue(previous?.data.created_at) || now,
      updated_at: now,
      recurrence_count:
        Number(previous?.data.recurrence_count || 0) +
        (Boolean(record.is_recurrence) ? 1 : 0),
    };
    const id = previous?.id || `INC-${crypto.randomUUID()}`;
    if (previous)
      await getDb()
        .update(incidentRecords)
        .set(fieldsFor(id, saved))
        .where(eq(incidentRecords.id, id));
    else await getDb().insert(incidentRecords).values(fieldsFor(id, saved));
    return NextResponse.json({
      ok: true,
      id,
      row: { ...saved, record_id: id },
      incident: mapIncident({ id, data: saved }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo guardar la incidencia: ${error.message}`
            : 'No se pudo guardar la incidencia.',
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  if (!canDeleteIncidents(user))
    return NextResponse.json(
      { error: 'Tu usuario no tiene permiso para eliminar incidencias.' },
      { status: 403 },
    );
  try {
    const body = (await request.json()) as {
      id?: string;
      orderNumber?: string;
    };
    const rows = await readAllRows();
    const references = incidentReferenceCandidates(body.orderNumber || '').map((value) =>
      value.toUpperCase(),
    );
    const stored = rows.find((row) =>
      body.id
        ? row.id === body.id
        : references.includes(textValue(row.data.order_number).toUpperCase()),
    );
    if (!stored)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para eliminarla.' },
        { status: 404 },
      );
    await getDb()
      .delete(incidentRecords)
      .where(eq(incidentRecords.id, stored.id));
    return NextResponse.json({
      deleted: true,
      id: stored.id,
      orderNumber: textValue(stored.data.order_number),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo eliminar la incidencia: ${error.message}`
            : 'No se pudo eliminar la incidencia.',
      },
      { status: 502 },
    );
  }
}
