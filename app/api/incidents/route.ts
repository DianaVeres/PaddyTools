import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { canDeleteIncidents } from '@/lib/permissions';
import {
  incidentReferenceCandidates,
  normalizeReferenceInput,
} from '@/lib/global-search';
import {
  incidentFieldsFor,
  incidentTextValue as textValue,
  mapStoredIncident as mapIncident,
  nextAutomaticIncidentId,
  readAllIncidentRows as readAllRows,
} from '@/lib/incident-store';
import {
  deleteStoredIncident,
  updateIncidentStatus,
} from '@/lib/incident-actions';

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
    const incident = await updateIncidentStatus(body);
    if (!incident)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para actualizarla.' },
        { status: 404 },
      );
    return NextResponse.json({ ok: true, incident });
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
        .set(incidentFieldsFor(id, saved))
        .where(eq(incidentRecords.id, id));
    else
      await getDb()
        .insert(incidentRecords)
        .values(incidentFieldsFor(id, saved));
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
    const deleted = await deleteStoredIncident(body);
    if (!deleted)
      return NextResponse.json(
        { error: 'No se encontró la incidencia para eliminarla.' },
        { status: 404 },
      );
    return NextResponse.json(deleted);
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
