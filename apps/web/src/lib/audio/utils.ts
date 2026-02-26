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
