/**
 * @omegaread/db — Conexión a base de datos y exports
 *
 * Uso:
 *   import { db } from '@omegaread/db';
 *   import { parents, students } from '@omegaread/db/schema';
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/omegaread';

/** Cliente PostgreSQL */
const client = postgres(connectionString);

/** Instancia de Drizzle ORM con schema tipado */
export const db = drizzle(client, { schema });

export type Database = typeof db;

// Re-export schema
export * from './schema';
