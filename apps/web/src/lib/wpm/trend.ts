import type { WpmConfidence } from './session';

export interface SessionWpmSnapshot {
  fecha: string;
  wpmRobusto: number;
  confianza: WpmConfidence;
  nivel: number;
}

export interface WpmTrendPoint {
  fecha: string;
  wpmRaw: number;
  wpmSuavizado: number;
  nivel: number;
  confianza: WpmConfidence;
}

export interface WpmTrendResult {
  puntos: WpmTrendPoint[];
  wpmActual: number;
  sesionesUsadas: number;
}

const ALPHA_DEFAULT = 0.3;
const CONFIDENCE_WEIGHT: Record<WpmConfidence, number> = {
  high: 1.0,
  medium: 0.5,
  low: 0.0,
};
const INACTIVITY_DAYS_THRESHOLD = 14;
const ALPHA_AFTER_INACTIVITY = 0.5;

/**
 * Compute smoothed WPM trend from chronologically-ordered (oldest first) snapshots.
 * Low-confidence sessions are excluded from the EWA but still appear as points.
 * After inactivity gaps (>14 days), the model becomes more reactive.
 */
export function computeWpmTrend(
  snapshots: SessionWpmSnapshot[],
): WpmTrendResult {
  if (snapshots.length === 0) {
    return { puntos: [], wpmActual: 0, sesionesUsadas: 0 };
  }

  const usable = snapshots.filter((s) => CONFIDENCE_WEIGHT[s.confianza] > 0);

  if (usable.length === 0) {
    return {
      puntos: snapshots.map((s) => ({
        fecha: s.fecha,
        wpmRaw: s.wpmRobusto,
        wpmSuavizado: s.wpmRobusto,
        nivel: s.nivel,
        confianza: s.confianza,
      })),
      wpmActual: 0,
      sesionesUsadas: 0,
    };
  }

  // Initialize EWA with first usable session
  let suavizado = usable[0]!.wpmRobusto;
  const puntos: WpmTrendPoint[] = [];
  let sesionesUsadas = 0;

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]!;
    const weight = CONFIDENCE_WEIGHT[snap.confianza];

    if (weight === 0) {
      puntos.push({
        fecha: snap.fecha,
        wpmRaw: snap.wpmRobusto,
        wpmSuavizado: Math.round(suavizado),
        nivel: snap.nivel,
        confianza: snap.confianza,
      });
      continue;
    }

    // Determine alpha based on gap since previous point
    let alpha = ALPHA_DEFAULT;
    if (i > 0) {
      const prevDate = new Date(snapshots[i - 1]!.fecha);
      const currDate = new Date(snap.fecha);
      const gapDays =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      if (gapDays > INACTIVITY_DAYS_THRESHOLD) {
        alpha = ALPHA_AFTER_INACTIVITY;
      }
    }

    const effectiveAlpha = alpha * weight;
    suavizado =
      effectiveAlpha * snap.wpmRobusto + (1 - effectiveAlpha) * suavizado;
    sesionesUsadas++;

    puntos.push({
      fecha: snap.fecha,
      wpmRaw: snap.wpmRobusto,
      wpmSuavizado: Math.round(suavizado),
      nivel: snap.nivel,
      confianza: snap.confianza,
    });
  }

  return { puntos, wpmActual: Math.round(suavizado), sesionesUsadas };
}
