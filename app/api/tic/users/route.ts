import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import {
  APP_PERMISSIONS,
  getSessionUser,
  parsePermissions,
  serializePermissions,
  randomToken,
  sha256,
  type AppPermission,
} from '@/lib/auth';

const ADMIN_EMAIL = 'administracion@paddy.es';

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  return user?.email.toLowerCase() === ADMIN_EMAIL ? user : null;
}

function cleanPermissions(value: unknown): AppPermission[] {
  return Array.isArray(value)
    ? APP_PERMISSIONS.filter((permission) => value.includes(permission))
    : [];
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  const result = await env.DB.prepare(
    'SELECT email, display_name, active, permissions, created_at, updated_at FROM auth_users ORDER BY display_name COLLATE NOCASE',
  ).all<{ email: string; display_name: string; active: number; permissions: string; created_at: number; updated_at: number }>();
  return NextResponse.json({ users: result.results.map((row) => ({
    email: row.email,
    displayName: row.display_name,
    active: Boolean(row.active),
    permissions: parsePermissions(row.permissions, row.email),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  const body = await request.json() as { email?: string; displayName?: string; permissions?: unknown };
  const email = String(body.email || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim();
  const permissions = cleanPermissions(body.permissions);
  if (!/^\S+@\S+\.\S+$/.test(email) || !displayName) {
    return NextResponse.json({ error: 'Indica un nombre y un correo válidos.' }, { status: 400 });
  }
  const exists = await env.DB.prepare('SELECT email FROM auth_users WHERE email = ?').bind(email).first();
  if (exists) return NextResponse.json({ error: 'Ya existe un usuario con ese correo.' }, { status: 409 });

  const now = Date.now();
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO auth_users (email, display_name, active, permissions, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)')
      .bind(email, displayName, serializePermissions(permissions), now, now),
    env.DB.prepare('INSERT INTO auth_activation_tokens (token_hash, user_email, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), email, now, now + 7 * 24 * 60 * 60 * 1000),
  ]);
  return NextResponse.json({ activationUrl: `${new URL(request.url).origin}/activate?token=${encodeURIComponent(token)}` }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  const body = await request.json() as { email?: string; displayName?: string; permissions?: unknown; active?: boolean; newActivationLink?: boolean };
  const email = String(body.email || '').trim().toLowerCase();
  const current = await env.DB.prepare('SELECT email, active FROM auth_users WHERE email = ?').bind(email).first<{ email: string; active: number }>();
  if (!current) return NextResponse.json({ error: 'El usuario no existe.' }, { status: 404 });
  if (email === ADMIN_EMAIL && body.active === false) {
    return NextResponse.json({ error: 'La cuenta de administración no se puede dar de baja.' }, { status: 400 });
  }

  const statements = [];
  const now = Date.now();
  if (body.displayName !== undefined || body.permissions !== undefined || body.active !== undefined) {
    const displayName = String(body.displayName || '').trim();
    if (!displayName) return NextResponse.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });
    statements.push(env.DB.prepare('UPDATE auth_users SET display_name = ?, permissions = ?, active = ?, updated_at = ? WHERE email = ?')
      .bind(displayName, serializePermissions(cleanPermissions(body.permissions)), body.active ? 1 : 0, now, email));
    if (body.active === false) statements.push(env.DB.prepare('DELETE FROM auth_sessions WHERE user_email = ?').bind(email));
  }

  let activationUrl: string | undefined;
  if (body.newActivationLink) {
    const token = randomToken();
    statements.push(env.DB.prepare('DELETE FROM auth_activation_tokens WHERE user_email = ? AND used_at IS NULL').bind(email));
    statements.push(env.DB.prepare('INSERT INTO auth_activation_tokens (token_hash, user_email, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), email, now, now + 7 * 24 * 60 * 60 * 1000));
    activationUrl = `${new URL(request.url).origin}/activate?token=${encodeURIComponent(token)}`;
  }
  if (!statements.length) return NextResponse.json({ error: 'No hay cambios.' }, { status: 400 });
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true, activationUrl });
}
