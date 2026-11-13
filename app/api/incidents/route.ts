import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canCreateOwnIncidents, canDeleteIncidents } from '@/lib/permissions';
import { normalizeReferenceInput } from '@/lib/global-search';
import {
  deleteStoredIncident,
  updateIncidentStatus,
} from '@/lib/incident-actions';
import {
  allocateAutomaticIncidentId,
  IncidentPermissionError,
  IncidentValidationError,
  saveIncident,
} from '@/lib/incident-write';
import { findIncidents, listIncidents } from '@/lib/incident-query';

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
    if (scope === 'all' || scope === 'pickups') {
      return NextResponse.json({ rows: await listIncidents(scope) });
    }
    return NextResponse.json(await findIncidents(id || '', number));
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
    const user = await getSessionUser(request);
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
    const incident = await updateIncidentStatus(body, user);
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
    const user = await getSessionUser(request);
    const allowManual = canCreateOwnIncidents(user);
    const sourceType = String(incoming.source_type || '').toLowerCase();
    if (sourceType === 'manual' && !allowManual)
      throw new IncidentPermissionError(
        'Solo Rocío o Administración pueden crear Incidencias nuestras.',
      );
    if (Boolean(incoming.allocate_id_only))
      return NextResponse.json({
        generatedId: await allocateAutomaticIncidentId(),
      });
    return NextResponse.json(
      await saveIncident(incoming, { allowManual, actor: user }),
    );
  } catch (error) {
    if (error instanceof IncidentPermissionError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof IncidentValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
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
