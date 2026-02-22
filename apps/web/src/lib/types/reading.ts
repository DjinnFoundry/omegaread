/**
 * Tipos del dominio de lectura adaptativa.
 * Contrato de datos para Sprint 2+ (generacion de historias + adaptacion).
 */

// ─────────────────────────────────────────────
// TIPOS DE PREGUNTA
// ─────────────────────────────────────────────

export type TipoPregunta = 'literal' | 'inferencia' | 'vocabulario' | 'resumen';

export const TIPOS_PREGUNTA: TipoPregunta[] = ['literal', 'inferencia', 'vocabulario', 'resumen'];

// ─────────────────────────────────────────────
// PREGUNTAS DE COMPRENSION
// ─────────────────────────────────────────────

export interface ComprehensionQuestion {
  id: string;
  tipo: TipoPregunta;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number; // indice de la opcion correcta
}

// ─────────────────────────────────────────────
// RESULTADO DE COMPRENSION
// ─────────────────────────────────────────────

export interface ComprehensionResult {
  preguntaId: string;
  tipo: TipoPregunta;
  respuestaSeleccionada: number;
  correcta: boolean;
  tiempoMs: number;
}

export interface AudioReadingAnalysis {
  wpmUtil: number;
  precisionLectura: number;
  coberturaTexto: number;
  pauseRatio: number;
  tiempoVozActivaMs: number;
  totalPalabrasTranscritas: number;
  totalPalabrasAlineadas: number;
  qualityScore: number;
  confiable: boolean;
  motivoNoConfiable: string | null;
  motor: string;
}

// ─────────────────────────────────────────────
// SESION DE LECTURA
// ─────────────────────────────────────────────

export interface ReadingSession {
  id: string;
  studentId: string;
  textoId: string;
  nivelTexto: number;
  topicId?: string;
  tiempoLecturaMs: number;
  preguntas: ComprehensionQuestion[];
  resultados: ComprehensionResult[];
  sessionScore?: number;
  iniciadaEn: Date;
  finalizadaEn?: Date;
}

// ─────────────────────────────────────────────
// AJUSTE DE DIFICULTAD
// ─────────────────────────────────────────────

export type DireccionAjuste = 'subir' | 'bajar' | 'mantener';

export interface DifficultyAdjustment {
  studentId: string;
  sessionId?: string;
  nivelAnterior: number;
  nivelNuevo: number;
  direccion: DireccionAjuste;
  razon: string;
  evidencia: {
    comprensionScore: number;
    ritmoNormalizado: number;
    estabilidad: number;
    sessionScore: number;
  };
}

// ─────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────

/**
 * session_score = 0.65 * comprension + 0.25 * ritmo + 0.10 * estabilidad
 *
 * - comprension: ratio de aciertos (0-1)
 * - ritmoNormalizado: fluidez lectora normalizada (0-1)
 *
 * Backwards compatibility:
 * - `ritmo` y `ritmoNormalizado` son equivalentes.
 * - Se aceptan `wpmRatio` y `ritmoMejora` para callers legacy.
 * - estabilidad: consistencia en sesiones recientes (0-1)
 */
export interface SessionScoreInput {
  comprension: number;
  ritmo?: number;
  ritmoNormalizado?: number;
  wpmRatio?: number;
  ritmoMejora?: number;
  estabilidad: number;
}

export const PESOS_SESSION_SCORE = {
  comprension: 0.65,
  ritmo: 0.25,
  estabilidad: 0.10,
} as const;

export function calcularSessionScore(input: SessionScoreInput): number {
  const ritmoDirecto = input.ritmoNormalizado ?? input.ritmo;
  const ritmoLegacy = input.wpmRatio ?? input.ritmoMejora;
  const ritmo = typeof ritmoDirecto === 'number'
    ? ritmoDirecto
    : typeof ritmoLegacy === 'number'
      ? ritmoLegacy
      : 0;

  const score =
    PESOS_SESSION_SCORE.comprension * input.comprension +
    PESOS_SESSION_SCORE.ritmo * ritmo +
    PESOS_SESSION_SCORE.estabilidad * input.estabilidad;
  return Math.round(score * 100) / 100;
}

/**
 * Determina la direccion de ajuste segun el session_score compuesto.
 * Integra comprension (65%), ritmo (25%) y estabilidad (10%).
 * - >= 0.80: subir
 * - 0.60-0.79: mantener
 * - < 0.60: bajar
 */
export function determinarAjuste(sessionScore: number): DireccionAjuste {
  if (sessionScore >= 0.80) return 'subir';
  if (sessionScore >= 0.60) return 'mantener';
  return 'bajar';
}

// ─────────────────────────────────────────────
// BASELINE
// ─────────────────────────────────────────────

export type BaselineConfianza = 'alto' | 'medio' | 'bajo';

export interface BaselineResult {
  nivelLectura: number;
  comprensionScore: number;
  confianza: BaselineConfianza;
  aciertosPorTipo: Record<TipoPregunta, { total: number; aciertos: number }>;
  textosCompletados: number;
}

/**
 * Calcula el nivel de baseline a partir de los resultados por texto.
 *
 * Logica:
 * - El nivel maximo donde el nino acerto >= 60% es su nivel base.
 * - Si acierta >= 80% en ese nivel, se suma 0.5 (domina bien ese nivel).
 * - Confianza depende de cuantos textos completo:
 *   4 textos = alto, 3 = medio, 2 o menos = bajo.
 */
export function calcularBaseline(
  resultadosPorTexto: Array<{
    nivelTexto: number;
    totalPreguntas: number;
    aciertos: number;
    aciertosPorTipo: Record<string, number>;
  }>
): BaselineResult {
  const textosCompletados = resultadosPorTexto.length;

  // Confianza
  let confianza: BaselineConfianza = 'bajo';
  if (textosCompletados >= 4) confianza = 'alto';
  else if (textosCompletados >= 3) confianza = 'medio';

  // Calcular comprension global
  const totalPreguntas = resultadosPorTexto.reduce((s, r) => s + r.totalPreguntas, 0);
  const totalAciertos = resultadosPorTexto.reduce((s, r) => s + r.aciertos, 0);
  const comprensionScore = totalPreguntas > 0 ? totalAciertos / totalPreguntas : 0;

  // Determinar nivel: el mas alto donde acierto >= 60%
  let nivelLectura = 1;
  for (const resultado of resultadosPorTexto) {
    const ratio = resultado.totalPreguntas > 0
      ? resultado.aciertos / resultado.totalPreguntas
      : 0;
    if (ratio >= 0.60) {
      nivelLectura = resultado.nivelTexto;
      if (ratio >= 0.80) {
        nivelLectura = resultado.nivelTexto + 0.5;
      }
    }
  }

  // Agregar aciertos por tipo
  const aciertosPorTipo: Record<TipoPregunta, { total: number; aciertos: number }> = {
    literal: { total: 0, aciertos: 0 },
    inferencia: { total: 0, aciertos: 0 },
    vocabulario: { total: 0, aciertos: 0 },
    resumen: { total: 0, aciertos: 0 },
  };

  for (const resultado of resultadosPorTexto) {
    for (const tipo of TIPOS_PREGUNTA) {
      const aciertosDeEste = resultado.aciertosPorTipo[tipo] ?? 0;
      // Asumimos 1 pregunta por tipo por texto
      const tienePregunta = resultado.aciertosPorTipo[tipo] !== undefined;
      if (tienePregunta) {
        aciertosPorTipo[tipo].total += 1;
        aciertosPorTipo[tipo].aciertos += aciertosDeEste;
      }
    }
  }

  return {
    nivelLectura: Math.min(nivelLectura, 4),
    comprensionScore: Math.round(comprensionScore * 100) / 100,
    confianza,
    aciertosPorTipo,
    textosCompletados,
  };
}
