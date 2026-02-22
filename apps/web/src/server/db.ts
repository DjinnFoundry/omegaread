/**
 * Helper para obtener la instancia de DB desde el binding D1 de Cloudflare.
 * Usar en server actions y API routes:
 *
 *   import { getDb } from '@/server/db';
 *   const db = await getDb();
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createDb } from '@omegaread/db';

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return createDb((env as Record<string, unknown>).DB as D1Database);
}
