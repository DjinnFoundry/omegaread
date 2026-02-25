/**
 * Tests de integridad de datos para skills e interest tags.
 *
 * Verifica:
 * 1. Unicidad de slugs
 * 2. Coherencia de prerequisitos
 * 3. Validez de rangos de edad
 * 4. Cobertura de funciones helpers
 * 5. Integridad de etiquetas de intereses
 */
import { describe, it, expect } from 'vitest';
import {
  DOMINIOS,
  getSkillBySlug,
  getSkillsDeDominio,
  getSkillsPorEdad,
  getAllSkills,
} from '@/lib/data/skills';
import { INTEREST_TAGS } from '@/lib/data/interest-tags';

// ─────────────────────────────────────────────
// Skills: Unicidad
// ─────────────────────────────────────────────

describe('Skills data integrity', () => {
  // Get all skills once for the suite
  const SKILLS_DATA = getAllSkills();

  describe('Unicidad de slugs', () => {
    it('todos los skill slugs son unicos', () => {
      const slugs = SKILLS_DATA.map((s) => s.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    it('no hay slugs vacios', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.slug).toBeTruthy();
        expect(skill.slug.length).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Skills: Prerequisitos
  // ─────────────────────────────────────────────

  describe('Validez de prerequisitos', () => {
    it('todos los prerequisitos referencian slugs validos', () => {
      const slugsValidos = new Set(SKILLS_DATA.map((s) => s.slug));
      for (const skill of SKILLS_DATA) {
        for (const prereq of skill.prerequisitos) {
          expect(slugsValidos.has(prereq)).toBe(true);
        }
      }
    });

    it('nivel 1 skills tienen prerequisitos vacios', () => {
      const skillsNivel1 = SKILLS_DATA.filter((s) => s.nivel === 1);
      for (const skill of skillsNivel1) {
        expect(skill.prerequisitos.length).toBe(0);
      }
    });

    it('nivel 2+ skills tienen al menos 1 prerequisito', () => {
      const skillsNivel2Plus = SKILLS_DATA.filter((s) => s.nivel >= 2);
      for (const skill of skillsNivel2Plus) {
        expect(skill.prerequisitos.length).toBeGreaterThan(0);
      }
    });

    it('nivel 2 skills tienen exactamente 2 prerequisitos', () => {
      const skillsNivel2 = SKILLS_DATA.filter((s) => s.nivel === 2);
      for (const skill of skillsNivel2) {
        expect(skill.prerequisitos.length).toBe(2);
      }
    });

    it('nivel 3 skills tienen exactamente 2 prerequisitos', () => {
      const skillsNivel3 = SKILLS_DATA.filter((s) => s.nivel === 3);
      for (const skill of skillsNivel3) {
        expect(skill.prerequisitos.length).toBe(2);
      }
    });

    it('los prerequisitos de nivel 2 son skills de nivel 1 del mismo dominio (mayoria)', () => {
      const skillsNivel2 = SKILLS_DATA.filter((s) => s.nivel === 2);
      let valid = 0;
      let total = 0;

      for (const skill of skillsNivel2) {
        for (const prereqSlug of skill.prerequisitos) {
          total++;
          const prereq = SKILLS_DATA.find((s) => s.slug === prereqSlug);
          expect(prereq).toBeDefined();
          if (prereq!.nivel === 1 && prereq!.dominio === skill.dominio) {
            valid++;
          }
        }
      }
      // Most nivel 2 skills should follow the pattern, but allow some exceptions
      expect(valid / total).toBeGreaterThan(0.8);
    });

    it('los prerequisitos de nivel 3 son skills de nivel <= 3', () => {
      const skillsNivel3 = SKILLS_DATA.filter((s) => s.nivel === 3);

      for (const skill of skillsNivel3) {
        expect(skill.prerequisitos.length).toBeGreaterThan(0);
        for (const prereqSlug of skill.prerequisitos) {
          const prereq = SKILLS_DATA.find((s) => s.slug === prereqSlug);
          expect(prereq).toBeDefined();
          // Nivel 3 puede depender de otros skills del catalogo
          expect([1, 2, 3]).toContain(prereq!.nivel);
        }
      }
    });
  });

  // ─────────────────────────────────────────────
  // Skills: Edad
  // ─────────────────────────────────────────────

  describe('Validez de rangos de edad', () => {
    it('todos los skills tienen edadMinima <= edadMaxima', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.edadMinima).toBeLessThanOrEqual(skill.edadMaxima);
      }
    });

    it('todos los skills tienen edadMinima >= 3', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.edadMinima).toBeGreaterThanOrEqual(3);
      }
    });

    it('todos los skills tienen edadMaxima <= 12', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.edadMaxima).toBeLessThanOrEqual(12);
      }
    });

    it('nivel 3 skills tienen edadMinima >= 7', () => {
      const skillsNivel3 = SKILLS_DATA.filter((s) => s.nivel === 3);
      for (const skill of skillsNivel3) {
        expect(skill.edadMinima).toBeGreaterThanOrEqual(7);
      }
    });

    it('nivel 1 y 2 skills cubren edades 5-9', () => {
      const skills12 = SKILLS_DATA.filter((s) => s.nivel < 3);
      const edades = [5, 6, 7, 8, 9];
      for (const edad of edades) {
        const disponible = skills12.some(
          (s) => s.edadMinima <= edad && edad <= s.edadMaxima,
        );
        expect(disponible).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Skills: Helpers
  // ─────────────────────────────────────────────

  describe('Funciones helper de skills', () => {
    it('getSkillBySlug retorna skill correcto', () => {
      const skill = SKILLS_DATA[0];
      const result = getSkillBySlug(skill.slug);
      expect(result).toBeDefined();
      expect(result!.slug).toBe(skill.slug);
      expect(result!.nombre).toBe(skill.nombre);
    });

    it('getSkillBySlug retorna undefined para slug desconocido', () => {
      const result = getSkillBySlug('skill-que-no-existe-nunca');
      expect(result).toBeUndefined();
    });

    it('getSkillsDeDominio retorna skills del dominio correcto', () => {
      const dominio = DOMINIOS[0].slug;
      const skills = getSkillsDeDominio(dominio);
      expect(skills.length).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(skill.dominio).toBe(dominio);
      }
    });

    it('getSkillsDeDominio retorna array vacio para dominio invalido', () => {
      const skills = getSkillsDeDominio('dominio-inventado' as any);
      expect(skills).toEqual([]);
    });

    it('getSkillsPorEdad retorna solo skills en rango de edad', () => {
      const edad = 6;
      const skills = getSkillsPorEdad(edad);
      expect(skills.length).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(skill.edadMinima).toBeLessThanOrEqual(edad);
        expect(skill.edadMaxima).toBeGreaterThanOrEqual(edad);
      }
    });

    it('getSkillsPorEdad(5) retorna skills para edad minima', () => {
      const skills = getSkillsPorEdad(5);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('getSkillsPorEdad(9) retorna skills para edad maxima de catalogo base', () => {
      const skills = getSkillsPorEdad(9);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('getSkillsPorEdad retorna array vacio para edad fuera de rango', () => {
      const skills = getSkillsPorEdad(3);
      expect(skills.length).toBe(0);
    });

    it('getAllSkills retorna todos los skills', () => {
      const skills = getAllSkills();
      expect(skills.length).toBe(SKILLS_DATA.length);
    });

    it('getAllSkills retorna array no vacio', () => {
      const skills = getAllSkills();
      expect(skills.length).toBeGreaterThan(0);
    });

    it('getAllSkills no retorna referencias mutables', () => {
      const skills1 = getAllSkills();
      const skills2 = getAllSkills();
      expect(skills1).not.toBe(skills2);
      expect(skills1).toEqual(skills2);
    });
  });

  // ─────────────────────────────────────────────
  // Skills: Campos obligatorios
  // ─────────────────────────────────────────────

  describe('Validez de campos de skills', () => {
    it('todos los skills tienen nombre no vacio', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.nombre).toBeTruthy();
        expect(skill.nombre.length).toBeGreaterThan(0);
      }
    });

    it('todos los skills tienen emoji', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.emoji).toBeTruthy();
        expect(skill.emoji.length).toBeGreaterThan(0);
      }
    });

    it('todos los skills tienen dominio valido', () => {
      const dominios = new Set(DOMINIOS.map((d) => d.slug));
      for (const skill of SKILLS_DATA) {
        expect(dominios.has(skill.dominio)).toBe(true);
      }
    });

    it('todos los skills tienen nivel 1, 2 o 3', () => {
      for (const skill of SKILLS_DATA) {
        expect([1, 2, 3]).toContain(skill.nivel);
      }
    });

    it('todos los skills tienen conceptoNucleo no vacio', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.conceptoNucleo).toBeTruthy();
        expect(skill.conceptoNucleo.length).toBeGreaterThan(0);
      }
    });

    it('todos los skills tienen orden > 0', () => {
      for (const skill of SKILLS_DATA) {
        expect(skill.orden).toBeGreaterThan(0);
      }
    });

    it('los ordenes son secuenciales sin huecos', () => {
      const ordenes = SKILLS_DATA.map((s) => s.orden).sort((a, b) => a - b);
      for (let i = 0; i < ordenes.length; i++) {
        expect(ordenes[i]).toBe(i + 1);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Dominios
  // ─────────────────────────────────────────────

  describe('Validez de dominios', () => {
    it('todos los dominios tienen slug unico', () => {
      const slugs = DOMINIOS.map((d) => d.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('cada dominio tiene al menos 3 skills (nivel 1+2+3)', () => {
      for (const dominio of DOMINIOS) {
        const skillsDelDominio = SKILLS_DATA.filter((s) => s.dominio === dominio.slug);
        expect(skillsDelDominio.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('cada dominio tiene nombre no vacio', () => {
      for (const dominio of DOMINIOS) {
        expect(dominio.nombre).toBeTruthy();
      }
    });

    it('cada dominio tiene emoji', () => {
      for (const dominio of DOMINIOS) {
        expect(dominio.emoji).toBeTruthy();
      }
    });

    it('cada dominio tiene nombreNiveles con exactamente 3 elementos', () => {
      for (const dominio of DOMINIOS) {
        expect(dominio.nombreNiveles).toHaveLength(3);
        for (const nombre of dominio.nombreNiveles) {
          expect(nombre).toBeTruthy();
        }
      }
    });
  });
});

// ─────────────────────────────────────────────
// Interest Tags
// ─────────────────────────────────────────────

describe('Interest tags data integrity', () => {
  describe('Unicidad de slugs', () => {
    it('todos los tag slugs son unicos', () => {
      const slugs = INTEREST_TAGS.map((t) => t.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('no hay slugs vacios', () => {
      for (const tag of INTEREST_TAGS) {
        expect(tag.slug).toBeTruthy();
        expect(tag.slug.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Validez de grupos', () => {
    it('todos los tags tienen grupo 1, 2 o 3', () => {
      for (const tag of INTEREST_TAGS) {
        expect([1, 2, 3]).toContain(tag.grupo);
      }
    });

    it('cada grupo tiene al menos 5 tags', () => {
      for (const grupo of [1, 2, 3]) {
        const tagsDelGrupo = INTEREST_TAGS.filter((t) => t.grupo === grupo);
        expect(tagsDelGrupo.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('grupo 1 (personalidad) tiene 7 tags', () => {
      const grupo1 = INTEREST_TAGS.filter((t) => t.grupo === 1);
      expect(grupo1.length).toBe(7);
    });

    it('grupo 2 (actividades) tiene al menos 7 tags', () => {
      const grupo2 = INTEREST_TAGS.filter((t) => t.grupo === 2);
      expect(grupo2.length).toBeGreaterThanOrEqual(7);
    });

    it('grupo 3 (intereses) tiene al menos 10 tags', () => {
      const grupo3 = INTEREST_TAGS.filter((t) => t.grupo === 3);
      expect(grupo3.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Campos obligatorios', () => {
    it('todos los tags tienen label no vacio', () => {
      for (const tag of INTEREST_TAGS) {
        expect(tag.label).toBeTruthy();
        expect(tag.label.length).toBeGreaterThan(0);
      }
    });

    it('todos los tags tienen emoji', () => {
      for (const tag of INTEREST_TAGS) {
        expect(tag.emoji).toBeTruthy();
        expect(tag.emoji.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Total de tags', () => {
    it('hay al menos 20 tags en total', () => {
      expect(INTEREST_TAGS.length).toBeGreaterThanOrEqual(20);
    });

    it('suma de tags por grupo = total de tags', () => {
      const grupo1 = INTEREST_TAGS.filter((t) => t.grupo === 1).length;
      const grupo2 = INTEREST_TAGS.filter((t) => t.grupo === 2).length;
      const grupo3 = INTEREST_TAGS.filter((t) => t.grupo === 3).length;
      expect(grupo1 + grupo2 + grupo3).toBe(INTEREST_TAGS.length);
    });
  });
});
