/**
 * Rubrica QA automatica para historias generadas.
 *
 * Rechaza contenido que sea:
 * - Inseguro (palabras prohibidas)
 * - Fuera de nivel (longitud incorrecta)
 * - Mal estructurado (faltan campos)
 */

import type { TipoPregunta } from '@/lib/types/reading';
import { getNivelConfig } from './prompts';

export interface StoryLLMOutput {
  titulo: string;
  contenido: string;
  vocabularioNuevo: string[];
  preguntas: Array<{
    tipo: string;
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
  }>;
}

export interface QAResult {
  aprobada: boolean;
  motivo?: string;
}

const PALABRAS_PROHIBIDAS = [
  'muerte', 'muerto', 'matar', 'sangre', 'arma', 'pistola', 'cuchillo',
  'droga', 'alcohol', 'cerveza', 'vino', 'borracho',
  'sexo', 'sexy', 'desnudo',
  'odio', 'estupido', 'idiota', 'imbecil', 'tonto',
  'demonio', 'diablo', 'infierno',
  'suicidio', 'suicida',
];

const TIPOS_REQUERIDOS: TipoPregunta[] = ['literal', 'inferencia', 'vocabulario', 'resumen'];

/**
 * Valida la estructura basica del output del LLM.
 */
export function validarEstructura(data: unknown): data is StoryLLMOutput {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.titulo !== 'string' || d.titulo.length === 0) return false;
  if (typeof d.contenido !== 'string' || d.contenido.length === 0) return false;
  if (!Array.isArray(d.vocabularioNuevo)) return false;
  if (!Array.isArray(d.preguntas) || d.preguntas.length !== 4) return false;

  for (const p of d.preguntas) {
    if (!p || typeof p !== 'object') return false;
    const q = p as Record<string, unknown>;
    if (typeof q.tipo !== 'string') return false;
    if (typeof q.pregunta !== 'string') return false;
    if (!Array.isArray(q.opciones) || q.opciones.length !== 4) return false;
    if (typeof q.respuestaCorrecta !== 'number') return false;
    if (q.respuestaCorrecta < 0 || q.respuestaCorrecta > 3) return false;
    if (typeof q.explicacion !== 'string') return false;
  }

  return true;
}

/**
 * Ejecuta la rubrica QA completa sobre la historia generada.
 */
export function evaluarHistoria(story: StoryLLMOutput, nivel: number): QAResult {
  // 1. Validar contenido seguro
  const textoCompleto = `${story.titulo} ${story.contenido}`.toLowerCase();
  for (const palabra of PALABRAS_PROHIBIDAS) {
    if (textoCompleto.includes(palabra)) {
      return { aprobada: false, motivo: `Contenido inseguro: contiene "${palabra}"` };
    }
  }

  // 2. Validar longitud
  const config = getNivelConfig(nivel);
  const palabras = story.contenido.split(/\s+/).filter(w => w.length > 0).length;
  const tolerancia = 0.3; // 30% de margen

  if (palabras < config.palabrasMin * (1 - tolerancia)) {
    return {
      aprobada: false,
      motivo: `Historia muy corta: ${palabras} palabras (minimo ~${config.palabrasMin})`,
    };
  }

  if (palabras > config.palabrasMax * (1 + tolerancia)) {
    return {
      aprobada: false,
      motivo: `Historia muy larga: ${palabras} palabras (maximo ~${config.palabrasMax})`,
    };
  }

  // 3. Validar tipos de preguntas
  const tiposPresentes = story.preguntas.map(p => p.tipo);
  for (const tipo of TIPOS_REQUERIDOS) {
    if (!tiposPresentes.includes(tipo)) {
      return { aprobada: false, motivo: `Falta pregunta de tipo: ${tipo}` };
    }
  }

  // 4. Validar opciones de preguntas
  for (const pregunta of story.preguntas) {
    if (pregunta.opciones.some(o => typeof o !== 'string' || o.length === 0)) {
      return { aprobada: false, motivo: `Pregunta "${pregunta.tipo}" tiene opciones vacias` };
    }
    if (pregunta.respuestaCorrecta < 0 || pregunta.respuestaCorrecta > 3) {
      return { aprobada: false, motivo: `Pregunta "${pregunta.tipo}" tiene indice de respuesta invalido` };
    }
  }

  // 5. Validar que el titulo no este vacio ni sea generico
  if (story.titulo.length < 3) {
    return { aprobada: false, motivo: 'Titulo demasiado corto' };
  }

  return { aprobada: true };
}

/**
 * Calcula metadata de la historia para almacenamiento.
 */
export function calcularMetadataHistoria(contenido: string, edadAnos: number, nivel: number) {
  const palabras = contenido.split(/\s+/).filter(w => w.length > 0);
  const oraciones = contenido.split(/[.!?]+/).filter(o => o.trim().length > 0);
  const longitudOracionMedia = oraciones.length > 0
    ? Math.round(palabras.length / oraciones.length)
    : palabras.length;

  const config = getNivelConfig(nivel);

  return {
    longitudPalabras: palabras.length,
    longitudOracionMedia,
    edadObjetivo: edadAnos,
    tiempoEsperadoMs: config.tiempoEsperadoMs,
  };
}
