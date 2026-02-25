/**
 * Helpers y constantes compartidos para progreso de skills.
 * Unica fuente de verdad para umbrales y normalizacion de skill IDs.
 */

import type { InferSelectModel } from '@omegaread/db';
import { skillProgress } from '@omegaread/db';
import type { SkillProgressLite } from '@/lib/learning/graph';

/** Porcentaje de dominio requerido para considerar un skill como dominado. */
export const UMBRAL_SKILL_DOMINADA = 0.85;

/**
 * Convierte un skill ID con prefijo "topic-" al slug canonico.
 * Devuelve `null` si el ID no tiene el prefijo esperado.
 * Ejemplo: "topic-cometas-y-asteroides" -> "cometas-y-asteroides"
 */
export function normalizarSkillSlug(skillId: string): string | null {
  return skillId.startsWith('topic-') ? skillId.slice('topic-'.length) : null;
}

/**
 * Comprueba si un skill esta dominado segun el umbral canonico.
 * Funciona tanto con filas completas de DB como con objetos lite.
 */
export function esSkillDominada(
  slug: string,
  map: Map<string, { nivelMastery: number; dominada: boolean }>,
): boolean {
  const row = map.get(slug);
  if (!row) return false;
  return row.dominada || row.nivelMastery >= UMBRAL_SKILL_DOMINADA;
}

type SkillProgressRow = InferSelectModel<typeof skillProgress>;

/**
 * Construye un mapa slug -> fila completa de DB a partir de filas de skillProgress.
 * Omite filas cuyo skillId no comience con "topic-".
 */
export function crearMapaProgresoCompleto(
  rows: SkillProgressRow[],
): Map<string, SkillProgressRow> {
  const map = new Map<string, SkillProgressRow>();
  for (const row of rows) {
    const slug = normalizarSkillSlug(row.skillId);
    if (!slug) continue;
    map.set(slug, row);
  }
  return map;
}

/**
 * Construye un mapa slug -> SkillProgressLite a partir de filas de skillProgress.
 * Omite filas cuyo skillId no comience con "topic-".
 */
export function crearMapaProgresoLite(
  rows: SkillProgressRow[],
): Map<string, SkillProgressLite> {
  const map = new Map<string, SkillProgressLite>();
  for (const row of rows) {
    const slug = normalizarSkillSlug(row.skillId);
    if (!slug) continue;
    map.set(slug, {
      totalIntentos: row.totalIntentos,
      nivelMastery: row.nivelMastery,
      dominada: row.dominada,
    });
  }
  return map;
}
