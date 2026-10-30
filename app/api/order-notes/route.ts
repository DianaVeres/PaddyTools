import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { orderNotes } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import {
  normalizeOrderNoteContent,
  normalizeOrderNoteKind,
  normalizeOrderNoteReference,
} from '@/lib/order-note';

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const orderNumber = normalizeOrderNoteReference(
    request.nextUrl.searchParams.get('number'),
  );
  if (!orderNumber) return NextResponse.json({ error: 'Falta el número de pedido.' }, { status: 400 });
  try {
    const rows = await getDb().select().from(orderNotes).where(eq(orderNotes.orderNumber, orderNumber)).orderBy(desc(orderNotes.createdAt));
    return NextResponse.json({ notes: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudieron cargar las notas: ${error.message}` : 'No se pudieron cargar las notas.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    const body = await request.json() as { id?: string; orderNumber?: string };
    const id = String(body.id || '').trim();
    const orderNumber = normalizeOrderNoteReference(body.orderNumber);
    if (!id || !orderNumber)
      return NextResponse.json({ error: 'Falta identificar la nota.' }, { status: 400 });

    const deletableNote = await getDb().select({ id: orderNotes.id }).from(orderNotes).where(and(
      eq(orderNotes.id, id),
      eq(orderNotes.orderNumber, orderNumber),
    )).limit(1);
    if (!deletableNote.length)
      return NextResponse.json({ error: 'No se ha encontrado la nota de PaddyTools.' }, { status: 404 });

    await getDb().delete(orderNotes).where(and(
      eq(orderNotes.id, id),
      eq(orderNotes.orderNumber, orderNumber),
    ));
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudo eliminar la nota: ${error.message}` : 'No se pudo eliminar la nota.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    const body = await request.json() as { id?: string; orderNumber?: string; kind?: string; content?: string; createdAt?: number };
    const orderNumber = normalizeOrderNoteReference(body.orderNumber);
    const content = normalizeOrderNoteContent(body.content);
    const kind = normalizeOrderNoteKind(body.kind);
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
