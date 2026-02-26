/**
 * Motor Glicko para comprension lectora.
 *
 * Sistema de rating adaptativo (como chess.com / Lichess):
 *
 * 1. Rating + RD (Rating Deviation = cuanto sabemos sobre el nivel real)
 * 2. RD empieza alto (350) y baja con cada respuesta procesada
 * 3. RD sube si el nino es INCONSISTENTE (el modelo no logra predecir
 *    sus respuestas). RD baja si el nino es PREDECIBLE.
 *    Esto se mide con el Brier score (error cuadratico medio de predicciones).
 * 4. El cambio por respuesta es proporcional al RD:
 *    - RD alto  -> cambios grandes (calibrando)
 *    - RD bajo  -> cambios pequenos (rating estable)
 * 5. Sorpresas (acertar algo muy dificil, fallar algo muy facil)
 *    producen cambios mayores por la formula Glicko de expected score
 *
 * Rating 1000 = nino de 5 anos con comprension basica.
 */

import type { TipoPregunta } from '@/lib/types/reading';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface EloRatings {
  global: number;
  literal: number;
  inferencia: number;
  vocabulario: number;
  resumen: number;
  rd: number;
}

export interface RespuestaElo {
  tipo: TipoPregunta;
  correcta: boolean;
  dificultadPregunta: number;
}

export interface EloUpdateResult {
  nuevoElo: EloRatings;
  cambios: Array<{
    tipo: TipoPregunta;
    questionRating: number;
    deltaGlobal: number;
    deltaTipo: number;
  }>;
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const TYPE_MODIFIER: Record<TipoPregunta, number> = {
  literal: -40,
  vocabulario: 0,
  inferencia: 40,
  resumen: 60,
};

/** Glicko constant: ln(10) / 400 */
const Q = Math.log(10) / 400;

/** RD de las preguntas (conocemos bien su dificultad) */
const QUESTION_RD = 50;

/** RD minimo: nunca bajamos de aqui */
const RD_MIN = 75;

/** RD maximo (incertidumbre total) */
const RD_MAX = 350;

/**
 * Brier score "neutral" (baseline).
 *
 * Un Brier de 0.25 equivale a predecir 50/50 siempre.
 * Usamos 0.20 como neutral para que predicciones "decentes"
 * todavia reduzcan un poco el RD.
 */
const NEUTRAL_BRIER = 0.2;

/**
 * Sensibilidad del ajuste de RD por consistencia.
 *
 * Puntos de RD por unidad de desviacion del Brier score:
 *   brier=0.05 (predecible)     -> ajuste = (0.05-0.20)*120 = -18 RD
 *   brier=0.15 (decente)        -> ajuste = (0.15-0.20)*120 = -6 RD
 *   brier=0.20 (neutral)        -> ajuste = 0
 *   brier=0.35 (inconsistente)  -> ajuste = +18 RD
 *   brier=0.50 (muy erratico)   -> ajuste = +36 RD
 */
const RD_SENSITIVITY = 120;

// ─────────────────────────────────────────────
// FUNCIONES GLICKO INTERNAS
// ─────────────────────────────────────────────

/** Factor g(RD): atenua impacto segun incertidumbre del oponente */
function glickoG(rd: number): number {
  return 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));
}

/** Expected score E */
function glickoE(playerRating: number, opponentRating: number, opponentRd: number): number {
  const g = glickoG(opponentRd);
  return 1 / (1 + Math.pow(10, (-g * (playerRating - opponentRating)) / 400));
}

/** Calcula nuevo rating y RD tras una respuesta */
function glickoUpdate(
  rating: number,
  rd: number,
  opponentRating: number,
  opponentRd: number,
  score: number,
): { newRating: number; newRd: number } {
  const g = glickoG(opponentRd);
  const E = glickoE(rating, opponentRating, opponentRd);

  const d2 = 1 / (Q * Q * g * g * E * (1 - E));
  const rdSq = rd * rd;

  const newRating = rating + (Q / (1 / rdSq + 1 / d2)) * g * (score - E);
  const newRd = Math.max(RD_MIN, Math.sqrt(1 / (1 / rdSq + 1 / d2)));

  return {
    newRating: Math.round(newRating * 10) / 10,
    newRd: Math.round(newRd * 10) / 10,
  };
}

/**
 * Ajusta el RD basandose en la consistencia del nino (Brier score).
 *
 * Brier score = promedio de (actual - expected)^2 sobre todas las respuestas.
 * - 0.00 = predicciones perfectas (el modelo conoce al nino exactamente)
 * - 0.25 = equivalente a lanzar moneda (no sabe nada)
 * - 1.00 = siempre equivocado (peor que random)
 *
 * Si el Brier es bajo (nino predecible): RD baja extra.
 * Si el Brier es alto (nino erratico): RD sube.
 */
function ajustarRdPorConsistencia(
  rd: number,
  predicciones: Array<{ expected: number; actual: number }>,
): number {
  if (predicciones.length < 2) return rd;

  const brier =
    predicciones.reduce((sum, p) => sum + (p.actual - p.expected) ** 2, 0) / predicciones.length;

  const deviation = brier - NEUTRAL_BRIER;
  const rdAdjustment = deviation * RD_SENSITIVITY;

  return Math.min(RD_MAX, Math.max(RD_MIN, Math.round((rd + rdAdjustment) * 10) / 10));
}

/**
 * Factor anti-farming:
 * - Si la respuesta era muy esperable, reduce el delta.
 * - Si ademas era un acierto contra una pregunta claramente mas facil
 *   que el rating actual del nino, lo reduce aun mas.
 *
 * Objetivo: evitar que una racha de aciertos en preguntas faciles
 * infle artificialmente el Elo.
 *
 * IMPORTANTE: cuando el RD es alto (sistema calibrando), el anti-farming
 * se atenua. Las preguntas son "faciles" no porque el nino haga farming,
 * sino porque el sistema aun no conoce su nivel real.
 * Con RD>=300 el anti-farming apenas actua; con RD<=100 actua al 100%.
 */
function factorAntiFarming(
  playerRating: number,
  questionRating: number,
  score: number,
  expected: number,
  rd: number,
): number {
  const sorpresa = Math.abs(score - expected); // 0..1
  const factorSorpresa = 0.2 + (0.8 * sorpresa); // 0.2..1

  // Solo penalizamos aciertos cuando el item era claramente mas facil.
  if (score === 1 && playerRating > questionRating) {
    const gap = playerRating - questionRating;
    // Gap >= 500 => penalizacion maxima (pero nunca 0 para no congelar del todo).
    const penalizacionFacil = Math.max(0.05, 1 - (gap / 500));
    const rawFactor = Math.max(0.02, factorSorpresa * penalizacionFacil);

    // Atenuar anti-farming segun incertidumbre (RD).
    // RD>=300 -> calibrando, bypass ~50% del anti-farming
    // RD<=100 -> rating estable, anti-farming completo (factor = rawFactor)
    const rdNorm = Math.min(1, Math.max(0, (rd - 100) / 200)); // 0..1
    return rawFactor + (rdNorm * 0.5) * (1 - rawFactor);
  }

  return factorSorpresa;
}

// ─────────────────────────────────────────────
// FUNCIONES PUBLICAS
// ─────────────────────────────────────────────

/**
 * Rating de una pregunta basado en nivel del texto, dificultad intrinseca y tipo.
 *
 * Rango: ~200 (nivel 1.0, facil, literal) a ~1380 (nivel 4.8, hard, resumen)
 */
function calcularQuestionRating(
  textLevel: number,
  dificultadPregunta: number,
  tipo: TipoPregunta,
): number {
  const baseRating = textLevel * 200 + 200;
  const difficultyBonus = (dificultadPregunta - 3) * 80;
  const typeModifier = TYPE_MODIFIER[tipo];
  return Math.round(baseRating + difficultyBonus + typeModifier);
}

/**
 * Procesa un batch de respuestas con Glicko + ajuste de consistencia.
 *
 * Cada respuesta:
 * 1. Calcula el rating de la pregunta
 * 2. Registra la prediccion (E) para el Brier score
 * 3. Actualiza rating global con Glicko (cambio proporcional al RD)
 * 4. Actualiza rating del tipo con K derivado del RD
 * 5. El RD baja naturalmente con cada respuesta procesada
 *
 * Despues del batch:
 * 6. Calcula Brier score (error cuadratico medio de predicciones)
 * 7. Ajusta RD: si el nino fue predecible, baja extra.
 *    Si fue erratico, sube.
 *
 * El efecto:
 * - Nino nuevo (RD=350): primera sesion mueve +30/+40 por pregunta
 * - Nino consistente (RD~80): mueve +8/+12 por pregunta, RD se mantiene bajo
 * - Nino erratico (acierta dificiles, falla faciles): RD sube, cambios mayores
 */
export function procesarRespuestasElo(
  eloActual: EloRatings,
  respuestas: RespuestaElo[],
  textLevel: number,
): EloUpdateResult {
  let global = eloActual.global;
  let rd = eloActual.rd;

  const porTipo: Record<TipoPregunta, number> = {
    literal: eloActual.literal,
    inferencia: eloActual.inferencia,
    vocabulario: eloActual.vocabulario,
    resumen: eloActual.resumen,
  };

  const cambios: EloUpdateResult['cambios'] = [];
  const predicciones: Array<{ expected: number; actual: number }> = [];

  for (const resp of respuestas) {
    const qRating = calcularQuestionRating(textLevel, resp.dificultadPregunta, resp.tipo);
    const score = resp.correcta ? 1 : 0;

    const prevGlobal = global;
    const prevTipo = porTipo[resp.tipo];

    // Registrar prediccion ANTES de actualizar (usa rating actual)
    const E = glickoE(global, qRating, QUESTION_RD);
    predicciones.push({ expected: E, actual: score });

    // Glicko update para rating global + RD
    // Aplicamos damping anti-farming al delta de rating, no al RD.
    const globalUpdate = glickoUpdate(prevGlobal, rd, qRating, QUESTION_RD, score);
    const rawDeltaGlobal = globalUpdate.newRating - prevGlobal;
    const factorGlobal = factorAntiFarming(prevGlobal, qRating, score, E, rd);
    const adjustedDelta = rawDeltaGlobal * factorGlobal;

    // Per-question delta clamp: generous during calibration, tight when stable.
    // Prevents extreme swings (e.g. -256 in a single session) while still
    // allowing fast convergence. RD=350 -> ±15, RD=200 -> ±12, RD=75 -> ±9.5
    const maxDelta = 8 + (rd / 50);
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, adjustedDelta));

    global = Math.round((prevGlobal + clampedDelta) * 10) / 10;
    rd = globalUpdate.newRd;

    // Para el tipo: K derivado del RD actual.
    // No se aplica anti-farming a sub-tipos: queremos que reflejen skill real
    // rapidamente. Anti-farming solo protege el global (que determina dificultad).
    const K = Math.max(12, rd * 0.15);
    const expectedTipo = 1 / (1 + Math.pow(10, (qRating - prevTipo) / 400));
    const rawDeltaTipo = K * (score - expectedTipo);
    porTipo[resp.tipo] = Math.round((prevTipo + rawDeltaTipo) * 10) / 10;

    cambios.push({
      tipo: resp.tipo,
      questionRating: qRating,
      deltaGlobal: Math.round((global - prevGlobal) * 10) / 10,
      deltaTipo: Math.round((porTipo[resp.tipo] - prevTipo) * 10) / 10,
    });
  }

  // Ajuste post-batch: RD sube si el nino es erratico, baja si es predecible
  rd = ajustarRdPorConsistencia(rd, predicciones);

  return {
    nuevoElo: {
      global,
      literal: porTipo.literal,
      inferencia: porTipo.inferencia,
      vocabulario: porTipo.vocabulario,
      resumen: porTipo.resumen,
      rd,
    },
    cambios,
  };
}

/**
 * Clasificacion textual del nivel Elo.
 */
export function clasificarElo(elo: number): string {
  if (elo < 800) return 'Principiante';
  if (elo < 1100) return 'En desarrollo';
  if (elo < 1400) return 'Competente';
  return 'Avanzado';
}
