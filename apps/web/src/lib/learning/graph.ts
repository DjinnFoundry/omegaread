/**
 * Grafo de aprendizaje: recomendaciones de siguiente nodo con logica
 * de profundizar / conectar / aplicar.
 */

import {
  DOMINIOS,
  getAllSkills,
  getSkillBySlug,
  type DominioSlug,
  type SkillDef,
} from '@/lib/data/skills';
import { UMBRAL_SKILL_DOMINADA } from '@/lib/skills/progress';

export interface SkillProgressLite {
  totalIntentos: number;
  nivelMastery: number;
  dominada: boolean;
}

export interface LearningSuggestion {
  slug: string;
  nombre: string;
  emoji: string;
  dominio: DominioSlug;
  tipo: 'profundizar' | 'conectar' | 'aplicar' | 'reforzar';
  motivo: string;
  puntaje: number;
}

const GRAFO_PROFUNDIZAR: Record<string, string[]> = {
  'cometas-y-asteroides': ['cometa-halley', 'planetas-detalle', 'telescopios'],
  'cometa-halley': ['edmond-halley', 'grandes-exploradores'],
  'grandes-exploradores': ['viaje-de-colon', 'expedicion-de-pizarro', 'inventos-que-cambiaron'],
  'la-gravedad': ['cometas-y-asteroides', 'planetas-detalle', 'galaxias'],
  'sistema-solar': ['cometas-y-asteroides', 'planetas-detalle', 'la-gravedad'],
  'como-aprendemos': ['sueno-y-memoria', 'emociones-en-el-cuerpo', 'el-cerebro'],
};

const GRAFO_APLICAR: Record<string, string[]> = {
  'cometas-y-asteroides': ['que-son-mapas', 'grandes-exploradores'],
  'cometa-halley': ['edmond-halley', 'lineas-del-tiempo'],
  'grandes-exploradores': ['que-son-mapas', 'planetas-detalle'],
  'las-emociones': ['emociones-en-el-cuerpo', 'como-aprendemos'],
  'la-gravedad': ['fuerzas-empujar-jalar', 'estructuras-puentes'],
};

function dominioInteresado(dominio: DominioSlug, intereses: string[]): boolean {
  return intereses.includes(dominio);
}

function keyRecent(recientes: string[]): Set<string> {
  return new Set(recientes.slice(0, 6));
}

function skillDominada(slug: string, progresoMap: Map<string, SkillProgressLite>): boolean {
  const row = progresoMap.get(slug);
  if (!row) return false;
  return row.dominada || row.nivelMastery >= UMBRAL_SKILL_DOMINADA;
}

function skillDesbloqueada(skill: SkillDef, progresoMap: Map<string, SkillProgressLite>): boolean {
  if (skill.prerequisitos.length === 0) return true;
  return skill.prerequisitos.every((req) => skillDominada(req, progresoMap));
}

function addCandidate(
  map: Map<string, LearningSuggestion>,
  skill: SkillDef | undefined,
  candidate: LearningSuggestion,
) {
  if (!skill) return;
  const existing = map.get(skill.slug);
  if (!existing || candidate.puntaje > existing.puntaje) {
    map.set(skill.slug, candidate);
  }
}

export function recomendarSiguientesSkills(params: {
  edadAnos: number;
  intereses: string[];
  progresoMap: Map<string, SkillProgressLite>;
  skillActualSlug?: string;
  recientes?: string[];
  limite?: number;
  soloDesbloqueadas?: boolean;
}): LearningSuggestion[] {
  const {
    edadAnos,
    intereses,
    progresoMap,
    skillActualSlug,
    recientes = [],
    limite = 5,
    soloDesbloqueadas = true,
  } = params;

  const skills = getAllSkills().filter((s) => edadAnos >= s.edadMinima && edadAnos <= s.edadMaxima);
  const skillBySlug = new Map(skills.map((s) => [s.slug, s]));
  const current = skillActualSlug ? skillBySlug.get(skillActualSlug) : undefined;
  const recentlySeen = keyRecent(recientes);

  const candidates = new Map<string, LearningSuggestion>();

  // 1) Profundizar desde nodo actual (hijos por prerequisito + edges manuales).
  if (current) {
    const children = skills.filter((s) => s.prerequisitos.includes(current.slug));
    for (const child of children) {
      const score = 55
        + (dominioInteresado(child.dominio, intereses) ? 15 : 0)
        - (recentlySeen.has(child.slug) ? 20 : 0);
      addCandidate(candidates, child, {
        slug: child.slug,
        nombre: child.nombre,
        emoji: child.emoji,
        dominio: child.dominio,
        tipo: 'profundizar',
        motivo: `Profundizar en ${current.nombre}`,
        puntaje: score,
      });
    }

    for (const slug of GRAFO_PROFUNDIZAR[current.slug] ?? []) {
      const target = skillBySlug.get(slug);
      if (!target) continue;
      const score = 62
        + (dominioInteresado(target.dominio, intereses) ? 12 : 0)
        - (recentlySeen.has(target.slug) ? 18 : 0);
      addCandidate(candidates, target, {
        slug: target.slug,
        nombre: target.nombre,
        emoji: target.emoji,
        dominio: target.dominio,
        tipo: 'profundizar',
        motivo: `Siguiente paso natural desde ${current.nombre}`,
        puntaje: score,
      });
    }
  }

  // 2) Conectar con skills del mismo dominio.
  if (current) {
    const sameDomain = skills.filter((s) => s.dominio === current.dominio && s.slug !== current.slug);
    for (const s of sameDomain) {
      const row = progresoMap.get(s.slug);
      const score = 40
        + (row && row.totalIntentos > 0 && row.nivelMastery < 0.6 ? 18 : 0)
        + (dominioInteresado(s.dominio, intereses) ? 10 : 0)
        - (recentlySeen.has(s.slug) ? 14 : 0)
        - (skillDominada(s.slug, progresoMap) ? 18 : 0);
      addCandidate(candidates, s, {
        slug: s.slug,
        nombre: s.nombre,
        emoji: s.emoji,
        dominio: s.dominio,
        tipo: row && row.totalIntentos > 0 && row.nivelMastery < 0.6 ? 'reforzar' : 'conectar',
        motivo: row && row.totalIntentos > 0 && row.nivelMastery < 0.6
          ? `Refuerzo recomendado en ${s.nombre}`
          : `Conectar con ${DOMINIOS.find((d) => d.slug === s.dominio)?.nombre ?? 'el mismo dominio'}`,
        puntaje: score,
      });
    }
  }

  // 3) Aplicar en otro dominio (puentes).
  if (current) {
    for (const slug of GRAFO_APLICAR[current.slug] ?? []) {
      const target = skillBySlug.get(slug);
      if (!target) continue;
      const score = 46
        + (dominioInteresado(target.dominio, intereses) ? 12 : 0)
        - (recentlySeen.has(target.slug) ? 12 : 0);
      addCandidate(candidates, target, {
        slug: target.slug,
        nombre: target.nombre,
        emoji: target.emoji,
        dominio: target.dominio,
        tipo: 'aplicar',
        motivo: `Aplicar lo aprendido en un contexto nuevo`,
        puntaje: score,
      });
    }
  }

  // 4) Fallback global: desbloqueadas pendientes por intereses.
  const pendientes = skills
    .filter((s) => !skillDominada(s.slug, progresoMap))
    .filter((s) => !recentlySeen.has(s.slug))
    .sort((a, b) => a.nivel - b.nivel || a.orden - b.orden);

  for (const p of pendientes.slice(0, 12)) {
    const score = 30 + (dominioInteresado(p.dominio, intereses) ? 14 : 0);
    addCandidate(candidates, p, {
      slug: p.slug,
      nombre: p.nombre,
      emoji: p.emoji,
      dominio: p.dominio,
      tipo: 'conectar',
      motivo: 'Siguiente nodo recomendado por progresion curricular',
      puntaje: score,
    });
  }

  let result = Array.from(candidates.values())
    .filter((c) => c.slug !== skillActualSlug)
    .filter((c) => {
      const skill = getSkillBySlug(c.slug);
      if (!skill) return false;
      if (!soloDesbloqueadas) return true;
      return skillDesbloqueada(skill, progresoMap);
    })
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite);

  if (result.length === 0 && !soloDesbloqueadas) {
    result = Array.from(candidates.values()).sort((a, b) => b.puntaje - a.puntaje).slice(0, limite);
  }

  return result;
}
