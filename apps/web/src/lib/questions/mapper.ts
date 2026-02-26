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
 * Maps a DB question row to a clean DTO for the client.
 * Handles the tipo type-cast since DB stores it as a plain string.
 */
export function mapPreguntaToDTO(p: {
  id: string;
  tipo: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string | null;
}): PreguntaDTO {
  return {
    id: p.id,
    tipo: p.tipo as TipoPregunta,
    pregunta: p.pregunta,
    opciones: p.opciones,
    respuestaCorrecta: p.respuestaCorrecta,
    explicacion: p.explicacion,
  };
}
