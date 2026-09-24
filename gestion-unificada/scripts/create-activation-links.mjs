import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const users = [
  'administracion@paddy.es',
  'rociosaez@paddy.es',
  'luzma.paddy@gmail.com',
  'tienda@paddy.es',
];
const origin = process.env.APP_ORIGIN || 'https://gestion-unificada.paddygestion.workers.dev';
const now = Date.now();
const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
const links = [];

for (const email of users) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('base64');
  const sql = [
    `DELETE FROM auth_activation_tokens WHERE user_email = '${email}' AND used_at IS NULL`,
    `INSERT INTO auth_activation_tokens (token_hash, user_email, created_at, expires_at) VALUES ('${tokenHash}', '${email}', ${now}, ${expiresAt})`,
  ].join('; ');
  const result = spawnSync(
    process.execPath,
    [join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js'), 'd1', 'execute', 'gestion-unificada-db', '--remote', '--config', 'wrangler.independent.jsonc', '--command', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `No se pudo crear el enlace para ${email}.\n`);
    process.exit(result.status || 1);
  }
  links.push(`${email}: ${origin}/activate?token=${encodeURIComponent(token)}`);
}

console.log('\nEnlaces privados (caducan en 7 días y funcionan una sola vez):\n');
console.log(links.join('\n'));
