import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { packingListDrafts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';

type DraftInput = {
  id?: string;
  school?: string;
  shippingDate?: string;
  orderYear?: number;
  orderMonth?: number;
  boxes?: string;
};

const normalizedInput = (input: DraftInput) => ({
  school: String(input.school || '').trim().toUpperCase(),
  shippingDate: String(input.shippingDate || '').slice(0, 10),
  orderYear: Number(input.orderYear),
  orderMonth: Number(input.orderMonth),
  boxes: String(input.boxes || '').trim(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const drafts = await getDb()
    .select()
    .from(packingListDrafts)
    .orderBy(desc(packingListDrafts.updatedAt));
  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const body = (await request.json()) as DraftInput;
  const input = normalizedInput(body);
  if (
    !input.shippingDate ||
    !input.boxes ||
    !Number.isInteger(input.orderYear) ||
    input.orderYear < 2020 ||
    !Number.isInteger(input.orderMonth) ||
    input.orderMonth < 1 ||
    input.orderMonth > 12
  )
    return NextResponse.json(
      { error: 'Indica fecha, año, mes y alguna referencia antes de guardar.' },
      { status: 400 },
    );

  const id = String(body.id || '').trim() || `PLD-${crypto.randomUUID()}`;
  const now = new Date();
  await getDb()
    .insert(packingListDrafts)
    .values({
      id,
      ...input,
      createdByEmail: user.email,
      createdByName: user.displayName,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: packingListDrafts.id,
      set: {
        ...input,
        createdByEmail: user.email,
        createdByName: user.displayName,
        updatedAt: now,
      },
    });
  return NextResponse.json({ id }, { status: body.id ? 200 : 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id)
    return NextResponse.json({ error: 'Falta identificar el borrador.' }, { status: 400 });
  await getDb().delete(packingListDrafts).where(eq(packingListDrafts.id, id));
  return NextResponse.json({ deleted: true, id });
}

