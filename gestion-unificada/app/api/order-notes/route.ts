import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderNotes } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get('number')?.trim().replace(/^#/, '');
  if (!orderNumber) return NextResponse.json({ error: 'Falta el número de pedido.' }, { status: 400 });
  try {
    const rows = await getDb().select().from(orderNotes).where(eq(orderNotes.orderNumber, orderNumber)).orderBy(desc(orderNotes.createdAt));
    return NextResponse.json({ notes: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudieron cargar las notas: ${error.message}` : 'No se pudieron cargar las notas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    const body = await request.json() as { id?: string; orderNumber?: string; kind?: string; content?: string; createdAt?: number };
    const orderNumber = String(body.orderNumber || '').trim().replace(/^#/, '');
    const content = String(body.content || '').trim();
    const kind = body.kind === 'llamada' || body.kind === 'email' ? body.kind : 'nota';
    if (!orderNumber || !content) return NextResponse.json({ error: 'Escribe una nota antes de guardarla.' }, { status: 400 });
    const config = env as unknown as Record<string, string>;
    const importing = Boolean(body.id || body.createdAt);
    if (importing && request.headers.get('authorization') !== `Bearer ${config.MIGRATION_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const note = {
      id: importing ? String(body.id || '').trim() : `NOTA-${crypto.randomUUID()}`,
      orderNumber,
      kind,
      content,
      authorEmail: importing ? null : sessionUser.email,
      authorName: importing ? null : sessionUser.displayName,
      createdAt: importing ? new Date(Number(body.createdAt)) : new Date(),
    } as const;
    if (!note.id || Number.isNaN(note.createdAt.getTime())) {
      return NextResponse.json({ error: 'El registro importado no es válido.' }, { status: 400 });
    }
    await getDb().insert(orderNotes).values(note).onConflictDoNothing();
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudo guardar la nota: ${error.message}` : 'No se pudo guardar la nota.' }, { status: 500 });
  }
}
