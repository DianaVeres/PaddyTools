import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

const PADDY_WORDPRESS_ADMIN = 'https://paddy.es/wp-admin/';

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser)
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );

  return NextResponse.redirect(PADDY_WORDPRESS_ADMIN);
}
