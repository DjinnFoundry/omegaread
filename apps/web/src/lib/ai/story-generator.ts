/**
 * Pipeline de generacion de historias.
 * Orquesta: prompt → LLM → parseo → QA → resultado.
 */
import { getOpenAIClient, OpenAIKeyMissingError } from './openai';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRewritePrompt,
  buildStoryOnlySystemPrompt,
  buildStoryOnlyUserPrompt,
  buildQuestionsSystemPrompt,
  buildQuestionsUserPrompt,
  type PromptInput,
  type RewritePromptInput,
  type QuestionsPromptInput,
} from './prompts';
import {
  validarEstructura,
  evaluarHistoria,
  calcularMetadataHistoria,
  validarEstructuraHistoria,
  validarEstructuraPreguntas,
  evaluarHistoriaSinPreguntas,
  evaluarPreguntas,
  type StoryLLMOutput,
  type StoryOnlyLLMOutput,
  type QuestionsLLMOutput,
  type QAResult,
} from './qa-rubric';

import { getLLMModel } from './openai';
// Reintentos automaticos desactivados por UX/latencia.
// 0 = una sola llamada al LLM y, si falla, el reintento queda en manos del usuario.
const MAX_REINTENTOS = 0;

export interface GeneratedStory {
  titulo: string;
  contenido: string;
  vocabularioNuevo: string[];
  metadata: {
    longitudPalabras: number;
    longitudOracionMedia: number;
    vocabularioNuevo: string[];
    edadObjetivo: number;
    tiempoEsperadoMs: number;
  };
  preguntas: Array<{
    tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
    dificultadPregunta: number;
  }>;
  modelo: string;
  aprobadaQA: boolean;
  motivoRechazo?: string;
}

export type StoryGenerationResult =
  | { ok: true; story: GeneratedStory }
  | {
      ok: false;
      error: string;
      code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED';
    };

/**
 * Genera una historia + preguntas via LLM con reintentos y QA.
 */
export async function generateStory(input: PromptInput): Promise<StoryGenerationResult> {
  let client;
  let model: string;
  try {
    client = await getOpenAIClient();
    model = await getLLMModel();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  const systemPrompt = buildSystemPrompt();

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const userPrompt = buildUserPrompt(input, {
      retryHint: intento > 0 ? lastError : undefined,
      intento: intento + 1,
    });

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        lastError = 'El LLM no devolvio contenido';
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'El LLM devolvio JSON invalido';
        continue;
      }

      if (!validarEstructura(parsed)) {
        lastError = 'Estructura de respuesta invalida';
        continue;
      }

      const storyOutput = parsed as StoryLLMOutput;
      const qa: QAResult = evaluarHistoria(storyOutput, input.nivel, {
        historiasAnteriores: input.historiasAnteriores,
      });

      const metadataCalc = calcularMetadataHistoria(
        storyOutput.contenido,
        input.edadAnos,
        input.nivel,
      );

      const story: GeneratedStory = {
        titulo: storyOutput.titulo,
        contenido: storyOutput.contenido,
        vocabularioNuevo: storyOutput.vocabularioNuevo,
        metadata: {
          ...metadataCalc,
          vocabularioNuevo: storyOutput.vocabularioNuevo,
        },
        preguntas: storyOutput.preguntas.map((p) => ({
          ...p,
          tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
          dificultadPregunta: p.dificultadPregunta ?? 3,
        })),
        modelo: model,
        aprobadaQA: qa.aprobada,
        motivoRechazo: qa.motivo,
      };

      if (!qa.aprobada) {
        // Si el QA fallo, reintentamos
        lastError = qa.motivo ?? 'QA rechazada sin motivo';
        continue;
      }

      return { ok: true, story };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      lastError = `Error de API: ${msg}`;
    }
  }

  return {
    ok: false,
    error: `No se pudo generar historia despues de ${MAX_REINTENTOS + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}

// ─────────────────────────────────────────────
// FLUJO DIVIDIDO: HISTORIA + PREGUNTAS POR SEPARADO
// ─────────────────────────────────────────────

export interface GeneratedStoryOnly {
  titulo: string;
  contenido: string;
  vocabularioNuevo: string[];
  metadata: {
    longitudPalabras: number;
    longitudOracionMedia: number;
    vocabularioNuevo: string[];
    edadObjetivo: number;
    tiempoEsperadoMs: number;
  };
  modelo: string;
  aprobadaQA: boolean;
  motivoRechazo?: string;
}

export interface GeneratedQuestions {
  preguntas: Array<{
    tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
    dificultadPregunta: number;
  }>;
  modelo: string;
  aprobadaQA: boolean;
  motivoRechazo?: string;
}

export type StoryOnlyResult =
  | { ok: true; story: GeneratedStoryOnly }
  | {
      ok: false;
      error: string;
      code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED';
    };

export type QuestionsResult =
  | { ok: true; questions: GeneratedQuestions }
  | {
      ok: false;
      error: string;
      code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED';
    };

/**
 * Genera SOLO la historia (sin preguntas) via LLM.
 * Mas rapido porque produce menos tokens y el LLM se enfoca en narrativa.
 */
export async function generateStoryOnly(input: PromptInput): Promise<StoryOnlyResult> {
  let client;
  let model: string;
  try {
    client = await getOpenAIClient();
    model = await getLLMModel();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  const systemPrompt = buildStoryOnlySystemPrompt();

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const userPrompt = buildStoryOnlyUserPrompt(input, {
      retryHint: intento > 0 ? lastError : undefined,
      intento: intento + 1,
    });

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        lastError = 'El LLM no devolvio contenido';
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'El LLM devolvio JSON invalido';
        continue;
      }

      if (!validarEstructuraHistoria(parsed)) {
        lastError = 'Estructura de respuesta invalida (historia)';
        continue;
      }

      const storyOutput = parsed as StoryOnlyLLMOutput;
      const qa: QAResult = evaluarHistoriaSinPreguntas(storyOutput, input.nivel, {
        historiasAnteriores: input.historiasAnteriores,
      });

      const metadataCalc = calcularMetadataHistoria(
        storyOutput.contenido,
        input.edadAnos,
        input.nivel,
      );

      const story: GeneratedStoryOnly = {
        titulo: storyOutput.titulo,
        contenido: storyOutput.contenido,
        vocabularioNuevo: storyOutput.vocabularioNuevo,
        metadata: {
          ...metadataCalc,
          vocabularioNuevo: storyOutput.vocabularioNuevo,
        },
        modelo: model,
        aprobadaQA: qa.aprobada,
        motivoRechazo: qa.motivo,
      };

      if (!qa.aprobada) {
        lastError = qa.motivo ?? 'QA rechazada sin motivo';
        continue;
      }

      return { ok: true, story };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      lastError = `Error de API: ${msg}`;
    }
  }

  return {
    ok: false,
    error: `No se pudo generar historia despues de ${MAX_REINTENTOS + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}

/**
 * Genera preguntas de comprension para una historia existente.
 * Se ejecuta en background mientras el nino lee.
 */
export async function generateQuestions(input: QuestionsPromptInput): Promise<QuestionsResult> {
  let client;
  let model: string;
  try {
    client = await getOpenAIClient();
    model = await getLLMModel();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  const systemPrompt = buildQuestionsSystemPrompt();
  const userPrompt = buildQuestionsUserPrompt(input);

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        lastError = 'El LLM no devolvio contenido';
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'El LLM devolvio JSON invalido';
        continue;
      }

      if (!validarEstructuraPreguntas(parsed)) {
        lastError = 'Estructura de preguntas invalida';
        continue;
      }

      const questionsOutput = parsed as QuestionsLLMOutput;
      const qa: QAResult = evaluarPreguntas(questionsOutput);

      const questions: GeneratedQuestions = {
        preguntas: questionsOutput.preguntas.map((p) => ({
          ...p,
          tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
          dificultadPregunta: p.dificultadPregunta ?? 3,
        })),
        modelo: model,
        aprobadaQA: qa.aprobada,
        motivoRechazo: qa.motivo,
      };

      if (!qa.aprobada) {
        lastError = qa.motivo ?? 'QA preguntas rechazada sin motivo';
        continue;
      }

      return { ok: true, questions };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      lastError = `Error de API: ${msg}`;
    }
  }

  return {
    ok: false,
    error: `No se pudieron generar preguntas despues de ${MAX_REINTENTOS + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}

/**
 * Reescribe una historia existente ajustando la dificultad.
 * Mantiene personajes y trama, cambia complejidad lexica y longitud.
 */
export async function rewriteStory(input: RewritePromptInput): Promise<StoryGenerationResult> {
  let client;
  let model: string;
  try {
    client = await getOpenAIClient();
    model = await getLLMModel();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildRewritePrompt(input);

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        lastError = 'El LLM no devolvio contenido';
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'El LLM devolvio JSON invalido';
        continue;
      }

      if (!validarEstructura(parsed)) {
        lastError = 'Estructura de respuesta invalida';
        continue;
      }

      const storyOutput = parsed as StoryLLMOutput;
      const nivelObjetivo =
        input.direccion === 'mas_facil'
          ? Math.max(1, input.nivelActual - 1)
          : Math.min(4, input.nivelActual + 1);
      const qa: QAResult = evaluarHistoria(storyOutput, nivelObjetivo);

      const metadataCalc = calcularMetadataHistoria(
        storyOutput.contenido,
        input.edadAnos,
        nivelObjetivo,
      );

      const story: GeneratedStory = {
        titulo: storyOutput.titulo,
        contenido: storyOutput.contenido,
        vocabularioNuevo: storyOutput.vocabularioNuevo,
        metadata: {
          ...metadataCalc,
          vocabularioNuevo: storyOutput.vocabularioNuevo,
        },
        preguntas: storyOutput.preguntas.map((p) => ({
          ...p,
          tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
          dificultadPregunta: p.dificultadPregunta ?? 3,
        })),
        modelo: model,
        aprobadaQA: qa.aprobada,
        motivoRechazo: qa.motivo,
      };

      if (!qa.aprobada) {
        lastError = qa.motivo ?? 'QA rechazada sin motivo';
        continue;
      }

      return { ok: true, story };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      lastError = `Error de API: ${msg}`;
    }
  }

  return {
    ok: false,
    error: `No se pudo reescribir historia despues de ${MAX_REINTENTOS + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}
