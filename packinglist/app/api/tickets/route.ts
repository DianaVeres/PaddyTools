import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

export async function GET(request: NextRequest) {
  const number = request.nextUrl.searchParams
    .get('number')
    ?.trim()
    .replace(/^#/, '');
  if (!number)
    return NextResponse.json(
      { error: 'Introduce un número de ticket.' },
      { status: 400 },
    );
  const row = await env.DB.prepare(
    'SELECT ticket_number,date,customer,store,operator,total,payment,items_json,synced_at FROM store_tickets WHERE ticket_number = ?',
  )
    .bind(number)
    .first<Record<string, unknown>>();
  if (!row) return NextResponse.json({ found: false, ticket: null });
  let items: unknown[] = [];
  try {
    items = JSON.parse(String(row.items_json || '[]'));
  } catch {}
  return NextResponse.json({
    found: true,
    ticket: {
      number: row.ticket_number,
      date: row.date,
      customer: row.customer,
      store: row.store,
      operator: row.operator,
      total: row.total,
      payment: row.payment,
      items,
      syncedAt: row.synced_at,
    },
  });
}

export async function POST(request: NextRequest) {
  const config = env as unknown as Record<string, string>;
  const auth = request.headers.get('authorization');
  if (
    !config.DETALL_SYNC_TOKEN ||
    auth !== `Bearer ${config.DETALL_SYNC_TOKEN}`
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const number = String(body.ticket_number || body.number || '').trim();
  if (!number)
    return NextResponse.json(
      { error: 'Falta el número de ticket.' },
      { status: 400 },
    );
  const items = Array.isArray(body.items) ? body.items : [];
  await env.DB.prepare(
    `INSERT INTO store_tickets(ticket_number,date,customer,store,operator,total,payment,items_json,raw_json,synced_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(ticket_number) DO UPDATE SET date=excluded.date,customer=excluded.customer,store=excluded.store,operator=excluded.operator,total=excluded.total,payment=excluded.payment,items_json=excluded.items_json,raw_json=excluded.raw_json,synced_at=excluded.synced_at`,
  )
    .bind(
      number,
      String(body.date || ''),
      String(body.customer || ''),
      String(body.store || ''),
      String(body.operator || ''),
      String(body.total || ''),
      String(body.payment || ''),
      JSON.stringify(items),
      JSON.stringify(body),
      Date.now(),
    )
    .run();
  return NextResponse.json({ ok: true, ticket_number: number });
}
