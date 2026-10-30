import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

export async function GET() {
  try {
    const packingDb = (env as unknown as { PACKING_DB: D1Database }).PACKING_DB;
    const [incidents, packingLists] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM incident_records').first<{
        count: number;
      }>(),
      packingDb.prepare(
        "SELECT COUNT(*) AS count FROM packing_lists WHERE school <> '__DELETED__'",
      ).first<{ count: number }>(),
    ]);
    return NextResponse.json({
      ok: true,
      database: true,
      packingDatabase: true,
      incidents: Number(incidents?.count || 0),
      packingLists: Number(packingLists?.count || 0),
    });
  } catch {
    return NextResponse.json(
      { ok: false, database: false, packingDatabase: false },
      { status: 503 },
    );
  }
}
