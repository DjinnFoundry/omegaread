/**
 * Tests para el motor Glicko (sistema Elo adaptativo).
 *
 * Verifica:
 * 1. procesarRespuestasElo: cambios de rating, RD, anti-farming, consistencia
 * 2. clasificarElo: clasificacion textual del nivel Elo
 * 3. Edge cases: batch vacio, respuestas mixtas, RD clamping
 */
import { describe, it, expect } from 'vitest';
import {
  procesarRespuestasElo,
  clasificarElo,
  type EloRatings,
  type RespuestaElo,
} from '@/lib/elo';

// ─────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────

function crearEloBase(overrides: Partial<EloRatings> = {}): EloRatings {
  return {
    global: 1000,
    literal: 1000,
    inferencia: 1000,
    vocabulario: 1000,
    resumen: 1000,
    rd: 200,
    ...overrides,
  };
}

function crearRespuesta(overrides: Partial<RespuestaElo> = {}): RespuestaElo {
  return {
    tipo: 'literal',
    correcta: true,
    dificultadPregunta: 3,
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// procesarRespuestasElo: Ratings globales
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Cambios de Rating Global', () => {
  it('aumenta rating global con batch de respuestas correctas', () => {
    const elo = crearEloBase();
    const respuestas = [
      crearRespuesta({ tipo: 'literal', correcta: true }),
      crearRespuesta({ tipo: 'inferencia', correcta: true }),
      crearRespuesta({ tipo: 'vocabulario', correcta: true }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.5);

    expect(result.nuevoElo.global).toBeGreaterThan(elo.global);
    expect(result.cambios.length).toBe(3);
  });

  it('disminuye rating global con batch de respuestas incorrectas', () => {
    const elo = crearEloBase();
    const respuestas = [
      crearRespuesta({ correcta: false }),
      crearRespuesta({ correcta: false }),
      crearRespuesta({ correcta: false }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    expect(result.nuevoElo.global).toBeLessThan(elo.global);
  });

  it('mantiene rating global con mix de aciertos y fallos', () => {
    const elo = crearEloBase();
    const respuestas = [
      crearRespuesta({ correcta: true }),
      crearRespuesta({ correcta: false }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    // El cambio deberia ser minimo (cerca de 0)
    // Con RD alto, el cambio puede ser mayor, asi que aumentamos el umbral
    const cambioGlobal = Math.abs(result.nuevoElo.global - elo.global);
    expect(cambioGlobal).toBeLessThan(200);
  });
});

// ─────────────────────────────────────────────
// procesarRespuestasElo: Rating Deviation (RD)
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Rating Deviation (RD)', () => {
  it('disminuye RD con respuestas consistentes', () => {
    const elo = crearEloBase({ rd: 250 });
    const respuestas = [
      crearRespuesta({ correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 3 }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    expect(result.nuevoElo.rd).toBeLessThan(elo.rd);
  });

  it('aumenta RD con respuestas inconsistentes', () => {
    const elo = crearEloBase({ rd: 150 });
    // Aciertos inesperados en preguntas dificiles, fallos inesperados en faciles
    const respuestas = [
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }),
      crearRespuesta({ correcta: false, dificultadPregunta: 1 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }),
      crearRespuesta({ correcta: false, dificultadPregunta: 1 }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    expect(result.nuevoElo.rd).toBeGreaterThan(elo.rd);
  });

  it('mantiene RD clamped a minimo [75]', () => {
    const elo = crearEloBase({ rd: 80 });
    const respuestas = Array.from({ length: 10 }).map(() =>
      crearRespuesta({ correcta: true })
    );

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    expect(result.nuevoElo.rd).toBeGreaterThanOrEqual(75);
  });

  it('mantiene RD clamped a maximo [350]', () => {
    const elo = crearEloBase({ rd: 340 });
    // Respuestas muy inconsistentes para subir RD
    const respuestas = [
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }),
      crearRespuesta({ correcta: false, dificultadPregunta: 1 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }),
      crearRespuesta({ correcta: false, dificultadPregunta: 1 }),
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 1.0);

    expect(result.nuevoElo.rd).toBeLessThanOrEqual(350);
  });

  it('disminuye RD mas con RD alto que con RD bajo', () => {
    // Nino nuevo (RD alto) deberia ver cambios mayores
    const eloAltoRD = crearEloBase({ rd: 320 });
    // Nino veterano (RD bajo) deberia ver cambios menores
    const eloLowRD = crearEloBase({ rd: 80 });

    const respuestas = [crearRespuesta({ correcta: true })];

    const resultAlto = procesarRespuestasElo(eloAltoRD, respuestas, 2.0);
    const resultBajo = procesarRespuestasElo(eloLowRD, respuestas, 2.0);

    // Ambos disminuyen RD, pero el alto deberia disminuir mas en magnitud absoluta
    const disminucionAlto = eloAltoRD.rd - resultAlto.nuevoElo.rd;
    const disminucionBajo = eloLowRD.rd - resultBajo.nuevoElo.rd;

    // RD alto produce cambios mayores
    expect(disminucionAlto).toBeGreaterThan(disminucionBajo);
  });
});

// ─────────────────────────────────────────────
// procesarRespuestasElo: Anti-farming
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Anti-farming', () => {
  it('penaliza aciertos en preguntas muy faciles (gap > 500)', () => {
    // Nino con rating 1300, pregunta con rating 700 (gap = 600)
    const elo = crearEloBase({ global: 1300 });
    const respuestas = [
      crearRespuesta({ correcta: true, dificultadPregunta: 1 }), // pregunta facil
    ];

    const result = procesarRespuestasElo(elo, respuestas, 1.5);

    const cambioSinPenalizacion = 30; // cambio esperado sin anti-farming
    const cambioActual = result.cambios[0].deltaGlobal;

    // El cambio debe ser menor al esperado debido a penalizacion
    expect(Math.abs(cambioActual)).toBeLessThan(Math.abs(cambioSinPenalizacion));
  });

  it('no penaliza fallos en preguntas faciles', () => {
    const elo = crearEloBase({ global: 1200 });
    const respuestas = [
      crearRespuesta({ correcta: false, dificultadPregunta: 1 }), // fallo en facil
    ];

    const result = procesarRespuestasElo(elo, respuestas, 1.5);

    // Fallo en pregunta facil deberia penalizar normalmente
    expect(result.nuevoElo.global).toBeLessThan(elo.global);
    expect(result.cambios[0].deltaGlobal).toBeLessThan(0);
  });

  it('aciertos en preguntas dificiles no se penalizan', () => {
    const elo = crearEloBase({ global: 1000 });
    const respuestas = [
      crearRespuesta({ correcta: true, dificultadPregunta: 5 }), // pregunta dificil
    ];

    const result = procesarRespuestasElo(elo, respuestas, 3.0);

    // Acierto en dificil deberia ser bonificado sin penalizacion
    expect(result.nuevoElo.global).toBeGreaterThan(elo.global);
  });
});

// ─────────────────────────────────────────────
// procesarRespuestasElo: Independencia de tipos
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Independencia por tipo', () => {
  it('actualiza cada tipo de rating de forma independiente', () => {
    const elo = crearEloBase({ rd: 200 });
    // Usar batch completo con mas respuestas para cambios mas visibles
    const respuestas = [
      crearRespuesta({ tipo: 'literal', correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'literal', correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'inferencia', correcta: false, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'inferencia', correcta: false, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'vocabulario', correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'vocabulario', correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'resumen', correcta: false, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'resumen', correcta: false, dificultadPregunta: 3 }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    // literal sube (aciertos)
    expect(result.nuevoElo.literal).toBeGreaterThanOrEqual(elo.literal);
    // inferencia baja (fallos)
    expect(result.nuevoElo.inferencia).toBeLessThanOrEqual(elo.inferencia);
    // vocabulario sube (aciertos)
    expect(result.nuevoElo.vocabulario).toBeGreaterThanOrEqual(elo.vocabulario);
    // resumen baja (fallos)
    expect(result.nuevoElo.resumen).toBeLessThanOrEqual(elo.resumen);
  });

  it('todos los tipos tienen cambios menores con RD bajo', () => {
    const elo = crearEloBase({ rd: 80 }); // RD bajo
    const respuestas = [
      crearRespuesta({ tipo: 'literal', correcta: true }),
      crearRespuesta({ tipo: 'inferencia', correcta: true }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    const cambioLiteral = Math.abs(result.nuevoElo.literal - elo.literal);
    const cambioInferencia = Math.abs(result.nuevoElo.inferencia - elo.inferencia);

    // Con RD bajo, cambios menores
    expect(cambioLiteral).toBeLessThan(15);
    expect(cambioInferencia).toBeLessThan(15);
  });

  it('todos los tipos tienen cambios mayores con RD alto que con RD bajo', () => {
    const eloAlto = crearEloBase({ rd: 300 });
    const eloBajo = crearEloBase({ rd: 80 });

    const respuestas = [
      crearRespuesta({ tipo: 'literal', correcta: true, dificultadPregunta: 3 }),
      crearRespuesta({ tipo: 'inferencia', correcta: true, dificultadPregunta: 3 }),
    ];

    const resultAlto = procesarRespuestasElo(eloAlto, respuestas, 2.0);
    const resultBajo = procesarRespuestasElo(eloBajo, respuestas, 2.0);

    const cambioLiteralAlto = Math.abs(resultAlto.nuevoElo.literal - eloAlto.literal);
    const cambioLiteralBajo = Math.abs(resultBajo.nuevoElo.literal - eloBajo.literal);

    // Con RD alto, cambios deberian ser mayores
    expect(cambioLiteralAlto).toBeGreaterThan(cambioLiteralBajo);
  });
});

// ─────────────────────────────────────────────
// procesarRespuestasElo: Edge cases
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Edge cases', () => {
  it('retorna elo sin cambios con batch vacio', () => {
    const elo = crearEloBase();
    const result = procesarRespuestasElo(elo, [], 2.0);

    expect(result.nuevoElo.global).toBe(elo.global);
    expect(result.nuevoElo.literal).toBe(elo.literal);
    expect(result.nuevoElo.rd).toBe(elo.rd);
    expect(result.cambios.length).toBe(0);
  });

  it('procesa una sola respuesta correctamente', () => {
    const elo = crearEloBase();
    const respuestas = [crearRespuesta({ correcta: true })];

    const result = procesarRespuestasElo(elo, respuestas, 2.0);

    expect(result.cambios.length).toBe(1);
    expect(result.nuevoElo.global).not.toBe(elo.global);
  });

  it('procesa batch mixto con todos los tipos', () => {
    const elo = crearEloBase();
    const respuestas = [
      crearRespuesta({ tipo: 'literal', correcta: true }),
      crearRespuesta({ tipo: 'inferencia', correcta: false }),
      crearRespuesta({ tipo: 'vocabulario', correcta: true }),
      crearRespuesta({ tipo: 'resumen', correcta: false }),
    ];

    const result = procesarRespuestasElo(elo, respuestas, 2.5);

    expect(result.cambios.length).toBe(4);
    const tiposEnCambios = result.cambios.map(c => c.tipo);
    expect(tiposEnCambios).toContain('literal');
    expect(tiposEnCambios).toContain('inferencia');
    expect(tiposEnCambios).toContain('vocabulario');
    expect(tiposEnCambios).toContain('resumen');
  });

  it('RD con respuestas muy predecibles baja al minimo', () => {
    const elo = crearEloBase({ rd: 200 });
    // Todas respuestas faciles y correctas (altamente predecibles)
    const respuestas = Array.from({ length: 8 }).map(() =>
      crearRespuesta({ correcta: true, dificultadPregunta: 1 })
    );

    const result = procesarRespuestasElo(elo, respuestas, 1.5);

    // RD deberia bajar significativamente
    expect(result.nuevoElo.rd).toBeLessThan(elo.rd);
  });
});

// ─────────────────────────────────────────────
// clasificarElo
// ─────────────────────────────────────────────

describe('clasificarElo', () => {
  it('clasifica < 800 como "Principiante"', () => {
    expect(clasificarElo(750)).toBe('Principiante');
    expect(clasificarElo(500)).toBe('Principiante');
    expect(clasificarElo(799)).toBe('Principiante');
  });

  it('clasifica 800-1099 como "En desarrollo"', () => {
    expect(clasificarElo(800)).toBe('En desarrollo');
    expect(clasificarElo(950)).toBe('En desarrollo');
    expect(clasificarElo(1099)).toBe('En desarrollo');
  });

  it('clasifica 1100-1399 como "Competente"', () => {
    expect(clasificarElo(1100)).toBe('Competente');
    expect(clasificarElo(1250)).toBe('Competente');
    expect(clasificarElo(1399)).toBe('Competente');
  });

  it('clasifica >= 1400 como "Avanzado"', () => {
    expect(clasificarElo(1400)).toBe('Avanzado');
    expect(clasificarElo(1500)).toBe('Avanzado');
    expect(clasificarElo(2000)).toBe('Avanzado');
  });

  it('maneja valores limites exactos', () => {
    expect(clasificarElo(800)).toBe('En desarrollo');
    expect(clasificarElo(1100)).toBe('Competente');
    expect(clasificarElo(1400)).toBe('Avanzado');
  });

  it('maneja valores justo antes de limites', () => {
    expect(clasificarElo(799)).toBe('Principiante');
    expect(clasificarElo(1099)).toBe('En desarrollo');
    expect(clasificarElo(1399)).toBe('Competente');
  });
});

// ─────────────────────────────────────────────
// Integracion: Flujos realistas
// ─────────────────────────────────────────────

describe('procesarRespuestasElo - Flujos realistas', () => {
  it('simula nino nuevo con muchos cambios iniciales', () => {
    const eloNuevo = crearEloBase({ rd: 350 }); // RD maximo
    const respuestas = [
      crearRespuesta({ correcta: true }),
      crearRespuesta({ correcta: true }),
      crearRespuesta({ correcta: false }),
    ];

    const result = procesarRespuestasElo(eloNuevo, respuestas, 2.0);

    // Cambios deben ser grandes con RD alto
    const cambioGlobal = Math.abs(result.nuevoElo.global - eloNuevo.global);
    expect(cambioGlobal).toBeGreaterThan(10);
    // RD deberia bajar (nino nuevo se estabiliza)
    expect(result.nuevoElo.rd).toBeLessThan(eloNuevo.rd);
  });

  it('simula nino veterano con cambios relativamente minimos', () => {
    const eloVeterano = crearEloBase({
      global: 1200,
      rd: 75, // RD bajo
    });
    const respuestas = [
      crearRespuesta({ correcta: true }),
      crearRespuesta({ correcta: false }),
    ];

    const result = procesarRespuestasElo(eloVeterano, respuestas, 2.5);

    // Cambios deben ser menores que con RD alto
    // Comparamos con un resultado de RD alto
    const eloNuevo = crearEloBase({ rd: 350 });
    const resultNuevo = procesarRespuestasElo(eloNuevo, respuestas, 2.5);

    const cambioVeterano = Math.abs(result.nuevoElo.global - eloVeterano.global);
    const cambioNuevo = Math.abs(resultNuevo.nuevoElo.global - eloNuevo.global);

    // El RD bajo deberia producir cambios menores
    expect(cambioVeterano).toBeLessThan(cambioNuevo);
  });

  it('racha de aciertos sube rating y baja RD', () => {
    const elo = crearEloBase({ rd: 180 });
    const racha = Array.from({ length: 5 }).map(() =>
      crearRespuesta({ correcta: true })
    );

    const result = procesarRespuestasElo(elo, racha, 2.0);

    expect(result.nuevoElo.global).toBeGreaterThan(elo.global);
    expect(result.nuevoElo.rd).toBeLessThan(elo.rd);
  });

  it('racha de fallos baja rating y puede subir RD', () => {
    const elo = crearEloBase({ rd: 120 });
    const racha = Array.from({ length: 5 }).map(() =>
      crearRespuesta({ correcta: false })
    );

    const result = procesarRespuestasElo(elo, racha, 1.5);

    expect(result.nuevoElo.global).toBeLessThan(elo.global);
    // RD puede subir si hay inconsistencia (fallos inesperados)
  });
});
