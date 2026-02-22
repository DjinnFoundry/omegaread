/**
 * @omegaread/db — Conexión a base de datos y exports
 *
 * Uso:
 *   import { db } from '@omegaread/db';
 *   import { parents, students } from '@omegaread/db/schema';
 *
 * Usa Neon serverless driver via WebSocket Pool.
 * Compatible con Cloudflare Workers edge runtime y soporta transacciones.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/omegaread';

/** Pool Neon serverless (WebSocket) */
const pool = new Pool({ connectionString });

/** Instancia de Drizzle ORM con schema tipado */
export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Re-export schema
export * from './schema';
