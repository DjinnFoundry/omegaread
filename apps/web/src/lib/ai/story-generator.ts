/**
 * Pipeline de generacion de historias.
 * Orquesta: prompt -> LLM -> parseo -> QA -> resultado.
 *
 * Usa callLLM() para la comunicacion con el LLM, eliminando boilerplate
 * repetido de retry/parseo/JSON en cada funcion generadora.
 */
import { callLLM, type LLMUsageSnapshot, type CallLLMResult } from './call-llm';
import { normalizarTexto } from '@/lib/utils/text';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRewritePrompt,
  buildStoryOnlySystemPrompt,
  buildStoryOnlyUserPrompt,
  buildQuestionsSystemPrompt,
  buildQuestionsUserPrompt,
  getQuestionDifficultyPlan,
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

// Re-export for backwards compatibility
export type { LLMUsageSnapshot } from './call-llm';

// Reintentos balanceados para mejorar fiabilidad sin disparar latencia:
// - Llamada LLM: 1 retry transitorio (2 intentos max).
// - QA de historia: 1 reintento (2 intentos max).
const MAX_REINTENTOS = 1;
const MAX_QA_RETRIES = 1;
const TIPOS_PREGUNTA_CANONICOS = ['literal', 'inferencia', 'vocabulario', 'resumen'] as const;

type TipoPreguntaCanonico = (typeof TIPOS_PREGUNTA_CANONICOS)[number];

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizarTipoPregunta(value: unknown): TipoPreguntaCanonico | null {
  if (typeof value !== 'string') return null;
  const tipo = normalizarTexto(value);
  if (!tipo) return null;
  if (tipo.includes('literal') || tipo.includes('explicita') || tipo.includes('texto')) {
    return 'literal';
  }
  if (tipo.includes('inferen') || tipo.includes('deduc') || tipo.includes('implic')) {
    return 'inferencia';
  }
  if (tipo.includes('vocab') || tipo.includes('palabra') || tipo.includes('significado')) {
    return 'vocabulario';
  }
  if (tipo.includes('resumen') || tipo.includes('principal') || tipo.includes('tema')) {
    return 'resumen';
  }
  return null;
}

function extraerOpciones(raw: unknown): string[] | null {
  if (Array.isArray(raw)) {
    const opciones = raw
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter(Boolean)
      .slice(0, 4);
    return opciones.length === 4 ? opciones : null;
  }

  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  const porLetras = ['a', 'b', 'c', 'd'].map((k) => obj[k] ?? obj[k.toUpperCase()]);
  if (porLetras.every((v) => typeof v === 'string' && v.trim().length > 0)) {
    return porLetras.map((v) => (v as string).trim());
  }

  const porValores = Object.values(obj)
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, 4);
  return porValores.length === 4 ? porValores : null;
}

function extraerIndiceCorrecto(raw: unknown, opciones: string[]): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw <= 3) {
    return raw;
  }

  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;

  const numeric = Number.parseInt(cleaned, 10);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 3) return numeric;

  const letras = { a: 0, b: 1, c: 2, d: 3 } as const;
  if (cleaned in letras) return letras[cleaned as keyof typeof letras];

  const idxTexto = opciones.findIndex(
    (op) => normalizarTexto(op) === normalizarTexto(cleaned),
  );
  return idxTexto >= 0 ? idxTexto : null;
}

function normalizarDificultad(raw: unknown): number {
  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function normalizarPreguntasLLM(data: unknown): QuestionsLLMOutput | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const rawPreguntas = Array.isArray(root.preguntas)
    ? root.preguntas
    : Array.isArray(root.questions)
      ? root.questions
      : null;

  if (!rawPreguntas) return null;

  const candidatas: QuestionsLLMOutput['preguntas'] = [];

  for (const item of rawPreguntas) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;

    const tipo = normalizarTipoPregunta(q.tipo ?? q.type ?? q.categoria);
    const preguntaRaw = q.pregunta ?? q.question;
    const pregunta = typeof preguntaRaw === 'string' ? preguntaRaw.trim() : '';
    const opciones = extraerOpciones(q.opciones ?? q.options ?? q.choices ?? q.respuestas);
    const respuestaCorrecta = opciones
      ? extraerIndiceCorrecto(
          q.respuestaCorrecta ?? q.correctAnswer ?? q.correct_option ?? q.answer,
          opciones,
        )
      : null;

    if (!tipo || !pregunta || !opciones || respuestaCorrecta === null) continue;

    const explicacionRaw = q.explicacion ?? q.explanation;
    const explicacion = typeof explicacionRaw === 'string'
      ? explicacionRaw.trim()
      : 'La respuesta correcta es la que mejor coincide con lo que cuenta la historia.';

    candidatas.push({
      tipo,
      pregunta,
      opciones,
      respuestaCorrecta,
      explicacion: explicacion || 'La respuesta correcta es la que mejor coincide con la historia.',
      dificultadPregunta: normalizarDificultad(q.dificultadPregunta ?? q.dificultad ?? q.difficulty),
    });
  }

  if (candidatas.length === 0) return null;

  const porTipo = new Map<TipoPreguntaCanonico, QuestionsLLMOutput['preguntas'][number]>();
  for (const c of candidatas) {
    if (!porTipo.has(c.tipo as TipoPreguntaCanonico)) {
      porTipo.set(c.tipo as TipoPreguntaCanonico, c);
    }
  }

  const preguntas = TIPOS_PREGUNTA_CANONICOS
    .map((tipo) => porTipo.get(tipo))
    .filter((q): q is QuestionsLLMOutput['preguntas'][number] => !!q);

  if (preguntas.length !== 4) return null;

  return { preguntas };
}

// ─────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────

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
    generationFlags?: {
      funMode?: boolean;
    };
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
  llmUsage: LLMUsageSnapshot;
}

export type StoryGenerationResult =
  | { ok: true; story: GeneratedStory }
  | {
      ok: false;
      error: string;
      code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED';
    };

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
    generationFlags?: {
      funMode?: boolean;
    };
  };
  modelo: string;
  aprobadaQA: boolean;
  motivoRechazo?: string;
  llmUsage: LLMUsageSnapshot;
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
  llmUsage: LLMUsageSnapshot;
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

// ─────────────────────────────────────────────
// HELPER: build GeneratedStory from validated LLM output
// ─────────────────────────────────────────────

function buildGeneratedStory(
  storyOutput: StoryLLMOutput,
  qa: QAResult,
  edadAnos: number,
  nivel: number,
  llmResult: CallLLMResult,
): GeneratedStory {
  const metadataCalc = calcularMetadataHistoria(storyOutput.contenido, edadAnos, nivel);
  return {
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
    modelo: llmResult.model,
    aprobadaQA: qa.aprobada,
    motivoRechazo: qa.motivo,
    llmUsage: llmResult.usage,
  };
}

// ─────────────────────────────────────────────
// GENERATORS
// ─────────────────────────────────────────────

/**
 * Genera una historia + preguntas via LLM con reintentos y QA.
 * Si QA rechaza, reintenta hasta MAX_QA_RETRIES veces antes de fallar.
 */
export async function generateStory(input: PromptInput): Promise<StoryGenerationResult> {
  const maxTokens = envInt('LLM_MAX_TOKENS_STORY', 1200);
  const systemPrompt = buildSystemPrompt();

  let lastError = '';
  for (let attempt = 0; attempt <= MAX_QA_RETRIES; attempt++) {
    const retryHint = attempt > 0 ? lastError : undefined;
    const userPrompt = buildUserPrompt(input, {
      intento: attempt + 1,
      retryHint,
    });

    const outcome = await callLLM({
      systemPrompt,
      userMessage: userPrompt,
      maxRetries: MAX_REINTENTOS,
      temperature: 0.8 + attempt * 0.05,
      maxTokens,
      modelEnvVar: 'LLM_MODEL_STORY',
      logTag: `generateStory[${attempt}]`,
    });

    if (!outcome.ok) {
      return { ok: false, error: outcome.error, code: outcome.code };
    }

    const { result } = outcome;
    const { parsed } = result;

    if (!validarEstructura(parsed)) {
      lastError = 'Estructura de respuesta invalida';
      console.warn(`[generateStory] QA retry ${attempt + 1}/${MAX_QA_RETRIES + 1}: ${lastError}`);
      continue;
    }

    const storyOutput = parsed as StoryLLMOutput;
    const qa = evaluarHistoria(storyOutput, input.nivel, {
      historiasAnteriores: input.historiasAnteriores,
      permitirSinTildes: input.lecturaSinTildes === true,
    });

    if (!qa.aprobada) {
      lastError = qa.motivo ?? 'QA rechazada sin motivo';
      console.warn(`[generateStory] QA retry ${attempt + 1}/${MAX_QA_RETRIES + 1}: ${lastError}`);
      continue;
    }

    const story = buildGeneratedStory(storyOutput, qa, input.edadAnos, input.nivel, result);
    return { ok: true, story };
  }

  return { ok: false, error: lastError, code: 'GENERATION_FAILED' };
}

/**
 * Genera SOLO la historia (sin preguntas) via LLM.
 * Mas rapido porque produce menos tokens y el LLM se enfoca en narrativa.
 * Si QA rechaza, reintenta hasta MAX_QA_RETRIES veces antes de fallar.
 */
export async function generateStoryOnly(input: PromptInput): Promise<StoryOnlyResult> {
  const maxTokens = envInt('LLM_MAX_TOKENS_STORY', 900);
  const fastPromptMode = envFlag('LLM_FAST_STORY_PROMPT', true);
  const systemPrompt = buildStoryOnlySystemPrompt();

  let lastError = '';
  for (let attempt = 0; attempt <= MAX_QA_RETRIES; attempt++) {
    const retryHint = attempt > 0 ? lastError : undefined;
    const userPrompt = buildStoryOnlyUserPrompt(input, {
      intento: attempt + 1,
      retryHint,
      fastMode: fastPromptMode,
    });

    const outcome = await callLLM({
      systemPrompt,
      userMessage: userPrompt,
      maxRetries: MAX_REINTENTOS,
      temperature: 0.8 + attempt * 0.05,
      maxTokens,
      modelEnvVar: 'LLM_MODEL_STORY',
      logTag: `generateStoryOnly[${attempt}]`,
    });

    if (!outcome.ok) {
      return { ok: false, error: outcome.error, code: outcome.code };
    }

    const { result } = outcome;
    const { parsed } = result;

    if (!validarEstructuraHistoria(parsed)) {
      lastError = 'Estructura de respuesta invalida (historia)';
      console.warn(`[generateStoryOnly] QA retry ${attempt + 1}/${MAX_QA_RETRIES + 1}: ${lastError}`);
      continue;
    }

    const storyOutput = parsed as StoryOnlyLLMOutput;
    const qa = evaluarHistoriaSinPreguntas(storyOutput, input.nivel, {
      historiasAnteriores: input.historiasAnteriores,
      permitirSinTildes: input.lecturaSinTildes === true,
    });

    if (!qa.aprobada) {
      lastError = qa.motivo ?? 'QA rechazada sin motivo';
      console.warn(`[generateStoryOnly] QA retry ${attempt + 1}/${MAX_QA_RETRIES + 1}: ${lastError}`);
      continue;
    }

    const metadataCalc = calcularMetadataHistoria(storyOutput.contenido, input.edadAnos, input.nivel);
    const story: GeneratedStoryOnly = {
      titulo: storyOutput.titulo,
      contenido: storyOutput.contenido,
      vocabularioNuevo: storyOutput.vocabularioNuevo,
      metadata: {
        ...metadataCalc,
        vocabularioNuevo: storyOutput.vocabularioNuevo,
      },
      modelo: result.model,
      aprobadaQA: true,
      llmUsage: result.usage,
    };

    return { ok: true, story };
  }

  return { ok: false, error: lastError, code: 'GENERATION_FAILED' };
}

/**
 * Genera preguntas de comprension para una historia existente.
 * Se ejecuta en background mientras el nino lee.
 */
export async function generateQuestions(input: QuestionsPromptInput): Promise<QuestionsResult> {
  const maxTokens = envInt('LLM_MAX_TOKENS_QUESTIONS', 650);
  const systemPrompt = buildQuestionsSystemPrompt();
  const userPrompt = buildQuestionsUserPrompt(input);
  const difficultyPlan = getQuestionDifficultyPlan({ nivel: input.nivel, elo: input.elo });

  console.info('[llm:generateQuestions] difficulty-plan', {
    nivel: input.nivel,
    subnivel: difficultyPlan.subnivel,
    banda: difficultyPlan.banda,
    tramo: difficultyPlan.tramo,
    rdMode: difficultyPlan.rdMode,
    objetivo: difficultyPlan.objetivo,
  });

  const outcome = await callLLM({
    systemPrompt,
    userMessage: userPrompt,
    maxRetries: MAX_REINTENTOS,
    temperature: 0.6,
    maxTokens,
    modelEnvVar: 'LLM_MODEL_QUESTIONS',
    logTag: 'generateQuestions',
  });

  if (!outcome.ok) {
    return { ok: false, error: outcome.error, code: outcome.code };
  }

  const { result } = outcome;
  const { parsed } = result;

  const normalizedQuestions = normalizarPreguntasLLM(parsed);
  if (!normalizedQuestions || !validarEstructuraPreguntas(normalizedQuestions)) {
    return {
      ok: false,
      error: 'Estructura de preguntas invalida',
      code: 'GENERATION_FAILED',
    };
  }

  const questionsOutput: QuestionsLLMOutput = {
    preguntas: normalizedQuestions.preguntas.map((p) => ({
      ...p,
      dificultadPregunta:
        difficultyPlan.objetivo[p.tipo as keyof typeof difficultyPlan.objetivo]
        ?? p.dificultadPregunta
        ?? 3,
    })),
  };
  const qa = evaluarPreguntas(questionsOutput);

  const questions: GeneratedQuestions = {
    preguntas: questionsOutput.preguntas.map((p) => ({
      ...p,
      tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
      dificultadPregunta: p.dificultadPregunta ?? 3,
    })),
    modelo: result.model,
    aprobadaQA: qa.aprobada,
    motivoRechazo: qa.motivo,
    llmUsage: result.usage,
  };

  if (!qa.aprobada) {
    return {
      ok: false,
      error: qa.motivo ?? 'QA preguntas rechazada sin motivo',
      code: 'GENERATION_FAILED',
    };
  }

  return { ok: true, questions };
}

/**
 * Reescribe una historia existente ajustando la dificultad.
 * Mantiene personajes y trama, cambia complejidad lexica y longitud.
 */
export async function rewriteStory(input: RewritePromptInput): Promise<StoryGenerationResult> {
  const maxTokens = envInt('LLM_MAX_TOKENS_REWRITE', 1200);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildRewritePrompt(input);

  const outcome = await callLLM({
    systemPrompt,
    userMessage: userPrompt,
    maxRetries: MAX_REINTENTOS,
    temperature: 0.7,
    maxTokens,
    modelEnvVar: 'LLM_MODEL_REWRITE',
    logTag: 'rewriteStory',
  });

  if (!outcome.ok) {
    return { ok: false, error: outcome.error, code: outcome.code };
  }

  const { result } = outcome;
  const { parsed } = result;

  if (!validarEstructura(parsed)) {
    return {
      ok: false,
      error: 'Estructura de respuesta invalida',
      code: 'GENERATION_FAILED',
    };
  }

  const storyOutput = parsed as StoryLLMOutput;
  const nivelObjetivo =
    input.direccion === 'mas_facil'
      ? Math.max(1.0, input.nivelActual - 0.2)
      : Math.min(4.8, input.nivelActual + 0.2);
  const qa = evaluarHistoria(storyOutput, nivelObjetivo);

  const story = buildGeneratedStory(storyOutput, qa, input.edadAnos, nivelObjetivo, result);

  if (!qa.aprobada) {
    return {
      ok: false,
      error: qa.motivo ?? 'QA rechazada sin motivo',
      code: 'GENERATION_FAILED',
    };
  }

  return { ok: true, story };
}
