import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const emails = process.argv
  .slice(2)
  .map((email) => email.trim().toLowerCase())
  .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

if (!emails.length) {
  console.error(
    'Uso: node scripts/create-activation-links.mjs usuario@paddy.es [...]',
  );
  process.exit(1);
}

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
const now = Date.now();
const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
const sqlText = (value) => `'${String(value).replaceAll("'", "''")}'`;
const links = [];

for (const email of emails) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('base64');
  const sql = [
    `DELETE FROM auth_activation_tokens WHERE user_email = ${sqlText(email)} AND used_at IS NULL`,
    `INSERT INTO auth_activation_tokens (token_hash, user_email, created_at, expires_at, used_at) SELECT ${sqlText(tokenHash)}, ${sqlText(email)}, ${now}, ${expiresAt}, NULL WHERE EXISTS (SELECT 1 FROM auth_users WHERE email = ${sqlText(email)} AND active = 0)`,
  ].join('; ');
  const result = spawnSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'gestion-unificada-db',
      '--remote',
      '--command',
      sql,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(result.error || result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  links.push({
    email,
    expiresAt: new Date(expiresAt).toISOString(),
    url: `https://gestion-unificada.paddygestion.workers.dev/activate?token=${encodeURIComponent(token)}`,
  });
}

console.log(JSON.stringify(links, null, 2));
