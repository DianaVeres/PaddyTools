import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isPublicApiRequest } from '@/lib/api-access';
import { canReadTechnicalSheets, hasTechnicalOnlyAccess } from '@/lib/technical-sheet-access';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const isTechnicalApi = pathname === '/api/technical-sheets';
  const isTechnicalPage = pathname.replace(/\/$/, '') === '/fichas-tecnicas';
  if (pathname.startsWith('/api/auth/') && isPublicApiRequest(pathname, request.method))
    return NextResponse.next();

  const user = await getSessionUser(request);
  if ((isTechnicalApi || isTechnicalPage) && !canReadTechnicalSheets(user?.email)) {
    if (!isApi) return NextResponse.redirect(new URL(user ? '/' : '/login?next=/fichas-tecnicas', request.url));
    if (user) return NextResponse.json({ error: 'No tienes acceso a Fichas técnicas.' }, { status: 403 });
  }
  if (hasTechnicalOnlyAccess(user?.email)) {
    if (isTechnicalApi || isTechnicalPage) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: 'Tu cuenta solo tiene acceso a Fichas técnicas.' }, { status: 403 });
    return NextResponse.redirect(new URL('/fichas-tecnicas', request.url));
  }
  if (!isApi || isPublicApiRequest(pathname, request.method)) return NextResponse.next();
  if (user) return NextResponse.next();

  return NextResponse.json(
    { error: 'Debes iniciar sesión para acceder a PaddyTools.' },
    { status: 401 },
  );
}

export const config = {
  matcher: ['/api/:path*', '/', '/fichas-tecnicas/:path*', '/preparar-pedidos/:path*', '/incidencias/:path*', '/incidencias-app.html', '/packing-list/:path*', '/hotline/:path*', '/kpis/:path*', '/inventarios/:path*'],
};
