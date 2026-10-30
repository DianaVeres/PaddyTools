import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { records } from '@/db/schema';

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;
  const type = body.type === 'reserva' ? 'reserva' : body.type === 'incidencia' ? 'incidencia' : null;
  const reference = String(body.reference ?? '').trim();
  if (!type || !reference) return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
  const id = `${type === 'incidencia' ? 'INC' : 'RSV'}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await getDb().insert(records).values({ id, type, reference, customerName: String(body.customerName ?? 'Sin nombre'), phone: String(body.phone ?? ''), subject: String(body.subject ?? type), details: String(body.details ?? ''), createdAt: new Date() });
  return NextResponse.json({ id, type, status: 'abierto' }, { status: 201 });
}
