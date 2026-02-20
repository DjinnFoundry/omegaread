/**
 * Pipeline de generacion de historias.
 * Orquesta: prompt → LLM → parseo → QA → resultado.
 */
import { getOpenAIClient, OpenAIKeyMissingError } from './openai';
import { buildSystemPrompt, buildUserPrompt, type PromptInput } from './prompts';
import {
  validarEstructura,
  evaluarHistoria,
  calcularMetadataHistoria,
  type StoryLLMOutput,
  type QAResult,
} from './qa-rubric';

const MODELO = 'gpt-4o-mini';
const MAX_REINTENTOS = 2;

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
  }>;
  modelo: string;
  aprobadaQA: boolean;
  motivoRechazo?: string;
}

export type StoryGenerationResult =
  | { ok: true; story: GeneratedStory }
  | { ok: false; error: string; code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED' };

/**
 * Genera una historia + preguntas via LLM con reintentos y QA.
 */
export async function generateStory(input: PromptInput): Promise<StoryGenerationResult> {
  let client;
  try {
    client = getOpenAIClient();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODELO,
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
      const qa: QAResult = evaluarHistoria(storyOutput, input.nivel);

      const metadataCalc = calcularMetadataHistoria(
        storyOutput.contenido,
        input.edadAnos,
        input.nivel
      );

      const story: GeneratedStory = {
        titulo: storyOutput.titulo,
        contenido: storyOutput.contenido,
        vocabularioNuevo: storyOutput.vocabularioNuevo,
        metadata: {
          ...metadataCalc,
          vocabularioNuevo: storyOutput.vocabularioNuevo,
        },
        preguntas: storyOutput.preguntas.map(p => ({
          ...p,
          tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
        })),
        modelo: MODELO,
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
