/**
 * @zetaread/db -- Conexion a base de datos y exports
 *
 * Para Cloudflare D1 (SQLite):
 *   import { createDb } from '@zetaread/db';
 *   const db = createDb(env.DB);
 *
 * Schema:
 *   import { parents, students } from '@zetaread/db/schema';
 */
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/** Crea instancia de Drizzle ORM para un binding D1 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Re-export schema
export * from './schema';

// Re-export drizzle-orm operators (so web app doesn't need its own drizzle-orm dep)
export { eq, and, or, not, desc, asc, gte, lte, gt, lt, ne, sql, inArray, isNull, isNotNull, count, sum, avg, min, max } from 'drizzle-orm';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
