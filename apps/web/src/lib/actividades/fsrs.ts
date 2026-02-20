/**
 * Motor local de FSRS para scheduling de repaso.
 *
 * Implementa curva de olvido y actualizacion de estabilidad/dificultad
 * compatible con un flujo de repaso espaciado en backend.
 */

export type FsrsRating = 1 | 2 | 3 | 4;

export interface FsrsState {
  /** Dificultad de la tarjeta (1-10) */
  difficulty: number;
  /** Estabilidad en dias */
  stability: number;
  /** Repeticiones totales */
  repetitions: number;
  /** Fallos acumulados */
  lapses: number;
  /** Fecha de ultimo repaso */
  lastReviewAt: string;
}

export interface FsrsReviewResult {
  state: FsrsState;
  dueAt: string;
  intervalDays: number;
  retrievability: number;
  rating: FsrsRating;
}

const DECAY = -0.5;
const FACTOR = 19 / 81;
const DEFAULT_RETENTION = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dayDiff(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24));
}

function addDays(base: Date, days: number): Date {
  const out = new Date(base);
  out.setDate(out.getDate() + days);
  return out;
}

/**
 * Curva de olvido de FSRS:
 * R(t,S) = (1 + FACTOR * t / S)^DECAY
 */
export function fsrsRetrievability(stability: number, elapsedDays: number): number {
  const safeStability = Math.max(0.1, stability);
  const base = 1 + (FACTOR * elapsedDays) / safeStability;
  return clamp(Math.pow(base, DECAY), 0, 1);
}

/**
 * Intervalo objetivo para retencion deseada.
 */
export function fsrsIntervalDays(
  stability: number,
  desiredRetention = DEFAULT_RETENTION,
): number {
  const safeStability = Math.max(0.1, stability);
  const raw =
    (safeStability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(raw));
}

/**
 * Convierte resultado de respuesta en rating FSRS.
 * 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export function fsrsRatingFromOutcome(
  correcto: boolean,
  tiempoRespuestaMs?: number,
): FsrsRating {
  if (!correcto) return 1;

  if (typeof tiempoRespuestaMs !== 'number') return 3;
  if (tiempoRespuestaMs < 2500) return 4;
  if (tiempoRespuestaMs > 7000) return 2;
  return 3;
}

export function fsrsInit(now: Date, rating: FsrsRating): FsrsReviewResult {
  const difficultyByRating: Record<FsrsRating, number> = {
    1: 8.5,
    2: 6.8,
    3: 5.2,
    4: 4.2,
  };
  const stabilityByRating: Record<FsrsRating, number> = {
    1: 0.5,
    2: 1.2,
    3: 2.5,
    4: 4.5,
  };

  const state: FsrsState = {
    difficulty: difficultyByRating[rating],
    stability: stabilityByRating[rating],
    repetitions: 1,
    lapses: rating === 1 ? 1 : 0,
    lastReviewAt: now.toISOString(),
  };

  let intervalDays = fsrsIntervalDays(state.stability);
  if (rating === 1) intervalDays = 1;
  if (rating === 2) intervalDays = Math.max(1, Math.round(intervalDays * 0.7));
  if (rating === 4) intervalDays = Math.max(2, Math.round(intervalDays * 1.2));

  return {
    state,
    dueAt: addDays(now, intervalDays).toISOString(),
    intervalDays,
    retrievability: 1,
    rating,
  };
}

export function fsrsReview(
  previous: FsrsState,
  now: Date,
  rating: FsrsRating,
): FsrsReviewResult {
  const elapsedDays = dayDiff(new Date(previous.lastReviewAt), now);
  const retrievability = fsrsRetrievability(previous.stability, elapsedDays);

  let difficulty = previous.difficulty;
  let stability = previous.stability;
  let repetitions = previous.repetitions + 1;
  let lapses = previous.lapses;

  if (rating === 1) {
    // Olvido: cae estabilidad y sube dificultad.
    stability = Math.max(
      0.2,
      0.6 * Math.pow(previous.stability + 0.2, 0.8) * (1.2 + (1 - retrievability)),
    );
    difficulty = clamp(previous.difficulty + 1.2, 1, 10);
    lapses += 1;
  } else {
    // Recordado: incremento de estabilidad con penalizacion hard y bonus easy.
    const hardPenalty = rating === 2 ? 0.85 : 1;
    const easyBonus = rating === 4 ? 1.25 : 1;
    const growth =
      1 +
      Math.exp(0.95) *
        (11 - previous.difficulty) *
        Math.pow(Math.max(1, previous.stability), -0.08) *
        (Math.exp((1 - retrievability) * 1.6) - 1) *
        hardPenalty *
        easyBonus;

    stability = Math.max(previous.stability + 0.1, previous.stability * growth);

    const diffDelta = rating === 2 ? 0.35 : rating === 3 ? -0.1 : -0.45;
    difficulty = clamp(0.8 * previous.difficulty + 0.2 * (previous.difficulty + diffDelta), 1, 10);
  }

  let intervalDays = fsrsIntervalDays(stability);
  if (rating === 1) intervalDays = 1;
  if (rating === 2) intervalDays = Math.max(1, Math.round(intervalDays * 0.7));
  if (rating === 4) intervalDays = Math.max(2, Math.round(intervalDays * 1.2));

  return {
    state: {
      difficulty,
      stability,
      repetitions,
      lapses,
      lastReviewAt: now.toISOString(),
    },
    dueAt: addDays(now, intervalDays).toISOString(),
    intervalDays,
    retrievability,
    rating,
  };
}

export function readFsrsState(metadata: Record<string, unknown>): FsrsState | null {
  const raw = metadata.fsrs;
  if (!raw || typeof raw !== 'object') return null;

  const maybe = raw as Partial<FsrsState>;
  if (
    typeof maybe.difficulty !== 'number' ||
    typeof maybe.stability !== 'number' ||
    typeof maybe.repetitions !== 'number' ||
    typeof maybe.lapses !== 'number' ||
    typeof maybe.lastReviewAt !== 'string'
  ) {
    return null;
  }

  return {
    difficulty: maybe.difficulty,
    stability: maybe.stability,
    repetitions: maybe.repetitions,
    lapses: maybe.lapses,
    lastReviewAt: maybe.lastReviewAt,
  };
}

