import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { kpiWorkLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { canDeleteIncidents, canManageMaintenance } from '@/lib/permissions';
import { validateKpiWorkLog } from '@/lib/kpi-work-log';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  const from = request.nextUrl.searchParams.get('from')?.slice(0, 10) || '';
  const to = request.nextUrl.searchParams.get('to')?.slice(0, 10) || '';
  const rows = await getDb()
    .select()
    .from(kpiWorkLogs)
    .orderBy(desc(kpiWorkLogs.workDate), desc(kpiWorkLogs.createdAt));
  return NextResponse.json({
    logs: rows.filter(
      (row) => (!from || row.workDate >= from) && (!to || row.workDate <= to),
    ),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  try {
    const data = validateKpiWorkLog(
      (await request.json()) as Record<string, unknown>,
    );
    if (data.activity === 'mantenimiento' && !canManageMaintenance(user))
      return NextResponse.json(
        { error: 'Solo Administración puede registrar Mantenimiento.' },
        { status: 403 },
      );
    const log = {
      id: `KPI-${crypto.randomUUID()}`,
      ...data,
      workerEmail: user.email,
      workerName: user.displayName,
      createdAt: new Date(),
    };
    await getDb().insert(kpiWorkLogs).values(log);
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el registro de trabajo.',
      },
      { status: 400 },
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
  const id = String(
    ((await request.json()) as { id?: string }).id || '',
  ).trim();
  if (!id)
    return NextResponse.json(
      { error: 'Falta identificar el registro.' },
      { status: 400 },
    );
  const [existing] = await getDb()
    .select()
    .from(kpiWorkLogs)
    .where(eq(kpiWorkLogs.id, id))
    .limit(1);
  if (!existing)
    return NextResponse.json(
      { error: 'No se encontró el registro.' },
      { status: 404 },
    );
  if (existing.workerEmail !== user.email && !canDeleteIncidents(user))
    return NextResponse.json(
      { error: 'No tienes permiso para eliminar el registro de otra persona.' },
      { status: 403 },
    );
  await getDb()
    .delete(kpiWorkLogs)
    .where(and(eq(kpiWorkLogs.id, id)));
  return NextResponse.json({ deleted: true });
}
