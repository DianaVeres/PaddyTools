import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { incidentCache } from '@/db/schema';
import { getSessionUser, type AuthUser } from '@/lib/auth';
import { env } from 'cloudflare:workers';

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const INCIDENT_DELETE_USERS = new Set(['rociosaez', 'administracion']);

function normalizedUserName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function canDeleteIncidents(user: AuthUser) {
  const emailName = user.email.split('@')[0] || '';
  return [emailName, user.displayName]
    .map(normalizedUserName)
    .some((value) => INCIDENT_DELETE_USERS.has(value));
}

function dedupeIncidentRows(rows: Record<string, unknown>[]) {
  const sorted = [...rows].sort((a, b) =>
    textValue(b.updated_at).localeCompare(textValue(a.updated_at)),
  );
  const seen = new Set<string>();
  return sorted.filter((row) => {
    const key = [
      textValue(row.source_type).trim().toUpperCase(),
      textValue(row.order_number).trim().toUpperCase(),
      textValue(row.customer_name).trim().toUpperCase(),
      textValue(row.incident_date).slice(0, 10),
      textValue(row.incident_text).trim().replace(/\s+/g, ' ').toUpperCase(),
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapIncident(row: Record<string, unknown>, fallback = '') {
  let products: unknown[] = [];
  try {
    products = JSON.parse(textValue(row.products_json) || '[]');
  } catch {
    products = [];
  }
  const storedText = textValue(row.incident_text);
  const observationMatch = storedText.match(/\n\nOBSERVACIONES:\s*([\s\S]*)$/i);
  const storedSource = textValue(row.source_type).toLowerCase();
  const sourceType = storedSource === 'store' || storedSource === 'tienda'
    ? 'tienda'
    : storedSource === 'manual'
      ? 'manual'
      : textValue(row.ticket_number) || textValue(row.amount) || textValue(row.ticket_file_id)
        ? 'tienda'
        : storedSource || 'order';
  return {
    orderNumber: textValue(row.order_number) || fallback,
    sourceType,
    ticketNumber: textValue(row.ticket_number) || textValue(row.order_number) || fallback,
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

function incidentReferences(number: string) {
  const normalized = number.trim().replace(/^#/, '').toUpperCase();
  const withoutIncidentPrefix = normalized.replace(/^I(?=(?:R|PA|INT-|\d))/, '');

  // Las incidencias se almacenan con una I delante de la referencia original.
  // Por eso una reserva R12345 debe encontrar también IR12345, igual que un
  // pedido PA12345 debe encontrar IPA12345.
  return [...new Set([
    normalized,
    withoutIncidentPrefix,
    `I${withoutIncidentPrefix}`,
  ])];
}

async function readCachedRows(scope: 'all' | 'pickups') {
  try {
    const [cached] = await getDb()
      .select()
      .from(incidentCache)
      .where(eq(incidentCache.scope, scope))
      .limit(1);
    if (!cached) return null;
    const rows = JSON.parse(cached.payload) as Record<string, unknown>[];
    return { rows: Array.isArray(rows) ? rows : [], updatedAt: cached.updatedAt };
  } catch {
    return null;
  }
}

async function saveCachedRows(scope: 'all' | 'pickups', rows: Record<string, unknown>[]) {
  await getDb()
    .insert(incidentCache)
    .values({ scope, payload: JSON.stringify(rows), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: incidentCache.scope,
      set: { payload: JSON.stringify(rows), updatedAt: new Date() },
    });
}

async function readAllRows() {
  return dedupeIncidentRows((await readCachedRows('all'))?.rows || []);
}

async function persistAllRows(rows: Record<string, unknown>[]) {
  const deduped = dedupeIncidentRows(rows);
  await Promise.all([
    saveCachedRows('all', deduped),
    saveCachedRows(
      'pickups',
      deduped.filter((row) => Boolean(Number(row.pickup_school))),
    ),
  ]);
  return deduped;
}

async function nextAutomaticIncidentId(rows: Record<string, unknown>[]) {
  // El incremento se realiza en D1 para que dos altas simultáneas nunca
  // reciban el mismo identificador.
  const highestExisting = rows.reduce((highest, row) => {
    const match = textValue(row.order_number).trim().toUpperCase().match(/^INC-(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS incident_sequences (name TEXT PRIMARY KEY, value INTEGER NOT NULL)',
  ).run();
  await env.DB.prepare(
    'INSERT INTO incident_sequences(name, value) VALUES(?, ?) ON CONFLICT(name) DO NOTHING',
  ).bind('incidents', highestExisting).run();
  const result = await env.DB.prepare(
    'UPDATE incident_sequences SET value = MAX(value, ?) + 1 WHERE name = ? RETURNING value',
  ).bind(highestExisting, 'incidents').first<{ value: number }>();
  if (!result?.value) throw new Error('No se pudo generar el número automático.');
  return `INC-${String(result.value).padStart(6, '0')}`;
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope');
  const number = request.nextUrl.searchParams
    .get('number')
    ?.trim()
    .replace(/^#/, '');
  if (!number && scope !== 'all' && scope !== 'pickups')
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  try {
    const allRows = await readAllRows();
    if (scope === 'all' || scope === 'pickups') {
      const rows = scope === 'pickups'
        ? allRows.filter((row) => Boolean(Number(row.pickup_school)))
        : allRows;
      return NextResponse.json({ rows: rows.map((row) => mapIncident(row)) });
    }
    const references = incidentReferences(number || '').map((value) => value.toUpperCase());
    const row = allRows.find((item) =>
      references.includes(textValue(item.order_number).toUpperCase()),
    );
    if (!row) return NextResponse.json({ found: false, incident: null });
    return NextResponse.json({
      found: true,
      incident: mapIncident(row, number),
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
      orderNumber?: string;
      received?: boolean;
      solved?: boolean;
      sent?: boolean;
    };
    const orderNumber = String(body.orderNumber || '').trim();
    if (!orderNumber)
      return NextResponse.json(
        { error: 'Falta el número de pedido.' },
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
    const references = incidentReferences(orderNumber).map((value) => value.toUpperCase());
    const rows = await readAllRows();
    const storedRow = rows.find((item) =>
      references.includes(textValue(item.order_number).toUpperCase()),
    );
    if (!storedRow)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para actualizarla.' },
        { status: 404 },
      );
    const now = new Date().toISOString();
    const record: Record<string, unknown> = {
      ...storedRow,
      ...(typeof body.received === 'boolean'
        ? {
            pickup_received: body.received ? 1 : 0,
            pickup_received_at: body.received ? now : '',
          }
        : {}),
      ...(typeof body.solved === 'boolean'
        ? {
            solved: body.solved ? 1 : 0,
            solved_at: body.solved ? now : '',
          }
        : {}),
      ...(typeof body.sent === 'boolean'
        ? { sent: body.sent ? 1 : 0 }
        : {}),
      updated_at: now,
    };
    await persistAllRows(rows.map((item) => item === storedRow ? record : item));
    return NextResponse.json({
      ok: true,
      incident: mapIncident(record, orderNumber),
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
    if (Boolean(incoming.allocate_id_only)) {
      return NextResponse.json({ generatedId: await nextAutomaticIncidentId(rows) });
    }
    let originalReference = textValue(incoming.order_number).trim().toUpperCase();
    if (!originalReference && Boolean(incoming.auto_generate_id)) {
      originalReference = await nextAutomaticIncidentId(rows);
    }
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
    const now = new Date().toISOString();
    const references = incidentReferences(textValue(record.order_number)).map((value) => value.toUpperCase());
    const previous = rows.find((item) =>
      references.includes(textValue(item.order_number).toUpperCase()),
    );
    const saved: Record<string, unknown> = {
      ...previous,
      ...record,
      source_type: textValue(record.source_type) || textValue(previous?.source_type) || 'order',
      products_json: typeof record.products_json === 'string'
        ? record.products_json
        : JSON.stringify(record.products_json || []),
      created_at: textValue(previous?.created_at) || now,
      updated_at: now,
      recurrence_count: Number(previous?.recurrence_count || 0) +
        (Boolean(record.is_recurrence) ? 1 : 0),
    };
    const nextRows = previous
      ? rows.map((item) => item === previous ? saved : item)
      : [...rows, saved];
    await persistAllRows(nextRows);
    return NextResponse.json({ ok: true, row: saved });
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
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  if (!canDeleteIncidents(user))
    return NextResponse.json(
      { error: 'Tu usuario no tiene permiso para eliminar incidencias.' },
      { status: 403 },
    );

  try {
    const body = (await request.json()) as { orderNumber?: string };
    const orderNumber = String(body.orderNumber || '').trim().replace(/^#/, '');
    if (!orderNumber)
      return NextResponse.json(
        { error: 'Falta el número de incidencia.' },
        { status: 400 },
      );

    const references = incidentReferences(orderNumber).map((value) => value.toUpperCase());
    const rows = await readAllRows();
    const nextRows = rows.filter(
      (item) => !references.includes(textValue(item.order_number).toUpperCase()),
    );
    if (nextRows.length === rows.length)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para eliminarla.' },
        { status: 404 },
      );
    await persistAllRows(nextRows);
    return NextResponse.json({ deleted: true, orderNumber });
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
