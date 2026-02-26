/**
 * Tests de integridad de datos de Sprint 1.
 *
 * Verifica:
 * 1. Topics: estructura, unicidad, cobertura de edad
 * 2. Baseline texts: estructura, progresion de dificultad, preguntas
 * 3. Schema: nuevas tablas y columnas exportadas
 * 4. Server actions: exports de nuevas acciones
 */
import { describe, it, expect } from 'vitest';
import { TOPICS_SEED } from '@/lib/data/skills';
import { BASELINE_TEXTS } from '@/lib/data/baseline-texts';
import { TIPOS_PREGUNTA } from '@/lib/types/reading';

// ─────────────────────────────────────────────
// TOPICS
// ─────────────────────────────────────────────

describe('Topics seed data', () => {
  it('tiene al menos 10 topics', () => {
    expect(TOPICS_SEED.length).toBeGreaterThanOrEqual(10);
  });

  it('todos los slugs son unicos', () => {
    const slugs = TOPICS_SEED.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('todos tienen campos requeridos', () => {
    for (const topic of TOPICS_SEED) {
      expect(topic.slug).toBeTruthy();
      expect(topic.nombre).toBeTruthy();
      expect(topic.emoji).toBeTruthy();
      expect(topic.descripcion).toBeTruthy();
      expect(topic.edadMinima).toBeGreaterThanOrEqual(3);
      expect(topic.edadMaxima).toBeLessThanOrEqual(12);
      expect(topic.edadMinima).toBeLessThanOrEqual(topic.edadMaxima);
      expect(topic.orden).toBeGreaterThan(0);
    }
  });

  it('cubren el rango 5-9 anos (al menos 8 topics disponibles)', () => {
    const para5a9 = TOPICS_SEED.filter((t) => t.edadMinima <= 5 && t.edadMaxima >= 9);
    expect(para5a9.length).toBeGreaterThanOrEqual(8);
  });

  it('orden es secuencial sin huecos', () => {
    const ordenes = TOPICS_SEED.map((t) => t.orden).sort((a, b) => a - b);
    for (let i = 0; i < ordenes.length; i++) {
      expect(ordenes[i]).toBe(i + 1);
    }
  });
});

// ─────────────────────────────────────────────
// BASELINE TEXTS
// ─────────────────────────────────────────────

describe('Baseline texts', () => {
  it('tiene exactamente 4 textos', () => {
    expect(BASELINE_TEXTS).toHaveLength(4);
  });

  it('niveles van de 1 a 4 en orden', () => {
    const niveles = BASELINE_TEXTS.map((t) => t.nivel);
    expect(niveles).toEqual([1, 2, 3, 4]);
  });

  it('cada texto tiene id unico', () => {
    const ids = BASELINE_TEXTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dificultad crece: textos mas largos a mayor nivel', () => {
    for (let i = 1; i < BASELINE_TEXTS.length; i++) {
      expect(BASELINE_TEXTS[i].palabras).toBeGreaterThan(BASELINE_TEXTS[i - 1].palabras);
    }
  });

  it('tiempoEsperadoMs crece con el nivel', () => {
    for (let i = 1; i < BASELINE_TEXTS.length; i++) {
      expect(BASELINE_TEXTS[i].tiempoEsperadoMs).toBeGreaterThan(
        BASELINE_TEXTS[i - 1].tiempoEsperadoMs,
      );
    }
  });

  it('cada texto tiene 3-4 preguntas', () => {
    for (const texto of BASELINE_TEXTS) {
      expect(texto.preguntas.length).toBeGreaterThanOrEqual(3);
      expect(texto.preguntas.length).toBeLessThanOrEqual(4);
    }
  });

  it('cada pregunta tiene tipo valido', () => {
    for (const texto of BASELINE_TEXTS) {
      for (const pregunta of texto.preguntas) {
        expect(TIPOS_PREGUNTA).toContain(pregunta.tipo);
      }
    }
  });

  it('cada pregunta tiene 4 opciones', () => {
    for (const texto of BASELINE_TEXTS) {
      for (const pregunta of texto.preguntas) {
        expect(pregunta.opciones).toHaveLength(4);
      }
    }
  });

  it('respuestaCorrecta es indice valido', () => {
    for (const texto of BASELINE_TEXTS) {
      for (const pregunta of texto.preguntas) {
        expect(pregunta.respuestaCorrecta).toBeGreaterThanOrEqual(0);
        expect(pregunta.respuestaCorrecta).toBeLessThan(pregunta.opciones.length);
      }
    }
  });

  it('cada pregunta tiene id unico dentro del texto', () => {
    for (const texto of BASELINE_TEXTS) {
      const ids = texto.preguntas.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('niveles 3 y 4 incluyen pregunta de resumen', () => {
    for (const texto of BASELINE_TEXTS.filter((t) => t.nivel >= 3)) {
      const tieneResumen = texto.preguntas.some((p) => p.tipo === 'resumen');
      expect(tieneResumen).toBe(true);
    }
  });

  it('todos los textos tienen al menos literal, inferencia y vocabulario', () => {
    for (const texto of BASELINE_TEXTS) {
      const tipos = new Set(texto.preguntas.map((p) => p.tipo));
      expect(tipos.has('literal')).toBe(true);
      expect(tipos.has('inferencia')).toBe(true);
      expect(tipos.has('vocabulario')).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// SCHEMA EXPORTS
// ─────────────────────────────────────────────

describe('Schema exports (Sprint 1 tables)', () => {
  it('exporta tablas nuevas desde @zetaread/db', async () => {
    const schema = await import('@zetaread/db');
    expect(schema.topics).toBeDefined();
    expect(schema.baselineAssessments).toBeDefined();
    expect(schema.difficultyAdjustments).toBeDefined();
  });

  it('students tiene campos nuevos de Sprint 1', async () => {
    const schema = await import('@zetaread/db');
    const cols = schema.students;
    // Verificar que las columnas existen en la definicion
    expect(cols.curso).toBeDefined();
    expect(cols.centroEscolar).toBeDefined();
    expect(cols.rutinaLectura).toBeDefined();
    expect(cols.acompanamiento).toBeDefined();
    expect(cols.senalesDificultad).toBeDefined();
    expect(cols.temasEvitar).toBeDefined();
    expect(cols.personajesFavoritos).toBeDefined();
    expect(cols.nivelLectura).toBeDefined();
    expect(cols.comprensionScore).toBeDefined();
    expect(cols.baselineConfianza).toBeDefined();
    expect(cols.baselineCompletado).toBeDefined();
    expect(cols.perfilCompleto).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// SERVER ACTIONS EXPORTS (Sprint 1)
// ─────────────────────────────────────────────

describe('Server actions Sprint 1 exports', () => {
  it('profile-actions exporta funciones esperadas', async () => {
    const mod = await import('@/server/actions/profile-actions');
    expect(typeof mod.actualizarPerfilEstudiante).toBe('function');
    expect(typeof mod.guardarIntereses).toBe('function');
  });

  it('baseline-actions exporta funciones esperadas', async () => {
    const mod = await import('@/server/actions/baseline-actions');
    expect(typeof mod.guardarRespuestaBaseline).toBe('function');
    expect(typeof mod.finalizarBaseline).toBe('function');
  });

  it('reading-actions exporta funciones esperadas', async () => {
    const mod = await import('@/server/actions/reading-actions');
    expect(typeof mod.crearSesionLectura).toBe('function');
    expect(typeof mod.registrarRespuestaComprension).toBe('function');
    expect(typeof mod.calcularAjusteDificultad).toBe('function');
  });

  it('lectura-flow-actions exporta obtenerEstadoLectura', async () => {
    const mod = await import('@/server/actions/lectura-flow-actions');
    expect(typeof mod.obtenerEstadoLectura).toBe('function');
  });
});
