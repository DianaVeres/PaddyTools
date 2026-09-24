import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { activityLogs } from '@/db/schema';

export async function GET() {
  const db = getDb();
  const activity = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(250);
  return NextResponse.json(activity);
}
