/**
 * Tests para scoring de baseline y formulas de sesion.
 *
 * Verifica:
 * 1. calcularBaseline con distintos escenarios
 * 2. calcularSessionScore con formula v1
 * 3. determinarAjuste con umbrales
 */
import { describe, it, expect } from 'vitest';
import {
  calcularBaseline,
  calcularSessionScore,
  determinarAjuste,
  PESOS_SESSION_SCORE,
} from '@/lib/types/reading';

// ─────────────────────────────────────────────
// calcularBaseline
// ─────────────────────────────────────────────

describe('calcularBaseline', () => {
  it('devuelve nivel 1 con confianza baja para 1 texto', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
    ]);

    expect(result.nivelLectura).toBe(1);
    expect(result.confianza).toBe('bajo');
    expect(result.textosCompletados).toBe(1);
  });

  it('devuelve nivel correcto para 4 textos con buen rendimiento', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 0 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 0, vocabulario: 1, resumen: 0 } },
    ]);

    expect(result.confianza).toBe('alto');
    expect(result.textosCompletados).toBe(4);
    // Nivel 3 tiene 75% (>= 60%), nivel 4 tiene 50% (< 60%)
    expect(result.nivelLectura).toBe(3);
  });

  it('suma 0.5 si acierta >= 80% en el nivel mas alto aprobado', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 4, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 1 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 1, aciertosPorTipo: { literal: 1, inferencia: 0, vocabulario: 0, resumen: 0 } },
    ]);

    // Nivel 3 con 100% -> nivel 3.5
    expect(result.nivelLectura).toBe(3.5);
  });

  it('devuelve confianza medio para 3 textos', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 1, aciertosPorTipo: { literal: 1 } },
    ]);

    expect(result.confianza).toBe('medio');
  });

  it('calcula comprensionScore global correctamente', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 0, aciertosPorTipo: { literal: 0, inferencia: 0, vocabulario: 0 } },
    ]);

    // 3/6 = 0.5
    expect(result.comprensionScore).toBe(0.5);
  });

  it('maneja array vacio sin errores', () => {
    const result = calcularBaseline([]);
    expect(result.nivelLectura).toBe(1);
    expect(result.confianza).toBe('bajo');
    expect(result.comprensionScore).toBe(0);
    expect(result.textosCompletados).toBe(0);
  });

  it('nunca supera nivel 4', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 4, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 1 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 4, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 1 } },
    ]);

    expect(result.nivelLectura).toBeLessThanOrEqual(4);
  });

  it('acumula aciertos por tipo correctamente', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 0, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 1, aciertosPorTipo: { literal: 0, inferencia: 1, vocabulario: 0 } },
    ]);

    expect(result.aciertosPorTipo.literal).toEqual({ total: 2, aciertos: 1 });
    expect(result.aciertosPorTipo.inferencia).toEqual({ total: 2, aciertos: 1 });
  });
});

// ─────────────────────────────────────────────
// calcularSessionScore
// ─────────────────────────────────────────────

describe('calcularSessionScore', () => {
  it('devuelve 1.0 con valores perfectos', () => {
    const score = calcularSessionScore({
      comprension: 1.0,
      ritmoNormalizado: 1.0,
      estabilidad: 1.0,
    });
    expect(score).toBe(1.0);
  });

  it('devuelve 0 con valores cero', () => {
    const score = calcularSessionScore({
      comprension: 0,
      ritmoNormalizado: 0,
      estabilidad: 0,
    });
    expect(score).toBe(0);
  });

  it('aplica pesos correctamente', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmoNormalizado: 0.6,
      estabilidad: 0.5,
    });

    const esperado = 0.65 * 0.8 + 0.25 * 0.6 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('comprension tiene el mayor peso (0.65)', () => {
    expect(PESOS_SESSION_SCORE.comprension).toBe(0.65);
    expect(PESOS_SESSION_SCORE.ritmo).toBe(0.25);
    expect(PESOS_SESSION_SCORE.estabilidad).toBe(0.10);
  });

  it('los pesos suman 1.0', () => {
    const total = PESOS_SESSION_SCORE.comprension +
      PESOS_SESSION_SCORE.ritmo +
      PESOS_SESSION_SCORE.estabilidad;
    expect(total).toBe(1.0);
  });
});

// ─────────────────────────────────────────────
// determinarAjuste
// ─────────────────────────────────────────────

describe('determinarAjuste', () => {
  it('sube con comprension >= 80%', () => {
    expect(determinarAjuste(0.80)).toBe('subir');
    expect(determinarAjuste(0.95)).toBe('subir');
    expect(determinarAjuste(1.0)).toBe('subir');
  });

  it('mantiene con comprension 60-79%', () => {
    expect(determinarAjuste(0.60)).toBe('mantener');
    expect(determinarAjuste(0.70)).toBe('mantener');
    expect(determinarAjuste(0.79)).toBe('mantener');
  });

  it('baja con comprension < 60%', () => {
    expect(determinarAjuste(0.59)).toBe('bajar');
    expect(determinarAjuste(0.30)).toBe('bajar');
    expect(determinarAjuste(0)).toBe('bajar');
  });

  it('maneja valores limite exactos', () => {
    expect(determinarAjuste(0.80)).toBe('subir');
    expect(determinarAjuste(0.60)).toBe('mantener');
    expect(determinarAjuste(0.599)).toBe('bajar');
  });
});

// ─────────────────────────────────────────────
// calcularSessionScore: Legacy fields support
// ─────────────────────────────────────────────

describe('calcularSessionScore - Legacy fields support', () => {
  it('usa ritmoNormalizado cuando se pasa', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmoNormalizado: 0.6,
      estabilidad: 0.5,
    });

    const esperado = 0.65 * 0.8 + 0.25 * 0.6 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('usa ritmo como fallback cuando ritmoNormalizado no esta', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmo: 0.6,
      estabilidad: 0.5,
    });

    const esperado = 0.65 * 0.8 + 0.25 * 0.6 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('usa wpmRatio como fallback legacy', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      wpmRatio: 0.6,
      estabilidad: 0.5,
    });

    const esperado = 0.65 * 0.8 + 0.25 * 0.6 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('usa ritmoMejora como fallback legacy', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmoMejora: 0.6,
      estabilidad: 0.5,
    });

    const esperado = 0.65 * 0.8 + 0.25 * 0.6 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('ritmoNormalizado toma prioridad sobre wpmRatio', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmoNormalizado: 0.7,
      wpmRatio: 0.5,
      estabilidad: 0.5,
    });

    // Deberia usar ritmoNormalizado (0.7), no wpmRatio (0.5)
    const esperado = 0.65 * 0.8 + 0.25 * 0.7 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });

  it('ritmo toma prioridad sobre wpmRatio cuando ritmoNormalizado no esta', () => {
    const score = calcularSessionScore({
      comprension: 0.8,
      ritmo: 0.7,
      wpmRatio: 0.5,
      estabilidad: 0.5,
    });

    // Deberia usar ritmo (0.7), no wpmRatio (0.5)
    const esperado = 0.65 * 0.8 + 0.25 * 0.7 + 0.10 * 0.5;
    expect(score).toBe(Math.round(esperado * 100) / 100);
  });
});

// ─────────────────────────────────────────────
// calcularBaseline: Casos extremos de accuracy
// ─────────────────────────────────────────────

describe('calcularBaseline - Casos extremos de accuracy', () => {
  it('mantiene nivel 1 cuando TODOS los textos tienen < 60% accuracy', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 2, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
    ]);

    // Todos tienen 50% accuracy, el maximo aprobado sigue siendo nivel 1
    expect(result.nivelLectura).toBe(1);
  });

  it('se queda en nivel alcanzado aunque haya visto textos mas dificiles', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 4, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 4, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 2, aciertosPorTipo: { literal: 1, inferencia: 1 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 0, aciertosPorTipo: {} },
    ]);

    // El maximo donde acierto >= 60% es nivel 2
    expect(result.nivelLectura).toBe(2);
  });
});

// ─────────────────────────────────────────────
// calcularBaseline: Capping en nivel 4
// ─────────────────────────────────────────────

describe('calcularBaseline - Capping en nivel 4', () => {
  it('esta capeado en nivel 4 aunque acierte 100% en nivel 4', () => {
    const result = calcularBaseline([
      { nivelTexto: 1, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 2, totalPreguntas: 3, aciertos: 3, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1 } },
      { nivelTexto: 3, totalPreguntas: 4, aciertos: 4, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 1 } },
      { nivelTexto: 4, totalPreguntas: 4, aciertos: 4, aciertosPorTipo: { literal: 1, inferencia: 1, vocabulario: 1, resumen: 1 } },
    ]);

    // Aunque acierte 100% en nivel 4, el resultado esta capeado a nivel 4 (o 4.5)
    expect(result.nivelLectura).toBeLessThanOrEqual(4);
  });
});
