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
import { normalizarTexto } from '@/lib/utils/text';

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
    dificultadPregunta?: number;
  }>;
}

/** Output de generacion de historia sin preguntas (flujo dividido). */
export interface StoryOnlyLLMOutput {
  titulo: string;
  contenido: string;
  vocabularioNuevo: string[];
}

/** Output de generacion de preguntas por separado (flujo dividido). */
export interface QuestionsLLMOutput {
  preguntas: Array<{
    tipo: string;
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
    dificultadPregunta?: number;
  }>;
}

export interface QAResult {
  aprobada: boolean;
  motivo?: string;
}

export interface QAContext {
  historiasAnteriores?: string[];
}

const PALABRAS_PROHIBIDAS = [
  'sexo', 'sexy', 'desnudo',
  'droga',
  'suicidio', 'suicida',
];

const TIPOS_REQUERIDOS: TipoPregunta[] = ['literal', 'inferencia', 'vocabulario', 'resumen'];
const APERTURAS_PLANAS = [
  'en este texto',
  'en esta lectura',
  'hoy aprenderemos',
  'a continuacion',
  'vamos a aprender',
  'este texto trata',
];
const CONECTORES_NARRATIVOS = [
  'un dia',
  'de pronto',
  'entonces',
  'pero',
  'cuando',
  'mientras',
  'al final',
  'despues',
  'por eso',
];

function tokens(value: string): Set<string> {
  return new Set(
    normalizarTexto(value)
      .split(' ')
      .filter(t => t.length >= 2),
  );
}

function similitudTexto(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let inter = 0;
  for (const token of ta) {
    if (tb.has(token)) inter++;
  }

  return (2 * inter) / (ta.size + tb.size);
}

function tieneAperturaPlana(contenido: string): boolean {
  const inicio = normalizarTexto(contenido).slice(0, 80);
  return APERTURAS_PLANAS.some(apertura => inicio.startsWith(apertura));
}

function tieneConectoresNarrativos(contenido: string): boolean {
  const texto = normalizarTexto(contenido);
  return CONECTORES_NARRATIVOS.some(conn => texto.includes(conn));
}

function opcionesAmbiguas(
  opciones: string[],
  respuestaCorrecta: number,
): string | null {
  const normalizadas = opciones.map(o => normalizarTexto(o));

  // Opciones duplicadas o casi vacias
  const set = new Set(normalizadas);
  if (set.size !== normalizadas.length) {
    return 'opciones duplicadas';
  }

  const correcta = opciones[respuestaCorrecta] ?? '';
  if (!correcta.trim()) return 'respuesta correcta vacia';

  return null;
}

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
    // dificultadPregunta es opcional (backward compat), pero si existe debe ser 1-5
    if (q.dificultadPregunta !== undefined) {
      if (typeof q.dificultadPregunta !== 'number') return false;
      if (q.dificultadPregunta < 1 || q.dificultadPregunta > 5) return false;
      if (!Number.isInteger(q.dificultadPregunta)) return false;
    }
  }

  return true;
}

/**
 * Ejecuta la rubrica QA completa sobre la historia generada.
 */
export function evaluarHistoria(
  story: StoryLLMOutput,
  nivel: number,
  context?: QAContext,
): QAResult {
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
    const motivoAmbigua = opcionesAmbiguas(pregunta.opciones, pregunta.respuestaCorrecta);
    if (motivoAmbigua) {
      return {
        aprobada: false,
        motivo: `Pregunta "${pregunta.tipo}" con opciones ambiguas: ${motivoAmbigua}`,
      };
    }
  }

  // 5. Validar que el titulo no este vacio ni sea generico
  if (story.titulo.length < 3) {
    return { aprobada: false, motivo: 'Titulo demasiado corto' };
  }

  // 6. Evitar titulos repetidos en historial reciente
  if (context?.historiasAnteriores && context.historiasAnteriores.length > 0) {
    const tituloActual = normalizarTexto(story.titulo);
    for (const tituloAnterior of context.historiasAnteriores) {
      const tituloPrevio = normalizarTexto(tituloAnterior);
      if (!tituloPrevio) continue;
      if (tituloActual === tituloPrevio || similitudTexto(tituloActual, tituloPrevio) >= 0.9) {
        return {
          aprobada: false,
          motivo: 'Titulo repetido o muy similar a una historia reciente',
        };
      }
    }
  }

  // 7. Detectar historias planas/poco engaging
  if (tieneAperturaPlana(story.contenido)) {
    return {
      aprobada: false,
      motivo: 'Inicio poco engaging: apertura plana tipo texto escolar',
    };
  }

  if (!tieneConectoresNarrativos(story.contenido)) {
    return {
      aprobada: false,
      motivo: 'Historia plana: faltan conectores narrativos que creen progresion',
    };
  }

  return { aprobada: true };
}

// ─────────────────────────────────────────────
// VALIDADORES PARA FLUJO DIVIDIDO
// ─────────────────────────────────────────────

/**
 * Valida la estructura del output de historia sin preguntas.
 */
export function validarEstructuraHistoria(data: unknown): data is StoryOnlyLLMOutput {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  if (typeof d.titulo !== 'string' || d.titulo.length === 0) return false;
  if (typeof d.contenido !== 'string' || d.contenido.length === 0) return false;
  if (!Array.isArray(d.vocabularioNuevo)) return false;

  return true;
}

/**
 * Valida la estructura del output de preguntas por separado.
 */
export function validarEstructuraPreguntas(data: unknown): data is QuestionsLLMOutput {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

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
    if (q.dificultadPregunta !== undefined) {
      if (typeof q.dificultadPregunta !== 'number') return false;
      if (q.dificultadPregunta < 1 || q.dificultadPregunta > 5) return false;
      if (!Number.isInteger(q.dificultadPregunta)) return false;
    }
  }

  return true;
}

/**
 * Rubrica QA para historia sin preguntas (flujo dividido).
 */
export function evaluarHistoriaSinPreguntas(
  story: StoryOnlyLLMOutput,
  nivel: number,
  context?: QAContext,
): QAResult {
  // 1. Contenido seguro
  const textoCompleto = `${story.titulo} ${story.contenido}`.toLowerCase();
  for (const palabra of PALABRAS_PROHIBIDAS) {
    if (textoCompleto.includes(palabra)) {
      return { aprobada: false, motivo: `Contenido inseguro: contiene "${palabra}"` };
    }
  }

  // 2. Validar longitud
  const config = getNivelConfig(nivel);
  const palabras = story.contenido.split(/\s+/).filter(w => w.length > 0).length;
  const tolerancia = 0.3;

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

  // 3. Titulo
  if (story.titulo.length < 3) {
    return { aprobada: false, motivo: 'Titulo demasiado corto' };
  }

  // 4. Titulo repetido
  if (context?.historiasAnteriores && context.historiasAnteriores.length > 0) {
    const tituloActual = normalizarTexto(story.titulo);
    for (const tituloAnterior of context.historiasAnteriores) {
      const tituloPrevio = normalizarTexto(tituloAnterior);
      if (!tituloPrevio) continue;
      if (tituloActual === tituloPrevio || similitudTexto(tituloActual, tituloPrevio) >= 0.9) {
        return {
          aprobada: false,
          motivo: 'Titulo repetido o muy similar a una historia reciente',
        };
      }
    }
  }

  // 5. Apertura plana
  if (tieneAperturaPlana(story.contenido)) {
    return {
      aprobada: false,
      motivo: 'Inicio poco engaging: apertura plana tipo texto escolar',
    };
  }

  // 6. Conectores narrativos
  if (!tieneConectoresNarrativos(story.contenido)) {
    return {
      aprobada: false,
      motivo: 'Historia plana: faltan conectores narrativos que creen progresion',
    };
  }

  return { aprobada: true };
}

/**
 * Rubrica QA para preguntas generadas por separado.
 */
export function evaluarPreguntas(questions: QuestionsLLMOutput): QAResult {
  // 1. Tipos requeridos
  const tiposPresentes = questions.preguntas.map(p => p.tipo);
  for (const tipo of TIPOS_REQUERIDOS) {
    if (!tiposPresentes.includes(tipo)) {
      return { aprobada: false, motivo: `Falta pregunta de tipo: ${tipo}` };
    }
  }

  // 2. Opciones validas
  for (const pregunta of questions.preguntas) {
    if (pregunta.opciones.some(o => typeof o !== 'string' || o.length === 0)) {
      return { aprobada: false, motivo: `Pregunta "${pregunta.tipo}" tiene opciones vacias` };
    }
    if (pregunta.respuestaCorrecta < 0 || pregunta.respuestaCorrecta > 3) {
      return { aprobada: false, motivo: `Pregunta "${pregunta.tipo}" tiene indice de respuesta invalido` };
    }
    const motivoAmbigua = opcionesAmbiguas(pregunta.opciones, pregunta.respuestaCorrecta);
    if (motivoAmbigua) {
      return {
        aprobada: false,
        motivo: `Pregunta "${pregunta.tipo}" con opciones ambiguas: ${motivoAmbigua}`,
      };
    }
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
