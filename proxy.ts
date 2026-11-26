import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isPublicApiRequest } from '@/lib/api-access';
import { hasTechnicalOnlyAccess } from '@/lib/technical-sheet-access';
import { isPermissionsAdmin, moduleForPath } from '@/lib/module-permissions';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const isTechnicalApi = pathname === '/api/technical-sheets';
  const isTechnicalPage = pathname.replace(/\/$/, '') === '/fichas-tecnicas';
  if (pathname.startsWith('/api/auth/') && isPublicApiRequest(pathname, request.method))
    return NextResponse.next();

  const user = await getSessionUser(request);
  if ((isTechnicalApi || isTechnicalPage) && !user?.permissions.includes('fichas')) {
    if (!isApi) return NextResponse.redirect(new URL(user ? '/' : '/login?next=/fichas-tecnicas', request.url));
    if (user) return NextResponse.json({ error: 'No tienes acceso a Fichas técnicas.' }, { status: 403 });
  }
  if (hasTechnicalOnlyAccess(user?.email)) {
    if (isTechnicalApi || isTechnicalPage) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: 'Tu cuenta solo tiene acceso a Fichas técnicas.' }, { status: 403 });
    if (user?.permissions.includes('fichas')) return NextResponse.redirect(new URL('/fichas-tecnicas', request.url));
    return new NextResponse('Esta cuenta no tiene módulos habilitados.', { status: 403 });
  }
  if (isPublicApiRequest(pathname, request.method)) return NextResponse.next();
  if (!user && pathname === '/tic') return NextResponse.redirect(new URL('/login?next=/tic', request.url));
  if ((pathname === '/tic' || pathname.startsWith('/api/tic/')) && !isPermissionsAdmin(user?.email))
    return NextResponse.json({ error: 'Solo Administración puede gestionar permisos.' }, { status: user ? 403 : 401 });
  const requiredModule = moduleForPath(pathname);
  const packingLookup = request.method === 'GET' && user?.permissions.includes('packing') &&
    ['/api/search', '/api/monday', '/api/incidents'].includes(pathname) &&
    Boolean(request.nextUrl.searchParams.get('number')) &&
    !request.nextUrl.searchParams.has('scope') && !request.nextUrl.searchParams.has('id');
  const pickupAccess = user?.permissions.includes('recogidas') && pathname === '/api/incidents' &&
    (request.method === 'PATCH' || (request.method === 'GET' && request.nextUrl.searchParams.get('scope') === 'pickups'));
  if (user && requiredModule && !user.permissions.includes(requiredModule) && !packingLookup && !pickupAccess)
    return NextResponse.json({ error: 'No tienes acceso a este módulo.' }, { status: 403 });
  if (!isApi || isPublicApiRequest(pathname, request.method)) return NextResponse.next();
  if (user) return NextResponse.next();

  return NextResponse.json(
    { error: 'Debes iniciar sesión para acceder a PaddyTools.' },
    { status: 401 },
  );
}

export const config = {
  matcher: ['/api/:path*', '/', '/tic', '/fichas-tecnicas/:path*', '/preparar-pedidos/:path*', '/gestionar-devoluciones/:path*', '/preparar-reservas/:path*', '/incidencias/:path*', '/incidencias-app.html', '/packing-list/:path*', '/hotline/:path*', '/kpis/:path*', '/inventarios/:path*'],
};
