/**
 * Compatibilidad retroactiva para el catálogo de topics.
 *
 * Fuente única actual: `skills.ts`.
 * Este módulo mantiene solo lo que todavía consume el código:
 * `TOPICS_SEED` y su tipo.
 */

export type { TopicSeed } from './skills';
export { TOPICS_SEED } from './skills';
