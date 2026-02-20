/**
 * Tests para templates de prompts y configuracion por nivel.
 */
import { describe, it, expect } from 'vitest';
import {
  NIVELES_CONFIG,
  getNivelConfig,
  buildSystemPrompt,
  buildUserPrompt,
  type PromptInput,
} from '@/lib/ai/prompts';

describe('NIVELES_CONFIG', () => {
  it('tiene configuracion para niveles 1-4', () => {
    expect(NIVELES_CONFIG[1]).toBeDefined();
    expect(NIVELES_CONFIG[2]).toBeDefined();
    expect(NIVELES_CONFIG[3]).toBeDefined();
    expect(NIVELES_CONFIG[4]).toBeDefined();
  });

  it('cada nivel tiene palabrasMin < palabrasMax', () => {
    for (const nivel of [1, 2, 3, 4]) {
      const config = NIVELES_CONFIG[nivel];
      expect(config.palabrasMin).toBeLessThan(config.palabrasMax);
    }
  });

  it('longitud crece con el nivel', () => {
    for (const nivel of [1, 2, 3]) {
      expect(NIVELES_CONFIG[nivel].palabrasMax).toBeLessThanOrEqual(NIVELES_CONFIG[nivel + 1].palabrasMin * 1.5);
    }
  });

  it('tiempo esperado crece con el nivel', () => {
    for (const nivel of [1, 2, 3]) {
      expect(NIVELES_CONFIG[nivel].tiempoEsperadoMs).toBeLessThan(NIVELES_CONFIG[nivel + 1].tiempoEsperadoMs);
    }
  });

  it('todos tienen complejidad lexica definida', () => {
    for (const nivel of [1, 2, 3, 4]) {
      expect(NIVELES_CONFIG[nivel].complejidadLexica.length).toBeGreaterThan(10);
    }
  });
});

describe('getNivelConfig', () => {
  it('devuelve config exacta para niveles enteros', () => {
    expect(getNivelConfig(1)).toBe(NIVELES_CONFIG[1]);
    expect(getNivelConfig(4)).toBe(NIVELES_CONFIG[4]);
  });

  it('redondea niveles decimales', () => {
    expect(getNivelConfig(1.5)).toBe(NIVELES_CONFIG[2]);
    expect(getNivelConfig(2.3)).toBe(NIVELES_CONFIG[2]);
    expect(getNivelConfig(3.7)).toBe(NIVELES_CONFIG[4]);
  });

  it('clampea por debajo a nivel 1', () => {
    expect(getNivelConfig(0)).toBe(NIVELES_CONFIG[1]);
    expect(getNivelConfig(-1)).toBe(NIVELES_CONFIG[1]);
  });

  it('clampea por arriba a nivel 4', () => {
    expect(getNivelConfig(5)).toBe(NIVELES_CONFIG[4]);
    expect(getNivelConfig(10)).toBe(NIVELES_CONFIG[4]);
  });
});

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('menciona espanol', () => {
    expect(prompt.toLowerCase()).toContain('espanol');
  });

  it('menciona seguridad', () => {
    expect(prompt.toLowerCase()).toContain('segur');
  });

  it('menciona los 4 tipos de pregunta', () => {
    expect(prompt).toContain('LITERAL');
    expect(prompt).toContain('INFERENCIA');
    expect(prompt).toContain('VOCABULARIO');
    expect(prompt).toContain('RESUMEN');
  });

  it('menciona formato JSON', () => {
    expect(prompt).toContain('JSON');
  });
});

describe('buildUserPrompt', () => {
  const baseInput: PromptInput = {
    edadAnos: 7,
    nivel: 2,
    topicNombre: 'Animales',
    topicDescripcion: 'Historias sobre animales',
    intereses: ['deportes', 'ciencia'],
  };

  it('incluye edad del nino', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('7 anos');
  });

  it('incluye nivel de lectura', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('Nivel de lectura: 2');
  });

  it('incluye topic', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('Animales');
  });

  it('incluye limites de palabras del nivel', () => {
    const prompt = buildUserPrompt(baseInput);
    const config = getNivelConfig(2);
    expect(prompt).toContain(String(config.palabrasMin));
    expect(prompt).toContain(String(config.palabrasMax));
  });

  it('incluye intereses si hay', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('deportes');
    expect(prompt).toContain('ciencia');
  });

  it('no incluye personajes si no hay', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).not.toContain('Personajes favoritos');
  });

  it('incluye personajes si hay', () => {
    const prompt = buildUserPrompt({ ...baseInput, personajesFavoritos: 'Spider-Man' });
    expect(prompt).toContain('Spider-Man');
  });

  it('incluye formato JSON obligatorio', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('FORMATO JSON OBLIGATORIO');
    expect(prompt).toContain('"titulo"');
    expect(prompt).toContain('"contenido"');
    expect(prompt).toContain('"preguntas"');
  });
});
