/**
 * Seed script para sincronizar la tabla topics con TOPICS_SEED.
 * Ejecutar: pnpm db:seed-topics
 *
 * Comportamiento:
 * - Inserta topics nuevos (por slug)
 * - Actualiza topics existentes si cambiaron
 * - Desactiva topics que ya no estan en TOPICS_SEED
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { topics } from './schema';

// Importar desde la app (path relativo al monorepo)
// El script se ejecuta con tsx que resuelve los paths
const TOPICS_SEED = (await import('../../apps/web/src/lib/data/topics')).TOPICS_SEED;

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/omegaread';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function seed() {
  console.log(`Sincronizando ${TOPICS_SEED.length} topics...`);

  const result = await db.transaction(async (tx) => {
    const existentes = await tx.select().from(topics);
    const existentesPorSlug = new Map(existentes.map(t => [t.slug, t]));

    let insertados = 0;
    let actualizados = 0;
    let desactivados = 0;

    for (const topic of TOPICS_SEED) {
      const existente = existentesPorSlug.get(topic.slug);

      if (!existente) {
        await tx.insert(topics).values({
          slug: topic.slug,
          nombre: topic.nombre,
          emoji: topic.emoji,
          descripcion: topic.descripcion,
          categoria: topic.categoria,
          edadMinima: topic.edadMinima,
          edadMaxima: topic.edadMaxima,
          activo: true,
          orden: topic.orden,
        });
        insertados++;
      } else {
        const necesitaUpdate =
          existente.nombre !== topic.nombre ||
          existente.emoji !== topic.emoji ||
          existente.descripcion !== topic.descripcion ||
          existente.categoria !== topic.categoria ||
          existente.orden !== topic.orden ||
          !existente.activo;

        if (necesitaUpdate) {
          await tx
            .update(topics)
            .set({
              nombre: topic.nombre,
              emoji: topic.emoji,
              descripcion: topic.descripcion,
              categoria: topic.categoria,
              edadMinima: topic.edadMinima,
              edadMaxima: topic.edadMaxima,
              activo: true,
              orden: topic.orden,
            })
            .where(eq(topics.id, existente.id));
          actualizados++;
        }
      }
    }

    // Desactivar topics que ya no estan en TOPICS_SEED
    const slugsActuales = new Set(TOPICS_SEED.map(t => t.slug));
    for (const existente of existentes) {
      if (!slugsActuales.has(existente.slug) && existente.activo) {
        await tx
          .update(topics)
          .set({ activo: false })
          .where(eq(topics.id, existente.id));
        desactivados++;
      }
    }

    return { insertados, actualizados, desactivados };
  });

  console.log(`Insertados: ${result.insertados}, Actualizados: ${result.actualizados}, Desactivados: ${result.desactivados}`);
  await pool.end();
}

seed().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
