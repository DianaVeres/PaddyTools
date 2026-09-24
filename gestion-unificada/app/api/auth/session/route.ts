import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
}
