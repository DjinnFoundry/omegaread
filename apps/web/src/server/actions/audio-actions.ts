'use server';

/**
 * Server Actions for audio reading analysis.
 * Handles transcription, word alignment, and fluency metrics.
 *
 * Pure utility functions have been moved to @/lib/audio/utils.
 */
import { getDb } from '@/server/db';
import {
  sessions,
  eq,
  and,
} from '@omegaread/db';
import { requireStudentOwnership } from '../auth';
import { analizarLecturaAudioSchema } from '../validation';
import { getOpenAIClient, hasLLMKey, OpenAIKeyMissingError } from '@/lib/ai/openai';
import {
  tokenizarTexto,
  clamp01,
  alinearPalabrasAlTexto,
} from '@/lib/audio/utils';

// ─── Audio size constants ───

const MIN_AUDIO_BYTES = 8_000;
const MAX_AUDIO_BYTES = 12_000_000;

// Minimum transcribed words needed to use alignment-based analysis.
const MIN_PALABRAS_TRANSCRIPCION = 12;

// Umbral de calidad para marcar un analisis como confiable.
const UMBRAL_CALIDAD_CONFIABLE = 0.55;

// Tiempo minimo de voz activa (ms) requerido para analisis confiable con transcripcion.
const MIN_VOZ_ACTIVA_MS_TRANSCRIPCION = 20_000;

// Tiempo minimo de voz activa (ms) requerido para analisis confiable por senal.
const MIN_VOZ_ACTIVA_MS_SENAL = 15_000;

// Tiempo de voz activa (ms) usado para normalizar scoreVoz en el path de transcripcion.
const VOZ_ACTIVA_REF_TRANSCRIPCION_MS = 25_000;

// Tiempo de voz activa (ms) usado para normalizar scoreVoz en el path de senal.
const VOZ_ACTIVA_REF_SENAL_MS = 20_000;

// Precision minima de alineacion requerida para resultado confiable.
const MIN_PRECISION_ALINEACION = 0.35;

// Cobertura minima de texto requerida para resultado confiable.
const MIN_COBERTURA_TEXTO = 0.2;

// Minimo de palabras transcritas requerido para resultado confiable.
const MIN_PALABRAS_TRANSCRITAS = 25;

// Precision de referencia usada para normalizar scorePrecision.
const REF_PRECISION_LECTURA = 0.75;

// Cobertura de referencia usada para normalizar scoreCobertura con transcripcion.
const REF_COBERTURA_TEXTO_TRANSCRIPCION = 0.65;

// Cobertura de referencia usada para normalizar scoreCobertura por senal.
const REF_COBERTURA_TEXTO_SENAL = 0.6;

// WPM objetivo para texto (palabras por minuto): para estimar duracion esperada.
const WPM_REFERENCIA_SENAL = 85;

// Rango WPM considerado razonable para el path por senal.
const WPM_RAZONABLE_MIN = 35;
const WPM_RAZONABLE_MAX = 220;

// WPM tipico para calcular distancia en scoreRitmo.
const WPM_TIPICO = 95;

// Denominador de la distancia WPM para calcular scoreRitmo.
const WPM_DISTANCIA_NORM = 120;

// Cobertura minima por senal para resultado confiable.
const MIN_COBERTURA_SENAL = 0.25;

// Proporcion de pausas sobre total que indica "muchas pausas".
const MAX_PAUSE_RATIO_CONFIABLE = 0.85;

// Pesos del qualityScore en el path de transcripcion.
const PESO_VOZ_TRANSCRIPCION = 0.35;
const PESO_PRECISION = 0.4;
const PESO_COBERTURA_TRANSCRIPCION = 0.25;

// Pesos del qualityScore en el path por senal.
const PESO_VOZ_SENAL = 0.35;
const PESO_COBERTURA_SENAL = 0.35;
const PESO_RITMO_SENAL = 0.3;

// ─── Server Action ───

/**
 * Analiza lectura en voz alta:
 * - Transcribe audio
 * - Alinea palabras con el texto objetivo
 * - Calcula metrica robusta de fluidez (WPM util por voz activa)
 */
export async function analizarLecturaAudio(datos: {
  sessionId: string;
  studentId: string;
  storyId?: string;
  audioBase64: string;
  mimeType?: string;
  tiempoVozActivaMs: number;
  tiempoTotalMs: number;
}) {
  const db = await getDb();
  const validado = analizarLecturaAudioSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
    with: {
      story: {
        columns: {
          id: true,
          contenido: true,
        },
      },
    },
  });

  if (!sesion || !sesion.story) {
    return {
      ok: false as const,
      error: 'Sesion o historia no encontrada para analisis de audio',
      code: 'GENERATION_FAILED' as const,
    };
  }

  if (validado.storyId && validado.storyId !== sesion.story.id) {
    return {
      ok: false as const,
      error: 'El audio no corresponde a la historia activa de la sesion',
      code: 'GENERATION_FAILED' as const,
    };
  }

  const raw = validado.audioBase64.includes(',')
    ? validado.audioBase64.split(',')[1]
    : validado.audioBase64;
  const audioBuffer = Buffer.from(raw, 'base64');

  if (audioBuffer.length < MIN_AUDIO_BYTES) {
    return {
      ok: false as const,
      error: 'Audio insuficiente para medir fluidez',
      code: 'GENERATION_FAILED' as const,
    };
  }

  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return {
      ok: false as const,
      error: 'Audio demasiado grande para analizar en una sola peticion',
      code: 'GENERATION_FAILED' as const,
    };
  }

  const palabrasObjetivo = tokenizarTexto(sesion.story.contenido);
  const totalPalabrasObjetivo = palabrasObjetivo.length;

  let transcripcionTexto = '';
  let palabrasConTiempo: Array<{ palabra: string; inicioSeg?: number; finSeg?: number }> = [];
  let errorTranscripcion: string | null = null;
  const transcribeModel = process.env.LLM_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

  if (await hasLLMKey()) {
    try {
      const client = await getOpenAIClient();
      const mimeType = validado.mimeType || 'audio/webm';
      const extension = mimeType.includes('wav')
        ? 'wav'
        : mimeType.includes('mp4')
          ? 'mp4'
          : 'webm';
      const file = new File([audioBuffer], `lectura.${extension}`, { type: mimeType });

      try {
        const verbose = await client.audio.transcriptions.create({
          file,
          model: transcribeModel,
          language: 'es',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        });

        transcripcionTexto = String((verbose as { text?: string }).text ?? '').trim();
        const words = (
          verbose as { words?: Array<{ word?: string; start?: number; end?: number }> }
        ).words;
        if (Array.isArray(words) && words.length > 0) {
          palabrasConTiempo = words.map((w) => ({
            palabra: String(w.word ?? ''),
            inicioSeg: typeof w.start === 'number' ? w.start : undefined,
            finSeg: typeof w.end === 'number' ? w.end : undefined,
          }));
        }
      } catch {
        // Fallback cuando el proveedor no soporta verbose_json/timestamps.
        const simple = await client.audio.transcriptions.create({
          file,
          model: transcribeModel,
          language: 'es',
        });
        transcripcionTexto = String((simple as { text?: string }).text ?? '').trim();
      }
    } catch (error) {
      if (error instanceof OpenAIKeyMissingError) {
        errorTranscripcion = error.message;
      } else {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        errorTranscripcion = `Fallo al transcribir audio: ${msg}`;
      }
    }
  } else {
    errorTranscripcion = 'Sin API key de transcripcion; usando analisis de senal.';
  }

  const palabrasTranscritas =
    palabrasConTiempo.length > 0
      ? palabrasConTiempo.map((p) => p.palabra)
      : tokenizarTexto(transcripcionTexto);

  const minutosVozActiva = validado.tiempoVozActivaMs / 60_000;
  const pauseRatio = clamp01(
    (validado.tiempoTotalMs - validado.tiempoVozActivaMs) / validado.tiempoTotalMs,
  );

  let analisis: {
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
  };

  if (palabrasTranscritas.length >= MIN_PALABRAS_TRANSCRIPCION) {
    const alineacion = alinearPalabrasAlTexto({
      textoObjetivo: sesion.story.contenido,
      palabrasTranscritas,
    });
    const wpmUtil =
      minutosVozActiva > 0
        ? Math.round((alineacion.totalUnicasAlineadas / minutosVozActiva) * 10) / 10
        : 0;
    const scoreVoz = clamp01(validado.tiempoVozActivaMs / VOZ_ACTIVA_REF_TRANSCRIPCION_MS);
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
    if (validado.tiempoVozActivaMs < MIN_VOZ_ACTIVA_MS_TRANSCRIPCION) motivos.push('poca voz activa');
    if (alineacion.totalHabladas < MIN_PALABRAS_TRANSCRITAS) motivos.push('muy pocas palabras transcritas');
    if (alineacion.precisionLectura < MIN_PRECISION_ALINEACION) motivos.push('baja precision de alineacion');
    if (alineacion.coberturaTexto < MIN_COBERTURA_TEXTO) motivos.push('cobertura de texto baja');
    if (errorTranscripcion) motivos.push('transcripcion parcial');

    const confiable =
      qualityScore >= UMBRAL_CALIDAD_CONFIABLE &&
      motivos.filter((m) => m !== 'transcripcion parcial').length === 0;

    analisis = {
      wpmUtil,
      precisionLectura: Math.round(alineacion.precisionLectura * 1000) / 1000,
      coberturaTexto: Math.round(alineacion.coberturaTexto * 1000) / 1000,
      pauseRatio: Math.round(pauseRatio * 1000) / 1000,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      totalPalabrasTranscritas: alineacion.totalHabladas,
      totalPalabrasAlineadas: alineacion.totalAlineadas,
      qualityScore,
      confiable,
      motivoNoConfiable: confiable ? null : motivos.join(', '),
      motor: transcribeModel,
    };
  } else {
    // Fallback puro por senal de audio (sin transcripcion util).
    const wpmEstimadoPorSenal =
      minutosVozActiva > 0 && totalPalabrasObjetivo > 0
        ? Math.round((totalPalabrasObjetivo / minutosVozActiva) * 10) / 10
        : 0;
    const duracionEsperadaMs =
      totalPalabrasObjetivo > 0 ? (totalPalabrasObjetivo / WPM_REFERENCIA_SENAL) * 60_000 : 0;
    const coberturaProxy =
      duracionEsperadaMs > 0 ? clamp01(validado.tiempoVozActivaMs / duracionEsperadaMs) : 0;
    const precisionProxy =
      wpmEstimadoPorSenal >= WPM_RAZONABLE_MIN && wpmEstimadoPorSenal <= WPM_RAZONABLE_MAX
        ? 0.6
        : 0.35;
    const scoreVoz = clamp01(validado.tiempoVozActivaMs / VOZ_ACTIVA_REF_SENAL_MS);
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
    if (validado.tiempoVozActivaMs < MIN_VOZ_ACTIVA_MS_SENAL) motivos.push('poca voz activa');
    if (wpmEstimadoPorSenal > 0 && (wpmEstimadoPorSenal < WPM_RAZONABLE_MIN || wpmEstimadoPorSenal > WPM_RAZONABLE_MAX))
      motivos.push('ritmo fuera de rango');
    if (coberturaProxy < MIN_COBERTURA_SENAL) motivos.push('voz activa insuficiente para el texto');
    if (pauseRatio > MAX_PAUSE_RATIO_CONFIABLE) motivos.push('muchas pausas');
    if (errorTranscripcion) motivos.push('sin transcripcion util');

    const confiable =
      qualityScore >= UMBRAL_CALIDAD_CONFIABLE &&
      motivos.filter((m) => m !== 'sin transcripcion util').length === 0;

    analisis = {
      wpmUtil: wpmEstimadoPorSenal,
      precisionLectura: Math.round(precisionProxy * 1000) / 1000,
      coberturaTexto: Math.round(coberturaProxy * 1000) / 1000,
      pauseRatio: Math.round(pauseRatio * 1000) / 1000,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      totalPalabrasTranscritas: palabrasTranscritas.length,
      totalPalabrasAlineadas: 0,
      qualityScore,
      confiable,
      motivoNoConfiable: confiable ? null : motivos.join(', '),
      motor: 'signal-only',
    };
  }

  return {
    ok: true as const,
    analisis,
    transcripcionPreview: transcripcionTexto.slice(0, 180),
  };
}
