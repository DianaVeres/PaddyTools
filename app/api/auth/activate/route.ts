import { NextResponse } from 'next/server';
import { activateUser, createSession, sessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // El cliente envía JSON: { token: "...", password: "..." }.
    const body = await request.json() as { token?: string; password?: string };
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    if (password.length < 10) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 10 caracteres.' }, { status: 400 });
    }
    // activateUser valida que el token exista, no esté usado y no haya caducado.
    const user = await activateUser(token, password);
    if (!user) {
      return NextResponse.json({ error: 'El enlace no es válido, ha caducado o ya fue utilizado.' }, { status: 400 });
    }
    // La persona queda autenticada inmediatamente después de activar su cuenta.
    const session = await createSession(user.email);
    const response = NextResponse.json({ user });
    // Set-Cookie hace que el navegador recuerde la sesión durante siete días.
    response.headers.set('Set-Cookie', sessionCookie(session.token, session.expiresAt));
    return response;
  } catch (error) {
    console.error('Account activation failed', error);
    return NextResponse.json({ error: 'No se pudo activar la cuenta.' }, { status: 500 });
  }
}
