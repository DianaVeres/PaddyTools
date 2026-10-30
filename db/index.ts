import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.',
    );
  }

  return drizzle(env.DB, { schema });
}

export function getPackingDb() {
  const packingDb = (env as unknown as { PACKING_DB?: D1Database }).PACKING_DB;
  if (!packingDb)
    throw new Error('Cloudflare D1 binding `PACKING_DB` no está disponible.');
  return drizzle(packingDb, { schema });
}
