import { NextResponse } from 'next/server';
import { createSession, findUser, sessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = await findUser(email);
    if (!user?.active || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
    }
    const session = await createSession(user.email);
    const response = NextResponse.json({ user: { email: user.email, displayName: user.display_name } });
    response.headers.set('Set-Cookie', sessionCookie(session.token, session.expiresAt));
    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesión.' }, { status: 500 });
  }
}
