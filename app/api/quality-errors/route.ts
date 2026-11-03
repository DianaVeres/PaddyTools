import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { authUsers, kpiWorkLogs, qualityErrors } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { canDeleteIncidents } from '@/lib/permissions';
import {
  calculateQualitySnapshot,
  validateQualityError,
} from '@/lib/quality-error';

const date = (value: string | null) => value?.slice(0, 10) || '';
const inRange = (value: string, from: string, to: string) =>
  (!from || value >= from) && (!to || value <= to);

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const from = date(request.nextUrl.searchParams.get('from'));
  const to = date(request.nextUrl.searchParams.get('to'));
  const worker = request.nextUrl.searchParams.get('worker')?.trim().toLowerCase() || '';
  if (from && to && from > to)
    return NextResponse.json({ error: 'La fecha inicial no puede ser posterior a la final.' }, { status: 400 });
  const [allErrors, allWorkLogs, users] = await Promise.all([
    getDb().select().from(qualityErrors).orderBy(desc(qualityErrors.errorDate), desc(qualityErrors.createdAt)),
    getDb().select().from(kpiWorkLogs),
    getDb().select({ email: authUsers.email, displayName: authUsers.displayName }).from(authUsers).where(eq(authUsers.active, true)),
  ]);
  const errors = allErrors.filter((row) => inRange(row.errorDate, from, to) && (!worker || row.responsibleEmail === worker));
  const workLogs = allWorkLogs.filter((row) => inRange(row.workDate, from, to) && (!worker || row.workerEmail === worker));
  return NextResponse.json({
    errors,
    workers: users.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
    metrics: calculateQualitySnapshot(errors, workLogs),
  }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const reporter = await getSessionUser(request);
  if (!reporter) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  try {
    const input = validateQualityError(await request.json() as Record<string, unknown>);
    const [responsible] = await getDb().select({ email: authUsers.email, displayName: authUsers.displayName }).from(authUsers).where(and(eq(authUsers.email, input.responsibleEmail), eq(authUsers.active, true))).limit(1);
    if (!responsible) return NextResponse.json({ error: 'La persona seleccionada no es un usuario activo.' }, { status: 400 });
    const now = new Date();
    const row = {
      id: `ERR-${crypto.randomUUID()}`,
      ...input,
      responsibleEmail: responsible.email,
      responsibleName: responsible.displayName,
      reporterEmail: reporter.email,
      reporterName: reporter.displayName,
      createdAt: now,
      updatedAt: now,
    };
    await getDb().insert(qualityErrors).values(row);
    return NextResponse.json({ errorRecord: row }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar el error.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const body = await request.json() as { id?: string; resolved?: boolean };
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Falta identificar el error.' }, { status: 400 });
  await getDb().update(qualityErrors).set({ resolved: Boolean(body.resolved), updatedAt: new Date() }).where(eq(qualityErrors.id, id));
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const id = String((await request.json() as { id?: string }).id || '').trim();
  const [existing] = await getDb().select().from(qualityErrors).where(eq(qualityErrors.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'No se encontró el error.' }, { status: 404 });
  if (existing.reporterEmail !== user.email && !canDeleteIncidents(user))
    return NextResponse.json({ error: 'No tienes permiso para eliminar este registro.' }, { status: 403 });
  await getDb().delete(qualityErrors).where(eq(qualityErrors.id, id));
  return NextResponse.json({ deleted: true });
}
