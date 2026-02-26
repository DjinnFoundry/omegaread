/**
 * Pure utility functions for audio reading analysis.
 * No I/O, no DB, no server directives.
 */
import type { AudioReadingAnalysis } from '@/lib/types/reading';
import { normalizarTexto } from '@/lib/utils/text';

// ─── Types ───

interface PalabraTimestamp {
  palabra: string;
  inicioSeg?: number;
  finSeg?: number;
}

export type { PalabraTimestamp };

// ─── Serialized audio analysis return type ───

export interface AudioAnalisisSerialized {
  wpmUtil: number;
  precisionLectura: number;
  coberturaTexto: number;
  pauseRatio: number;
  qualityScore: number;
  confiable: boolean;
  motivoNoConfiable: string | null;
  motor: string;
  tiempoVozActivaMs: number;
  totalPalabrasTranscritas: number;
  totalPalabrasAlineadas: number;
}

// ─── Functions ───

/**
 * Serializa el analisis de audio a un objeto plano para almacenar en session.metadata.
 * Si no hay analisis disponible, devuelve el valor de fallback (por defecto null).
 */
export function serializarAudioAnalisis(
  analisis: AudioReadingAnalysis | null | undefined,
  fallback?: AudioAnalisisSerialized | null,
): AudioAnalisisSerialized | null {
  if (!analisis) return fallback ?? null;
  return {
    wpmUtil: analisis.wpmUtil,
    precisionLectura: analisis.precisionLectura,
    coberturaTexto: analisis.coberturaTexto,
    pauseRatio: analisis.pauseRatio,
    qualityScore: analisis.qualityScore,
    confiable: analisis.confiable,
    motivoNoConfiable: analisis.motivoNoConfiable ?? null,
    motor: analisis.motor,
    tiempoVozActivaMs: analisis.tiempoVozActivaMs,
    totalPalabrasTranscritas: analisis.totalPalabrasTranscritas,
    totalPalabrasAlineadas: analisis.totalPalabrasAlineadas,
  };
}

// ─── Scoring constants (shared between scoring helpers) ───

export const MIN_PALABRAS_TRANSCRIPCION_UTIL = 12;

export const UMBRAL_CALIDAD_CONFIABLE = 0.55;
export const MIN_VOZ_ACTIVA_MS_TRANSCRIPCION = 20_000;
export const MIN_VOZ_ACTIVA_MS_SENAL = 15_000;
export const VOZ_ACTIVA_REF_TRANSCRIPCION_MS = 25_000;
export const VOZ_ACTIVA_REF_SENAL_MS = 20_000;
export const MIN_PRECISION_ALINEACION = 0.35;
export const MIN_COBERTURA_TEXTO = 0.2;
export const MIN_PALABRAS_TRANSCRITAS = 25;
export const REF_PRECISION_LECTURA = 0.75;
export const REF_COBERTURA_TEXTO_TRANSCRIPCION = 0.65;
export const REF_COBERTURA_TEXTO_SENAL = 0.6;
export const WPM_REFERENCIA_SENAL = 85;
export const WPM_RAZONABLE_MIN = 35;
export const WPM_RAZONABLE_MAX = 220;
export const WPM_TIPICO = 95;
export const WPM_DISTANCIA_NORM = 120;
export const MIN_COBERTURA_SENAL = 0.25;
export const MAX_PAUSE_RATIO_CONFIABLE = 0.85;
export const PESO_VOZ_TRANSCRIPCION = 0.35;
export const PESO_PRECISION = 0.4;
export const PESO_COBERTURA_TRANSCRIPCION = 0.25;
export const PESO_VOZ_SENAL = 0.35;
export const PESO_COBERTURA_SENAL = 0.35;
export const PESO_RITMO_SENAL = 0.3;

// ─── Shared result shape ───

export interface AnalisisAudioResultado {
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

// ─── Pure scoring helpers ───

/**
 * Scoring path when we have enough transcription data.
 * Pure computation: no I/O, no DB.
 */
export function calcularAnalisisConTranscripcion(params: {
  palabrasTranscritas: string[];
  textoObjetivo: string;
  tiempoVozActivaMs: number;
  errorTranscripcion: string | null;
  transcribeModel: string;
}): AnalisisAudioResultado {
  const { palabrasTranscritas, textoObjetivo, tiempoVozActivaMs, errorTranscripcion, transcribeModel } = params;

  const alineacion = alinearPalabrasAlTexto({ textoObjetivo, palabrasTranscritas });
  const minutosVozActiva = tiempoVozActivaMs / 60_000;
  const wpmUtil =
    minutosVozActiva > 0
      ? Math.round((alineacion.totalUnicasAlineadas / minutosVozActiva) * 10) / 10
      : 0;

  const scoreVoz = clamp01(tiempoVozActivaMs / VOZ_ACTIVA_REF_TRANSCRIPCION_MS);
  const scorePrecision = clamp01(alineacion.precisionLectura / REF_PRECISION_LECTURA);
  const scoreCobertura = clamp01(alineacion.coberturaTexto / REF_COBERTURA_TEXTO_TRANSCRIPCION);
  const qualityScore =
    Math.round(
      (scoreVoz * PESO_VOZ_TRANSCRIPCION +
        scorePrecision * PESO_PRECISION +
        scoreCobertura * PESO_COBERTURA_TRANSCRIPCION) *
        100,
    ) / 100;

  const motivos: string[] = [];
  if (tiempoVozActivaMs < MIN_VOZ_ACTIVA_MS_TRANSCRIPCION) motivos.push('poca voz activa');
  if (alineacion.totalHabladas < MIN_PALABRAS_TRANSCRITAS) motivos.push('muy pocas palabras transcritas');
  if (alineacion.precisionLectura < MIN_PRECISION_ALINEACION) motivos.push('baja precision de alineacion');
  if (alineacion.coberturaTexto < MIN_COBERTURA_TEXTO) motivos.push('cobertura de texto baja');
  if (errorTranscripcion) motivos.push('transcripcion parcial');

  const confiable =
    qualityScore >= UMBRAL_CALIDAD_CONFIABLE &&
    motivos.filter((m) => m !== 'transcripcion parcial').length === 0;

  return {
    wpmUtil,
    precisionLectura: Math.round(alineacion.precisionLectura * 1000) / 1000,
    coberturaTexto: Math.round(alineacion.coberturaTexto * 1000) / 1000,
    pauseRatio: 0, // caller fills in pauseRatio
    tiempoVozActivaMs,
    totalPalabrasTranscritas: alineacion.totalHabladas,
    totalPalabrasAlineadas: alineacion.totalAlineadas,
    qualityScore,
    confiable,
    motivoNoConfiable: confiable ? null : motivos.join(', '),
    motor: transcribeModel,
  };
}

/**
 * Fallback scoring path using only signal data (no useful transcription).
 * Pure computation: no I/O, no DB.
 */
export function calcularAnalisisPorSenal(params: {
  totalPalabrasObjetivo: number;
  tiempoVozActivaMs: number;
  tiempoTotalMs: number;
  palabrasTranscritas: number;
  errorTranscripcion: string | null;
}): AnalisisAudioResultado {
  const { totalPalabrasObjetivo, tiempoVozActivaMs, tiempoTotalMs, palabrasTranscritas, errorTranscripcion } = params;

  const minutosVozActiva = tiempoVozActivaMs / 60_000;
  const pauseRatio = clamp01((tiempoTotalMs - tiempoVozActivaMs) / tiempoTotalMs);

  const wpmEstimadoPorSenal =
    minutosVozActiva > 0 && totalPalabrasObjetivo > 0
      ? Math.round((totalPalabrasObjetivo / minutosVozActiva) * 10) / 10
      : 0;
  const duracionEsperadaMs =
    totalPalabrasObjetivo > 0 ? (totalPalabrasObjetivo / WPM_REFERENCIA_SENAL) * 60_000 : 0;
  const coberturaProxy =
    duracionEsperadaMs > 0 ? clamp01(tiempoVozActivaMs / duracionEsperadaMs) : 0;
  const precisionProxy =
    wpmEstimadoPorSenal >= WPM_RAZONABLE_MIN && wpmEstimadoPorSenal <= WPM_RAZONABLE_MAX
      ? 0.6
      : 0.35;
  const scoreVoz = clamp01(tiempoVozActivaMs / VOZ_ACTIVA_REF_SENAL_MS);
  const scoreCobertura = clamp01(coberturaProxy / REF_COBERTURA_TEXTO_SENAL);
  const scoreRitmo =
    wpmEstimadoPorSenal > 0
      ? clamp01(1 - Math.abs(wpmEstimadoPorSenal - WPM_TIPICO) / WPM_DISTANCIA_NORM)
      : 0;
  const qualityScore =
    Math.round(
      (scoreVoz * PESO_VOZ_SENAL +
        scoreCobertura * PESO_COBERTURA_SENAL +
        scoreRitmo * PESO_RITMO_SENAL) *
        100,
    ) / 100;

  const motivos: string[] = [];
  if (tiempoVozActivaMs < MIN_VOZ_ACTIVA_MS_SENAL) motivos.push('poca voz activa');
  if (wpmEstimadoPorSenal > 0 && (wpmEstimadoPorSenal < WPM_RAZONABLE_MIN || wpmEstimadoPorSenal > WPM_RAZONABLE_MAX))
    motivos.push('ritmo fuera de rango');
  if (coberturaProxy < MIN_COBERTURA_SENAL) motivos.push('voz activa insuficiente para el texto');
  if (pauseRatio > MAX_PAUSE_RATIO_CONFIABLE) motivos.push('muchas pausas');
  if (errorTranscripcion) motivos.push('sin transcripcion util');

  const confiable =
    qualityScore >= UMBRAL_CALIDAD_CONFIABLE &&
    motivos.filter((m) => m !== 'sin transcripcion util').length === 0;

  return {
    wpmUtil: wpmEstimadoPorSenal,
    precisionLectura: Math.round(precisionProxy * 1000) / 1000,
    coberturaTexto: Math.round(coberturaProxy * 1000) / 1000,
    pauseRatio: Math.round(pauseRatio * 1000) / 1000,
    tiempoVozActivaMs,
    totalPalabrasTranscritas: palabrasTranscritas,
    totalPalabrasAlineadas: 0,
    qualityScore,
    confiable,
    motivoNoConfiable: confiable ? null : motivos.join(', '),
    motor: 'signal-only',
  };
}

export function normalizarToken(valor: string): string {
  return normalizarTexto(valor, { preservarEnie: true }).replace(/\s+/g, '');
}

export function tokenizarTexto(valor: string): string[] {
  return valor.split(/\s+/).map(normalizarToken).filter(Boolean);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function alinearPalabrasAlTexto(params: { textoObjetivo: string; palabrasTranscritas: string[] }) {
  const objetivo = tokenizarTexto(params.textoObjetivo);
  const habladas = params.palabrasTranscritas.map(normalizarToken).filter(Boolean);

  let cursor = 0;
  let totalAlineadas = 0;
  const indicesUnicos = new Set<number>();

  for (const palabra of habladas) {
    let match = -1;
    const lookAhead = 8;
    const lookBehind = 3;
    const inicio = Math.max(0, cursor - lookBehind);
    const fin = Math.min(objetivo.length, cursor + lookAhead);

    for (let i = inicio; i < fin; i++) {
      if (objetivo[i] === palabra) {
        match = i;
        break;
      }
    }

    if (match === -1) continue;
    totalAlineadas++;
    indicesUnicos.add(match);
    if (match >= cursor) cursor = match + 1;
  }

  const totalObjetivo = objetivo.length;
  const coberturaTexto = totalObjetivo > 0 ? indicesUnicos.size / totalObjetivo : 0;
  const precisionLectura = habladas.length > 0 ? totalAlineadas / habladas.length : 0;

  return {
    totalObjetivo,
    totalHabladas: habladas.length,
    totalAlineadas,
    totalUnicasAlineadas: indicesUnicos.size,
    coberturaTexto: clamp01(coberturaTexto),
    precisionLectura: clamp01(precisionLectura),
  };
}
