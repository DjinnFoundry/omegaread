/**
 * Question DTO mapping utilities.
 * Converts DB question rows to the shape expected by the UI.
 */
import type { TipoPregunta } from '@/lib/types/reading';

export interface PreguntaDTO {
  id: string;
  tipo: TipoPregunta;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string | null;
}

/**
 * Simple seeded PRNG (mulberry32) for deterministic shuffling.
 * Given the same seed, always produces the same sequence.
 */
function seededRandom(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives a numeric seed from a question ID string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Shuffles answer options deterministically (seeded by question ID)
 * and returns the new options array + updated correct answer index.
 */
function shuffleOpciones(
  opciones: string[],
  respuestaCorrecta: number,
  questionId: string,
): { opciones: string[]; respuestaCorrecta: number } {
  if (opciones.length <= 1) return { opciones, respuestaCorrecta };

  // Build index array [0, 1, 2, 3]
  const indices = opciones.map((_, i) => i);

  // Fisher-Yates shuffle with seeded PRNG
  const rand = seededRandom(hashString(questionId));
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffled = indices.map((i) => opciones[i]);
  const newCorrectIndex = indices.indexOf(respuestaCorrecta);

  return { opciones: shuffled, respuestaCorrecta: newCorrectIndex };
}

/**
 * Maps a DB question row to a clean DTO for the client.
 * Handles the tipo type-cast since DB stores it as a plain string.
 * Shuffles options deterministically so the correct answer isn't always first.
 */
export function mapPreguntaToDTO(p: {
  id: string;
  tipo: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string | null;
}): PreguntaDTO {
  const { opciones, respuestaCorrecta } = shuffleOpciones(
    p.opciones,
    p.respuestaCorrecta,
    p.id,
  );

  return {
    id: p.id,
    tipo: p.tipo as TipoPregunta,
    pregunta: p.pregunta,
    opciones,
    respuestaCorrecta,
    explicacion: p.explicacion,
  };
}
