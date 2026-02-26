/**
 * Typed shape of sessions.metadata JSON column.
 *
 * Step 1: type annotations only, no DB schema change.
 * The actual DB column remains `text` (JSON-serialized). These types
 * provide compile-time safety when reading/writing that JSON.
 *
 * To migrate a file from `(sesion.metadata as Record<string, unknown>)`:
 *   import { parseSessionMetadata } from '@/lib/types/session-metadata';
 *   const meta = parseSessionMetadata(sesion.metadata);
 *   // meta.comprensionScore is now `number | undefined` instead of `unknown`
 */

import type { AudioAnalisisSerialized } from '@/lib/audio/utils';
import type { StoryGenerationTrace } from '@/lib/story-generation/trace';

// Re-export so consumers can import the canonical serialized type from here
export type { AudioAnalisisSerialized };

// ─── LLM usage tracking ───

export interface LlmUsageInfo {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
}

// ─── Main session metadata shape ───

export interface SessionMetadata {
  // Index signature required so this type is assignable to Drizzle's Record<string, unknown>
  // for JSON column writes. All named fields below are still fully typed.
  [key: string]: unknown;

  // Story reference (textoId is the canonical FK; storyId is a DB column, not metadata)
  textoId?: string;

  // Topic / skill context
  topicSlug?: string;
  topicId?: string;
  skillSlug?: string;

  // Pedagogical context
  objetivoSesion?: string;
  estrategiaPedagogica?: string;

  // Difficulty level
  nivelTexto?: number;
  tiempoEsperadoMs?: number;

  // Comprehension results
  comprensionScore?: number;
  totalPreguntas?: number;
  aciertos?: number;
  sessionScore?: number;

  // Reading completion
  lecturaCompletada?: boolean;
  lecturaCompletadaEn?: string;
  tiempoLecturaMs?: number;
  fuenteWpm?: 'audio' | 'pagina';

  // Robust WPM measurement
  wpmRobusto?: number;
  wpmConfianza?: 'high' | 'medium' | 'low';

  // Audio analysis (serialized subset stored in metadata)
  audioAnalisis?: AudioAnalisisSerialized | null;

  // Manual adjustment (rewrite)
  ajusteManual?: 'mas_facil' | 'mas_desafiante';
  storyIdOriginal?: string;

  // Cache flag
  fromCache?: boolean;

  // Fun mode
  funMode?: boolean;

  // LLM model tracking
  llmStoryModel?: string;
  llmStoryUsage?: LlmUsageInfo;
  llmQuestionsModel?: string;
  llmQuestionsUsage?: LlmUsageInfo;

  // Progress trace (story-generation trace sessions)
  generationTrace?: StoryGenerationTrace;
}

// ─── Helpers ───

/**
 * Type-safe reader for session metadata.
 * Accepts the raw `unknown` value from the DB column and returns
 * a properly-typed object. Never throws.
 */
export function parseSessionMetadata(raw: unknown): SessionMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  if (typeof raw !== 'object' || raw === null) return {};
  return raw as SessionMetadata;
}

/**
 * Type-safe partial update for session metadata.
 * Spreads existing fields and overlays the updates.
 */
export function mergeSessionMetadata(
  existing: unknown,
  updates: Partial<SessionMetadata>,
): SessionMetadata {
  const current = parseSessionMetadata(existing);
  return { ...current, ...updates };
}
