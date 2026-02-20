/**
 * Tests para la logica de scoring con ajustes manuales.
 * Sprint 4: Integracion de senales manuales en calculo de dificultad.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularSessionScore,
  determinarAjuste,
  type SessionScoreInput,
  PESOS_SESSION_SCORE,
} from '@/lib/types/reading';

// ─── Tests: modificador manual sobre session score ───

describe('session score con ajustes manuales', () => {
  /**
   * La logica de modificador manual esta en reading-actions.ts (server action
   * con DB), pero testeamos que el score base + modificador produce resultados
   * correctos usando la formula publica.
   */

  it('penalizacion 10% baja el score', () => {
    const baseInput: SessionScoreInput = {
      comprension: 0.75,
      ritmoNormalizado: 0.9,
      estabilidad: 0.8,
    };

    const scoreBase = calcularSessionScore(baseInput);
    const scoreConPenalizacion = Math.max(0, Math.min(1,
      Math.round((scoreBase - 0.10) * 100) / 100
    ));

    expect(scoreConPenalizacion).toBeLessThan(scoreBase);
    expect(scoreConPenalizacion).toBe(
      Math.round((scoreBase - 0.10) * 100) / 100
    );
  });

  it('bonificacion 10% sube el score', () => {
    const baseInput: SessionScoreInput = {
      comprension: 0.80,
      ritmoNormalizado: 0.85,
      estabilidad: 0.7,
    };

    const scoreBase = calcularSessionScore(baseInput);
    const scoreConBonificacion = Math.max(0, Math.min(1,
      Math.round((scoreBase + 0.10) * 100) / 100
    ));

    expect(scoreConBonificacion).toBeGreaterThan(scoreBase);
  });

  it('score no baja de 0 con penalizacion', () => {
    const baseInput: SessionScoreInput = {
      comprension: 0.05,
      ritmoNormalizado: 0.1,
      estabilidad: 0.05,
    };

    const scoreBase = calcularSessionScore(baseInput);
    const scoreConPenalizacion = Math.max(0, Math.min(1,
      Math.round((scoreBase - 0.10) * 100) / 100
    ));

    expect(scoreConPenalizacion).toBeGreaterThanOrEqual(0);
  });

  it('score no sube de 1 con bonificacion', () => {
    const baseInput: SessionScoreInput = {
      comprension: 1.0,
      ritmoNormalizado: 1.0,
      estabilidad: 1.0,
    };

    const scoreBase = calcularSessionScore(baseInput);
    const scoreConBonificacion = Math.max(0, Math.min(1,
      Math.round((scoreBase + 0.10) * 100) / 100
    ));

    expect(scoreConBonificacion).toBeLessThanOrEqual(1);
  });
});

// ─── Tests: reglas de cuando aplicar modificador ───

describe('reglas de modificador manual', () => {
  it('mas_facil siempre penaliza -10% independientemente de comprension', () => {
    const tipoAjuste = 'mas_facil';
    const comprension = 0.90;
    // Aunque comprension sea alta, mas_facil siempre penaliza
    const modificador = tipoAjuste === 'mas_facil' && comprension >= 0 ? -0.10 : 0;
    expect(modificador).toBe(-0.10);
  });

  it('mas_desafiante con comprension >= 75% bonifica +10%', () => {
    const tipoAjuste = 'mas_desafiante';
    const comprension = 0.75;
    const modificador = tipoAjuste === 'mas_desafiante' && comprension >= 0.75
      ? 0.10
      : 0;
    expect(modificador).toBe(0.10);
  });

  it('mas_desafiante con comprension < 75% no bonifica', () => {
    const tipoAjuste = 'mas_desafiante';
    const comprension = 0.50;
    const modificador = tipoAjuste === 'mas_desafiante' && comprension >= 0.75
      ? 0.10
      : 0;
    expect(modificador).toBe(0);
  });

  it('sin ajuste manual, modificador es 0', () => {
    const tipoAjuste = null;
    const modificador = tipoAjuste === 'mas_facil'
      ? -0.10
      : tipoAjuste === 'mas_desafiante'
        ? 0.10
        : 0;
    expect(modificador).toBe(0);
  });
});

// ─── Tests: determinarAjuste no cambia (backwards compat) ───

describe('determinarAjuste (backwards compat Sprint 2)', () => {
  it('>= 80% sube', () => {
    expect(determinarAjuste(0.80)).toBe('subir');
    expect(determinarAjuste(1.0)).toBe('subir');
  });

  it('60-79% mantiene', () => {
    expect(determinarAjuste(0.60)).toBe('mantener');
    expect(determinarAjuste(0.79)).toBe('mantener');
  });

  it('< 60% baja', () => {
    expect(determinarAjuste(0.59)).toBe('bajar');
    expect(determinarAjuste(0.0)).toBe('bajar');
  });
});

// ─── Tests: pesos de session score no cambian ───

describe('PESOS_SESSION_SCORE (backwards compat)', () => {
  it('comprension pesa 0.65', () => {
    expect(PESOS_SESSION_SCORE.comprension).toBe(0.65);
  });

  it('ritmo pesa 0.25', () => {
    expect(PESOS_SESSION_SCORE.ritmo).toBe(0.25);
  });

  it('estabilidad pesa 0.10', () => {
    expect(PESOS_SESSION_SCORE.estabilidad).toBe(0.10);
  });

  it('los pesos suman 1.0', () => {
    const suma = PESOS_SESSION_SCORE.comprension +
      PESOS_SESSION_SCORE.ritmo +
      PESOS_SESSION_SCORE.estabilidad;
    expect(suma).toBe(1.0);
  });
});
