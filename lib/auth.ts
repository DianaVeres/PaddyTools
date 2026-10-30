import { env } from 'cloudflare:workers';

/**
 * Servicio de autenticación de la aplicación.
 *
 * Este archivo solo se ejecuta en el servidor (Cloudflare Worker). Se encarga de:
 * 1. Proteger las contraseñas.
 * 2. Crear y validar sesiones.
 * 3. Activar una cuenta mediante un enlace de un solo uso.
 *
 * Importante: nunca se guarda la contraseña original en D1.
 */
export const SESSION_COOKIE = 'paddy_session';
const SESSION_DAYS = 7;

export type AuthUser = { email: string; displayName: string };

type UserRow = {
  email: string;
  display_name: string;
  password_hash: string | null;
  active: number;
};

function database() {
  // DB es el binding que conecta el Worker con la base de datos D1.
  if (!env.DB) throw new Error('La base de datos de acceso no está disponible.');
  return env.DB;
}

function bytesToBase64(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export async function sha256(value: string) {
  // SHA-256 transforma el token en una huella irreversible antes de guardarlo.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export function randomToken() {
  // crypto.getRandomValues es un generador criptográficamente seguro.
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export async function hashPassword(password: string) {
  // La sal es diferente para cada usuario y evita hashes iguales para claves iguales.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // El pepper vive como secreto de Cloudflare: no está ni en Git ni en D1.
  const pepper = (env as unknown as Record<string, string>).AUTH_PEPPER;
  if (!pepper) throw new Error('Falta la clave de protección de contraseñas.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const payload = new Uint8Array(salt.length + 1 + new TextEncoder().encode(password).length);
  payload.set(salt);
  payload[salt.length] = 0;
  payload.set(new TextEncoder().encode(password), salt.length + 1);
  const signature = await crypto.subtle.sign('HMAC', key, payload);
  return `hmac-sha256$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(signature))}`;
}

export async function verifyPassword(password: string, stored: string) {
  // Recalculamos la firma con la contraseña recibida y pedimos a Web Crypto
  // que la compare con la firma almacenada.
  if (stored.startsWith('hmac-sha256$')) {
    const [, saltText, expectedText] = stored.split('$');
    const pepper = (env as unknown as Record<string, string>).AUTH_PEPPER;
    if (!pepper || !saltText || !expectedText) return false;
    const salt = base64ToBytes(saltText);
    const passwordBytes = new TextEncoder().encode(password);
    const payload = new Uint8Array(salt.length + 1 + passwordBytes.length);
    payload.set(salt);
    payload[salt.length] = 0;
    payload.set(passwordBytes, salt.length + 1);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, base64ToBytes(expectedText), payload);
  }
  // Compatibilidad con el formato PBKDF2 usado durante el desarrollo inicial.
  const [algorithm, iterationsText, saltText, expectedText] = stored.split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2-sha256' || !Number.isSafeInteger(iterations) || iterations < 100_000 || !saltText || !expectedText) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(saltText), iterations },
    key,
    256,
  ));
  const expected = base64ToBytes(expectedText);
  if (bits.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < bits.length; index += 1) difference |= bits[index] ^ expected[index];
  return difference === 0;
}

export function sessionCookie(token: string, expiresAt: Date) {
  // HttpOnly impide leerla desde JavaScript, Secure exige HTTPS y SameSite
  // reduce el riesgo de ataques CSRF desde otras páginas.
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get('cookie') || '';
  for (const entry of cookies.split(';')) {
    const [key, ...value] = entry.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

export async function findUser(email: string) {
  return database().prepare(
    'SELECT email, display_name, password_hash, active FROM auth_users WHERE email = ? LIMIT 1',
  ).bind(email.trim().toLowerCase()).first<UserRow>();
}

export async function createSession(email: string) {
  // El navegador recibe el token real, pero D1 solo guarda su hash.
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await database().prepare(
    'INSERT INTO auth_sessions (token_hash, user_email, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(tokenHash, email, now.getTime(), expiresAt.getTime()).run();
  return { token, expiresAt };
}

export async function getSessionUser(request: Request): Promise<AuthUser | null> {
  // Una sesión solo vale si existe, no ha caducado y el usuario sigue activo.
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await database().prepare(
    `SELECT u.email, u.display_name
     FROM auth_sessions s JOIN auth_users u ON u.email = s.user_email
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1 LIMIT 1`,
  ).bind(await sha256(token), Date.now()).first<{ email: string; display_name: string }>();
  return row ? { email: row.email, displayName: row.display_name } : null;
}

export async function deleteSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await database().prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

export async function activateUser(token: string, password: string) {
  // El enlace recibido se convierte al mismo hash que guardamos al generarlo.
  const tokenHash = await sha256(token);
  const row = await database().prepare(
    `SELECT t.user_email, u.display_name FROM auth_activation_tokens t
     JOIN auth_users u ON u.email = t.user_email
     WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ? LIMIT 1`,
  ).bind(tokenHash, Date.now()).first<{ user_email: string; display_name: string }>();
  if (!row) return null;
  const now = Date.now();
  const passwordHash = await hashPassword(password);
  // batch ejecuta las tres operaciones juntas: activa el usuario, consume el
  // enlace y elimina sesiones antiguas que pudieran existir.
  await database().batch([
    database().prepare('UPDATE auth_users SET password_hash = ?, active = 1, updated_at = ? WHERE email = ?').bind(passwordHash, now, row.user_email),
    database().prepare('UPDATE auth_activation_tokens SET used_at = ? WHERE token_hash = ?').bind(now, tokenHash),
    database().prepare('DELETE FROM auth_sessions WHERE user_email = ?').bind(row.user_email),
  ]);
  return { email: row.user_email, displayName: row.display_name };
}
