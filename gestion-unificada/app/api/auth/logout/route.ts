import { NextResponse } from 'next/server';
import { deleteSession, expiredSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  await deleteSession(request);
  const response = NextResponse.json({ ok: true });
  response.headers.set('Set-Cookie', expiredSessionCookie());
  return response;
}
