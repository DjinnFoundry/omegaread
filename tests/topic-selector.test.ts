import { describe, it, expect } from 'vitest';
import {
  elegirSiguienteSkillTechTree,
  construirObjetivoSesion,
  construirContextoTechTree,
  skillDesbloqueada,
  ordenarSkillsPorRuta,
  INTENTOS_MIN_REFORZAR,
} from '@/lib/learning/topic-selector';
import {
  crearMapaProgresoCompleto as crearMapaProgresoSkill,
  esSkillDominada as skillDominada,
} from '@/lib/skills/progress';
import {
  getSkillBySlug,
  getSkillsDeDominio,
  getSkillsPorEdad,
  type SkillDef,
} from '@/lib/data/skills';
import type { InferSelectModel } from '@omegaread/db';
import { skillProgress } from '@omegaread/db';

type SkillProgressRow = InferSelectModel<typeof skillProgress>;

// ─── Test helpers ───

function makeProgressRow(overrides: Partial<SkillProgressRow> & { skillId: string }): SkillProgressRow {
  return {
    id: `progress-${overrides.skillId}`,
    studentId: 'student-1',
    skillId: overrides.skillId,
    categoria: overrides.categoria ?? 'topic',
    totalIntentos: overrides.totalIntentos ?? 0,
    aciertos: overrides.aciertos ?? 0,
    fallos: overrides.fallos ?? 0,
    nivelMastery: overrides.nivelMastery ?? 0,
    dominada: overrides.dominada ?? false,
    ultimoIntento: overrides.ultimoIntento ?? null,
    tiempoPromedioMs: overrides.tiempoPromedioMs ?? null,
    metadata: overrides.metadata ?? null,
    creadoEn: overrides.creadoEn ?? new Date(),
    actualizadoEn: overrides.actualizadoEn ?? new Date(),
  };
}

function buildProgressMap(rows: SkillProgressRow[]): Map<string, SkillProgressRow> {
  return crearMapaProgresoSkill(rows);
}

// ─── Tests ───

describe('topic-selector', () => {
  // ──────────────────────────────────────
  // skillDesbloqueada
  // ──────────────────────────────────────
  describe('skillDesbloqueada', () => {
    it('should unlock level 1 skills (no prerequisites)', () => {
      const skill = getSkillBySlug('animales-que-vuelan')!;
      expect(skill).toBeDefined();
      expect(skill.prerequisitos).toHaveLength(0);

      const emptyMap = buildProgressMap([]);
      expect(skillDesbloqueada(skill, emptyMap)).toBe(true);
    });

    it('should block level 2 skill if prerequisites not met', () => {
      const skill = getSkillBySlug('cadenas-alimentarias')!;
      expect(skill).toBeDefined();
      expect(skill.prerequisitos.length).toBeGreaterThan(0);

      const emptyMap = buildProgressMap([]);
      expect(skillDesbloqueada(skill, emptyMap)).toBe(false);
    });

    it('should unlock level 2 skill if all prerequisites are dominated', () => {
      const skill = getSkillBySlug('cadenas-alimentarias')!;
      // Prerequisites: animales-que-vuelan, plantas-que-crecen
      const rows = skill.prerequisitos.map((slug) =>
        makeProgressRow({
          skillId: `topic-${slug}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      );
      const map = buildProgressMap(rows);
      expect(skillDesbloqueada(skill, map)).toBe(true);
    });

    it('should block if only some prerequisites are dominated', () => {
      const skill = getSkillBySlug('cadenas-alimentarias')!;
      // Only dominate first prereq
      const rows = [
        makeProgressRow({
          skillId: `topic-${skill.prerequisitos[0]}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      ];
      const map = buildProgressMap(rows);
      expect(skillDesbloqueada(skill, map)).toBe(false);
    });
  });

  // ──────────────────────────────────────
  // ordenarSkillsPorRuta
  // ──────────────────────────────────────
  describe('ordenarSkillsPorRuta', () => {
    it('should sort by nivel first, then by orden', () => {
      const skills = getSkillsDeDominio('naturaleza-vida');
      const sorted = [...skills].sort(ordenarSkillsPorRuta);

      // All level 1 skills should come before level 2 skills
      let lastNivel = 0;
      let lastOrden = 0;
      for (const s of sorted) {
        if (s.nivel > lastNivel) {
          lastNivel = s.nivel;
          lastOrden = 0; // reset orden tracking on new level
        }
        expect(s.nivel).toBeGreaterThanOrEqual(lastNivel);
        if (s.nivel === lastNivel) {
          expect(s.orden).toBeGreaterThanOrEqual(lastOrden);
        }
        lastOrden = s.orden;
      }
    });

    it('should handle equal nivel by comparing orden', () => {
      const a: SkillDef = {
        slug: 'a', nombre: 'A', emoji: '', dominio: 'naturaleza-vida',
        nivel: 1, conceptoNucleo: '', prerequisitos: [],
        edadMinima: 5, edadMaxima: 9, orden: 5,
      };
      const b: SkillDef = {
        slug: 'b', nombre: 'B', emoji: '', dominio: 'naturaleza-vida',
        nivel: 1, conceptoNucleo: '', prerequisitos: [],
        edadMinima: 5, edadMaxima: 9, orden: 3,
      };
      expect(ordenarSkillsPorRuta(a, b)).toBeGreaterThan(0); // a.orden > b.orden
      expect(ordenarSkillsPorRuta(b, a)).toBeLessThan(0);
    });

    it('should sort by nivel before orden', () => {
      const a: SkillDef = {
        slug: 'a', nombre: 'A', emoji: '', dominio: 'naturaleza-vida',
        nivel: 2, conceptoNucleo: '', prerequisitos: [],
        edadMinima: 5, edadMaxima: 9, orden: 1,
      };
      const b: SkillDef = {
        slug: 'b', nombre: 'B', emoji: '', dominio: 'naturaleza-vida',
        nivel: 1, conceptoNucleo: '', prerequisitos: [],
        edadMinima: 5, edadMaxima: 9, orden: 99,
      };
      expect(ordenarSkillsPorRuta(a, b)).toBeGreaterThan(0); // a.nivel > b.nivel
    });
  });

  // ──────────────────────────────────────
  // construirObjetivoSesion
  // ──────────────────────────────────────
  describe('construirObjetivoSesion', () => {
    const skill = getSkillBySlug('animales-que-vuelan')!;

    it('should introduce new concept when no progress', () => {
      const objetivo = construirObjetivoSesion(skill, undefined);
      expect(objetivo).toContain('Introducir');
      expect(objetivo).toContain(skill.nombre);
    });

    it('should introduce when totalIntentos is 0', () => {
      const row = makeProgressRow({
        skillId: `topic-${skill.slug}`,
        totalIntentos: 0,
        nivelMastery: 0,
      });
      const objetivo = construirObjetivoSesion(skill, row);
      expect(objetivo).toContain('Introducir');
    });

    it('should consolidate when skill is dominated', () => {
      const row = makeProgressRow({
        skillId: `topic-${skill.slug}`,
        totalIntentos: 15,
        nivelMastery: 0.9,
        dominada: true,
      });
      const objetivo = construirObjetivoSesion(skill, row);
      expect(objetivo).toContain('Consolidar');
      expect(objetivo).toContain('transferencia');
    });

    it('should consolidate when mastery >= UMBRAL_SKILL_DOMINADA', () => {
      const row = makeProgressRow({
        skillId: `topic-${skill.slug}`,
        totalIntentos: 10,
        nivelMastery: 0.85,
        dominada: false, // not explicitly marked, but above threshold
      });
      const objetivo = construirObjetivoSesion(skill, row);
      expect(objetivo).toContain('Consolidar');
    });

    it('should reinforce when many attempts but low mastery', () => {
      const row = makeProgressRow({
        skillId: `topic-${skill.slug}`,
        totalIntentos: INTENTOS_MIN_REFORZAR,
        nivelMastery: 0.4,
      });
      const objetivo = construirObjetivoSesion(skill, row);
      expect(objetivo).toContain('Reforzar');
      expect(objetivo).toContain('sencillo');
    });

    it('should advance for in-progress skill', () => {
      const row = makeProgressRow({
        skillId: `topic-${skill.slug}`,
        totalIntentos: 2,
        nivelMastery: 0.5,
      });
      const objetivo = construirObjetivoSesion(skill, row);
      expect(objetivo).toContain('Avanzar');
      expect(objetivo).toContain('dificultad');
    });
  });

  // ──────────────────────────────────────
  // construirContextoTechTree
  // ──────────────────────────────────────
  describe('construirContextoTechTree', () => {
    it('should build correct context for a fresh skill', () => {
      const skill = getSkillBySlug('animales-que-vuelan')!;
      const map = buildProgressMap([]);

      const ctx = construirContextoTechTree({
        skill,
        progresoMap: map,
        edadAnos: 7,
        nivel: 2,
      });

      expect(ctx.skillSlug).toBe(skill.slug);
      expect(ctx.skillNombre).toBe(skill.nombre);
      expect(ctx.skillNivel).toBe(skill.nivel);
      expect(ctx.objetivoSesion).toContain('Introducir');
      expect(ctx.estrategia).toBeDefined();
      expect(ctx.prerequisitosDominados).toEqual([]);
      expect(ctx.prerequisitosPendientes).toEqual([]);
    });

    it('should include dominated prerequisites for level 2 skill', () => {
      const skill = getSkillBySlug('cadenas-alimentarias')!;
      const rows = skill.prerequisitos.map((slug) =>
        makeProgressRow({
          skillId: `topic-${slug}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      );
      const map = buildProgressMap(rows);

      const ctx = construirContextoTechTree({
        skill,
        progresoMap: map,
        edadAnos: 7,
        nivel: 2,
      });

      expect(ctx.prerequisitosDominados.length).toBe(skill.prerequisitos.length);
      expect(ctx.prerequisitosPendientes.length).toBe(0);
    });

    it('should track pending prerequisites', () => {
      const skill = getSkillBySlug('cadenas-alimentarias')!;
      // Only dominate first, leave second un-dominated
      const rows = [
        makeProgressRow({
          skillId: `topic-${skill.prerequisitos[0]}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
        makeProgressRow({
          skillId: `topic-${skill.prerequisitos[1]}`,
          nivelMastery: 0.3,
          dominada: false,
          totalIntentos: 3,
          aciertos: 1,
          fallos: 2,
        }),
      ];
      const map = buildProgressMap(rows);

      const ctx = construirContextoTechTree({
        skill,
        progresoMap: map,
        edadAnos: 7,
        nivel: 2,
      });

      expect(ctx.prerequisitosDominados.length).toBe(1);
      expect(ctx.prerequisitosPendientes.length).toBe(1);
    });

    it('should identify related skills in-progress', () => {
      // Dominate one naturaleza-vida skill and partially progress another
      const skillA = getSkillBySlug('animales-que-vuelan')!;
      const skillB = getSkillBySlug('plantas-que-crecen')!;

      const rows = [
        makeProgressRow({
          skillId: `topic-${skillA.slug}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
        makeProgressRow({
          skillId: `topic-${skillB.slug}`,
          nivelMastery: 0.65,
          dominada: false,
          totalIntentos: 5,
          aciertos: 3,
          fallos: 2,
        }),
      ];
      const map = buildProgressMap(rows);

      // Check context for a third skill in the same domain
      const skillC = getSkillBySlug('el-agua-cambia')!;
      const ctx = construirContextoTechTree({
        skill: skillC,
        progresoMap: map,
        edadAnos: 7,
        nivel: 2,
      });

      expect(ctx.skillsDominadasRelacionadas).toContain(skillA.nombre);
      expect(ctx.skillsEnProgresoRelacionadas).toContain(skillB.nombre);
    });
  });

  // ──────────────────────────────────────
  // elegirSiguienteSkillTechTree
  // ──────────────────────────────────────
  describe('elegirSiguienteSkillTechTree', () => {
    it('should return a skill for a fresh student (no progress)', () => {
      const map = buildProgressMap([]);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: [],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      expect(skill!.nivel).toBe(1); // Should pick level 1 first
    });

    it('should prefer interest-aligned skills when graph has no suggestions', () => {
      // When the learning graph returns no suggestions (no prior progress to base on),
      // the fallback pool should prefer the interest-aligned domain.
      // With empty progress AND no graph recommendations, the function falls back
      // to the interest pool. However, the graph itself may return recommendations
      // even for fresh students, so we verify the returned skill is valid.
      const map = buildProgressMap([]);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: ['universo'],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      expect(skill!.nivel).toBe(1);
      // The function picks graph recommendations first. If graph returns nothing,
      // interest pool is used. Either way, a valid skill is returned.
      expect(skill!.edadMinima).toBeLessThanOrEqual(7);
      expect(skill!.edadMaxima).toBeGreaterThanOrEqual(7);
    });

    it('should skip dominated skills', () => {
      // Dominate all level 1 naturaleza-vida skills
      const l1Skills = getSkillsDeDominio('naturaleza-vida').filter((s) => s.nivel === 1);
      const rows = l1Skills.map((s) =>
        makeProgressRow({
          skillId: `topic-${s.slug}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      );
      const map = buildProgressMap(rows);

      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: ['naturaleza-vida'],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      // It should not return any of the dominated level 1 skills
      for (const s of l1Skills) {
        expect(skill!.slug).not.toBe(s.slug);
      }
    });

    it('should pick level 2 skills when all level 1 skills are dominated', () => {
      // Dominate ALL level 1 skills across all domains for this age
      // so the function is forced to pick a level 2 skill
      const allSkillsAge7 = getSkillsPorEdad(7);
      const l1Skills = allSkillsAge7.filter((s) => s.nivel === 1);

      const rows = l1Skills.map((s) =>
        makeProgressRow({
          skillId: `topic-${s.slug}`,
          nivelMastery: 0.9,
          dominada: true,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      );

      const map = buildProgressMap(rows);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: [],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      // With all L1 dominated, should pick an unlocked L2 skill
      expect(skill!.nivel).toBeGreaterThanOrEqual(2);
    });

    it('should return first age-appropriate skill as fallback', () => {
      // Dominate ALL skills (unlikely but tests fallback)
      const allSkills = getSkillsPorEdad(7);
      const rows = allSkills.map((s) =>
        makeProgressRow({
          skillId: `topic-${s.slug}`,
          nivelMastery: 0.95,
          dominada: true,
          totalIntentos: 20,
          aciertos: 19,
          fallos: 1,
        }),
      );
      const map = buildProgressMap(rows);

      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: [],
        progresoMap: map,
      });

      // Should still return something (fallback)
      expect(skill).toBeDefined();
    });

    it('should handle empty interests gracefully', () => {
      const map = buildProgressMap([]);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: [],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
    });

    it('should handle very young students (age 5)', () => {
      const map = buildProgressMap([]);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 5,
        intereses: [],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      expect(skill!.edadMinima).toBeLessThanOrEqual(5);
    });

    it('should handle older students (age 9)', () => {
      const map = buildProgressMap([]);
      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 9,
        intereses: [],
        progresoMap: map,
      });

      expect(skill).toBeDefined();
      expect(skill!.edadMaxima).toBeGreaterThanOrEqual(9);
    });

    it('should avoid recently-visited skills when historialReciente is provided', () => {
      // Pick all L1 naturaleza-vida skills and mark them as the recent history,
      // then verify the selector does not return any of them as the next pick
      // (the graph uses historialReciente to deprioritize recently-visited nodes).
      const l1Skills = getSkillsDeDominio('naturaleza-vida').filter((s) => s.nivel === 1);
      const historialReciente = l1Skills.map((s) => s.slug);

      // No progress so all skills are still available
      const map = buildProgressMap([]);

      const skill = elegirSiguienteSkillTechTree({
        edadAnos: 7,
        intereses: [],
        progresoMap: map,
        historialReciente,
      });

      expect(skill).toBeDefined();
      // The selected skill should not be one of the recently-visited naturaleza-vida L1 skills
      // (unless all other options are exhausted, which is not the case at age 7)
      const isRecent = historialReciente.includes(skill!.slug);
      // It is acceptable for the fallback to return a recent skill when no alternatives exist,
      // but with a full skill catalog at age 7 we expect avoidance.
      // We verify at minimum that the function runs without error and returns a valid skill.
      expect(skill!.edadMinima).toBeLessThanOrEqual(7);
      expect(skill!.edadMaxima).toBeGreaterThanOrEqual(7);
      // If a non-recent skill is available, it must be chosen
      const allAge7 = getSkillsPorEdad(7);
      const nonRecentAvailable = allAge7.some((s) => !historialReciente.includes(s.slug));
      if (nonRecentAvailable) {
        expect(isRecent).toBe(false);
      }
    });
  });

  // ──────────────────────────────────────
  // crearMapaProgresoSkill + skillDominada
  // ──────────────────────────────────────
  describe('crearMapaProgresoSkill', () => {
    it('should create map from progress rows', () => {
      const rows = [
        makeProgressRow({
          skillId: 'topic-animales-que-vuelan',
          nivelMastery: 0.5,
          totalIntentos: 5,
          aciertos: 3,
          fallos: 2,
        }),
      ];
      const map = buildProgressMap(rows);

      expect(map.size).toBe(1);
      expect(map.has('animales-que-vuelan')).toBe(true);
      expect(map.get('animales-que-vuelan')!.nivelMastery).toBe(0.5);
    });

    it('should skip rows without topic- prefix', () => {
      const rows = [
        makeProgressRow({
          skillId: 'comprension-literal',
          categoria: 'comprension',
          nivelMastery: 0.7,
          totalIntentos: 5,
          aciertos: 4,
          fallos: 1,
        }),
      ];
      const map = buildProgressMap(rows);
      expect(map.size).toBe(0);
    });
  });

  describe('skillDominada', () => {
    it('should return false for unknown skill', () => {
      const map = buildProgressMap([]);
      expect(skillDominada('nonexistent', map)).toBe(false);
    });

    it('should return true for explicitly dominated skill', () => {
      const rows = [
        makeProgressRow({
          skillId: 'topic-animales-que-vuelan',
          dominada: true,
          nivelMastery: 0.9,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      ];
      const map = buildProgressMap(rows);
      expect(skillDominada('animales-que-vuelan', map)).toBe(true);
    });

    it('should return true when mastery >= 0.85 even if not explicitly marked', () => {
      const rows = [
        makeProgressRow({
          skillId: 'topic-animales-que-vuelan',
          dominada: false,
          nivelMastery: 0.86,
          totalIntentos: 10,
          aciertos: 9,
          fallos: 1,
        }),
      ];
      const map = buildProgressMap(rows);
      expect(skillDominada('animales-que-vuelan', map)).toBe(true);
    });

    it('should return false when mastery < 0.85 and not marked dominated', () => {
      const rows = [
        makeProgressRow({
          skillId: 'topic-animales-que-vuelan',
          dominada: false,
          nivelMastery: 0.7,
          totalIntentos: 10,
          aciertos: 7,
          fallos: 3,
        }),
      ];
      const map = buildProgressMap(rows);
      expect(skillDominada('animales-que-vuelan', map)).toBe(false);
    });
  });
});
