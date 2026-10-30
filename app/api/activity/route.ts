import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getPackingDb } from '@/db';
import { packingActivityLogs } from '@/db/schema';

export async function GET() {
  const rows = await getPackingDb()
    .select()
    .from(packingActivityLogs)
    .orderBy(desc(packingActivityLogs.createdAt))
    .limit(250);
  return NextResponse.json(rows);
}
