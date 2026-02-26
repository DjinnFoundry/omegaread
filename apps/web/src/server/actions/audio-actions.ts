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
} from '@zetaread/db';
import { requireStudentOwnership } from '../auth';
import { analizarLecturaAudioSchema } from '../validation';
import { getOpenAIClient, hasLLMKey, OpenAIKeyMissingError } from '@/lib/ai/openai';
import {
  tokenizarTexto,
  clamp01,
  calcularAnalisisConTranscripcion,
  calcularAnalisisPorSenal,
  MIN_PALABRAS_TRANSCRIPCION_UTIL,
} from '@/lib/audio/utils';

// ─── Audio size constants ───

const MIN_AUDIO_BYTES = 8_000;
const MAX_AUDIO_BYTES = 12_000_000;

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

  const pauseRatio = clamp01(
    (validado.tiempoTotalMs - validado.tiempoVozActivaMs) / validado.tiempoTotalMs,
  );

  let analisis;

  if (palabrasTranscritas.length >= MIN_PALABRAS_TRANSCRIPCION_UTIL) {
    const resultado = calcularAnalisisConTranscripcion({
      palabrasTranscritas,
      textoObjetivo: sesion.story.contenido,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      errorTranscripcion,
      transcribeModel,
    });
    // Fill in pauseRatio which depends on tiempoTotalMs (not available in the pure helper)
    analisis = { ...resultado, pauseRatio: Math.round(pauseRatio * 1000) / 1000 };
  } else {
    analisis = calcularAnalisisPorSenal({
      totalPalabrasObjetivo,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      tiempoTotalMs: validado.tiempoTotalMs,
      palabrasTranscritas: palabrasTranscritas.length,
      errorTranscripcion,
    });
  }

  return {
    ok: true as const,
    analisis,
    transcripcionPreview: transcripcionTexto.slice(0, 180),
  };
}
