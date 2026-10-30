import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isPublicApiRequest } from '@/lib/api-access';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicApiRequest(pathname, request.method)) return NextResponse.next();

  const user = await getSessionUser(request);
  if (user) return NextResponse.next();

  return NextResponse.json(
    { error: 'Debes iniciar sesión para acceder a PaddyTools.' },
    { status: 401 },
  );
}

export const config = {
  matcher: ['/api/:path*'],
};
