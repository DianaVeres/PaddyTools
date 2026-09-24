import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { incidentCache } from '@/db/schema';

const CACHE_MAX_AGE = 15 * 60 * 1000;
const DEFAULT_INCIDENTS_APP_URL =
  'https://incidencias-production-00a0.up.railway.app';

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

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
  return {
    orderNumber: textValue(row.order_number) || fallback,
    customerName: textValue(row.customer_name),
    customerEmail: textValue(row.customer_email),
    customerPhone: textValue(row.customer_phone),
    incidentText: observationMatch
      ? storedText.slice(0, observationMatch.index).trim()
      : storedText,
    observations: observationMatch?.[1]?.trim() || '',
    incidentDate: textValue(row.incident_date) || textValue(row.created_at),
    solved: Boolean(Number(row.solved)),
    solvedAt: textValue(row.solved_at),
    updatedAt: textValue(row.updated_at),
    pickupSchool: Boolean(Number(row.pickup_school)),
    pickupSchoolName: textValue(row.pickup_school_name),
    pickupDetails: textValue(row.pickup_details),
    pickupReceived: Boolean(Number(row.pickup_received)),
    pickupReceivedAt: textValue(row.pickup_received_at),
    school: textValue(row.incident_school_name),
    recurrenceCount: Number(row.recurrence_count || 0),
    products,
  };
}

function incidentReferences(number: string) {
  const match = number.match(/^(?:I|R)?PA(.+)$/i);
  if (!match) return [number];
  const plain = match[1];
  return [`IPA${plain}`, `PA${plain}`];
}

function incidentsAppUrl(config: Record<string, string>) {
  return (config.INCIDENTS_APP_URL || DEFAULT_INCIDENTS_APP_URL).replace(
    /\/$/,
    '',
  );
}

async function incidentsFetch(
  path: string,
  config: Record<string, string>,
  init?: RequestInit,
) {
  const response = await fetch(`${incidentsAppUrl(config)}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.headers || {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok) throw new Error(`el registro respondió ${response.status}`);
  return response;
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

async function updateCachedIncident(row: Record<string, unknown>) {
  const reference = textValue(row.order_number).toUpperCase();
  if (!reference) return;
  try {
    for (const scope of ['all', 'pickups'] as const) {
      const cached = await readCachedRows(scope);
      if (!cached) continue;
      const rows = cached.rows.filter(
        (item) => textValue(item.order_number).toUpperCase() !== reference,
      );
      if (scope === 'all' || Boolean(Number(row.pickup_school))) rows.push(row);
      await saveCachedRows(scope, rows);
    }
  } catch {
    // El guardado principal no debe fallar si solo falla la caché.
  }
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
  const config = env as unknown as Record<string, string>;
  try {
    const cacheScope = scope === 'all' || scope === 'pickups' ? scope : null;
    const cached = cacheScope ? await readCachedRows(cacheScope) : await readCachedRows('all');
    if (cacheScope && cached && Date.now() - cached.updatedAt.getTime() < CACHE_MAX_AGE) {
      return NextResponse.json({ rows: dedupeIncidentRows(cached.rows).map((row) => mapIncident(row)), cached: true });
    }
    if (!cacheScope && number && cached) {
      const references = incidentReferences(number).map((value) => value.toUpperCase());
      const row = dedupeIncidentRows(cached.rows).find((item) => references.includes(textValue(item.order_number).toUpperCase()));
      if (row) return NextResponse.json({ found: true, incident: mapIncident(row, number), cached: true });
    }
    let rows: Record<string, unknown>[] = [];
    if (scope === 'all') {
      const response = await incidentsFetch('/api/incidents', config);
      rows = (await response.json()) as Record<string, unknown>[];
    } else if (scope === 'pickups') {
      const response = await incidentsFetch('/api/pickups', config);
      rows = (await response.json()) as Record<string, unknown>[];
    } else {
      for (const reference of incidentReferences(number || '')) {
        const response = await incidentsFetch(
          `/api/incidents?q=${encodeURIComponent(reference)}`,
          config,
        );
        const matches = (await response.json()) as Record<string, unknown>[];
        const references = incidentReferences(number || '').map((value) =>
          value.toUpperCase(),
        );
        const exact = matches.find((item) =>
          references.includes(textValue(item.order_number).toUpperCase()),
        );
        if (exact) {
          rows = [exact];
          break;
        }
      }
    }
    if (scope === 'all' || scope === 'pickups') {
      rows = dedupeIncidentRows(rows);
      await saveCachedRows(scope, rows);
      return NextResponse.json({
        rows: rows.map((row) => mapIncident(row)),
      });
    }
    if (!rows[0]) return NextResponse.json({ found: false, incident: null });
    return NextResponse.json({
      found: true,
      incident: mapIncident(rows[0], number),
    });
  } catch (error) {
    const cacheScope = scope === 'all' || scope === 'pickups' ? scope : null;
    const cached = cacheScope ? await readCachedRows(cacheScope) : null;
    if (cached) {
      return NextResponse.json({ rows: dedupeIncidentRows(cached.rows).map((row) => mapIncident(row)), cached: true, stale: true });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo consultar incidencias: ${error.message}`
            : 'No se pudo consultar incidencias.',
      },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const config = env as unknown as Record<string, string>;
  try {
    const body = (await request.json()) as {
      orderNumber?: string;
      received?: boolean;
      solved?: boolean;
    };
    const orderNumber = String(body.orderNumber || '').trim();
    if (!orderNumber)
      return NextResponse.json(
        { error: 'Falta el número de pedido.' },
        { status: 400 },
      );
    if (typeof body.received !== 'boolean' && typeof body.solved !== 'boolean')
      return NextResponse.json(
        { error: 'No se ha indicado ningún cambio.' },
        { status: 400 },
      );
    const references = incidentReferences(orderNumber).map((value) =>
      value.toUpperCase(),
    );
    const lookup = await incidentsFetch(
      `/api/incidents?q=${encodeURIComponent(orderNumber)}`,
      config,
    );
    const matches = (await lookup.json()) as Record<string, unknown>[];
    const storedRow = matches.find((item) =>
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
      updated_at: now,
    };
    let updatedRow: Record<string, unknown> = record;
    if (typeof body.received === 'boolean') {
      await incidentsFetch('/api/pickup-received', config, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          order_number: textValue(storedRow.order_number),
          received: body.received,
          record_source: textValue(storedRow.source_type) || 'order',
        }),
      });
    }
    if (typeof body.solved === 'boolean') {
      const response = await incidentsFetch('/api/save', config, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
      updatedRow = (await response.json()) as Record<string, unknown>;
    }
    await updateCachedIncident(updatedRow);
    return NextResponse.json({
      ok: true,
      incident: mapIncident(updatedRow, orderNumber),
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
  const config = env as unknown as Record<string, string>;
  try {
    const incoming = (await request.json()) as Record<string, unknown>;
    const originalReference = textValue(incoming.order_number).trim().toUpperCase();
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
    const response = await incidentsFetch('/api/save', config, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
    });
    const saved = (await response.json()) as Record<string, unknown>;
    await updateCachedIncident(saved);
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
