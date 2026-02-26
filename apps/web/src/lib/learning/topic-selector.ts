/**
 * Topic/Skill selector - pure domain logic.
 *
 * Determines which skill a student should work on next based on
 * their age, interests, and progress. No I/O, no DB, no server directives.
 */
import {
  getSkillBySlug,
  getSkillsDeDominio,
  getSkillsPorEdad,
  type SkillDef,
} from '@/lib/data/skills';
import { recomendarSiguientesSkills, type SkillProgressLite } from '@/lib/learning/graph';
import {
  UMBRAL_SKILL_DOMINADA,
  esSkillDominada,
} from '@/lib/skills/progress';
import { inferirEstrategiaPedagogica, type TechTreeContext } from '@/lib/ai/prompts';
import type { InferSelectModel } from '@zetaread/db';
import { skillProgress } from '@zetaread/db';

type SkillProgressRow = InferSelectModel<typeof skillProgress>;

export const INTENTOS_MIN_REFORZAR = 3;

export function skillDesbloqueada(skill: SkillDef, map: Map<string, SkillProgressRow>): boolean {
  if (skill.prerequisitos.length === 0) return true;
  return skill.prerequisitos.every((req) => esSkillDominada(req, map));
}

export function ordenarSkillsPorRuta(a: SkillDef, b: SkillDef): number {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel;
  return a.orden - b.orden;
}

export function elegirSiguienteSkillTechTree(params: {
  edadAnos: number;
  intereses: string[];
  progresoMap: Map<string, SkillProgressRow>;
  skillActualSlug?: string;
  historialReciente?: string[];
}): SkillDef | undefined {
  const { edadAnos, intereses, progresoMap, skillActualSlug, historialReciente } = params;
  const skillsEdad = getSkillsPorEdad(edadAnos).sort(ordenarSkillsPorRuta);

  const progresoLite = new Map<string, SkillProgressLite>();
  for (const [slug, row] of progresoMap.entries()) {
    progresoLite.set(slug, {
      totalIntentos: row.totalIntentos,
      nivelMastery: row.nivelMastery,
      dominada: row.dominada,
    });
  }

  // Prioridad 1: recomendaciones del grafo (profundizar/conectar/aplicar/reforzar)
  const sugeridas = recomendarSiguientesSkills({
    edadAnos,
    intereses,
    progresoMap: progresoLite,
    skillActualSlug,
    recientes: historialReciente,
    limite: 5,
    soloDesbloqueadas: true,
  });
  for (const s of sugeridas) {
    const skill = getSkillBySlug(s.slug);
    if (!skill) continue;
    if (!skillsEdad.some((x) => x.slug === skill.slug)) continue;
    if (!skillDesbloqueada(skill, progresoMap)) continue;
    if (esSkillDominada(skill.slug, progresoMap)) continue;
    return skill;
  }

  const poolIntereses = skillsEdad.filter((s) => intereses.includes(s.dominio));
  const pools = poolIntereses.length > 0 ? [poolIntereses, skillsEdad] : [skillsEdad];

  for (const pool of pools) {
    const desbloqueadasPendientes = pool
      .filter((skill) => skillDesbloqueada(skill, progresoMap))
      .filter((skill) => !esSkillDominada(skill.slug, progresoMap))
      .sort(ordenarSkillsPorRuta);

    if (desbloqueadasPendientes.length > 0) {
      return desbloqueadasPendientes[0];
    }
  }

  return skillsEdad[0];
}

export function construirObjetivoSesion(skill: SkillDef, row: SkillProgressRow | undefined): string {
  if (!row || row.totalIntentos === 0) {
    return `Introducir el concepto de "${skill.nombre}" con un caso divertido y facil de recordar.`;
  }

  if (row.dominada || row.nivelMastery >= UMBRAL_SKILL_DOMINADA) {
    return `Consolidar "${skill.nombre}" con una aplicacion nueva para reforzar transferencia de aprendizaje.`;
  }

  if (row.totalIntentos >= INTENTOS_MIN_REFORZAR && row.nivelMastery < 0.6) {
    return `Reforzar bases de "${skill.nombre}" con ejemplos muy concretos y lenguaje sencillo.`;
  }

  return `Avanzar en "${skill.nombre}" aumentando un poco la dificultad sin perder claridad.`;
}

function filtrarSkillsRelacionadas(
  pool: SkillDef[],
  currentSlug: string,
  predicate: (slug: string, row: SkillProgressRow | undefined) => boolean,
  progresoMap: Map<string, SkillProgressRow>,
  limit: number = 3,
): string[] {
  return pool
    .filter((s) => s.slug !== currentSlug && predicate(s.slug, progresoMap.get(s.slug)))
    .slice(0, limit)
    .map((s) => s.nombre);
}

export function construirContextoTechTree(params: {
  skill: SkillDef;
  progresoMap: Map<string, SkillProgressRow>;
  edadAnos: number;
  nivel: number;
}): TechTreeContext {
  const { skill, progresoMap, edadAnos, nivel } = params;
  const skillsDominio = getSkillsDeDominio(skill.dominio).sort(ordenarSkillsPorRuta);

  const prerequisitosDominados = skill.prerequisitos
    .filter((req) => esSkillDominada(req, progresoMap))
    .map((req) => getSkillBySlug(req)?.nombre ?? req);

  const prerequisitosPendientes = skill.prerequisitos
    .filter((req) => !esSkillDominada(req, progresoMap))
    .map((req) => getSkillBySlug(req)?.nombre ?? req);

  const skillsDominadasRelacionadas = filtrarSkillsRelacionadas(
    skillsDominio,
    skill.slug,
    (slug) => esSkillDominada(slug, progresoMap),
    progresoMap,
  );

  const skillsEnProgresoRelacionadas = filtrarSkillsRelacionadas(
    skillsDominio,
    skill.slug,
    (slug, row) =>
      !!row &&
      row.totalIntentos > 0 &&
      !esSkillDominada(slug, progresoMap) &&
      row.nivelMastery >= 0.6,
    progresoMap,
  );

  const skillsAReforzarRelacionadas = filtrarSkillsRelacionadas(
    skillsDominio,
    skill.slug,
    (_slug, row) => !!row && row.totalIntentos >= INTENTOS_MIN_REFORZAR && row.nivelMastery < 0.6,
    progresoMap,
  );

  const siguienteSkillSugerida = skillsDominio
    .filter((s) => s.slug !== skill.slug)
    .filter((s) => skillDesbloqueada(s, progresoMap))
    .filter((s) => !esSkillDominada(s.slug, progresoMap))
    .sort(ordenarSkillsPorRuta)[0]?.nombre;

  const rowActual = progresoMap.get(skill.slug);

  return {
    skillSlug: skill.slug,
    skillNombre: skill.nombre,
    skillNivel: skill.nivel,
    objetivoSesion: construirObjetivoSesion(skill, rowActual),
    estrategia: inferirEstrategiaPedagogica(edadAnos, nivel),
    prerequisitosDominados,
    prerequisitosPendientes,
    skillsDominadasRelacionadas,
    skillsEnProgresoRelacionadas,
    skillsAReforzarRelacionadas,
    siguienteSkillSugerida,
  };
}
