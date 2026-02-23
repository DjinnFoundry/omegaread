/**
 * Pipeline de generacion de historias.
 * Orquesta: prompt → LLM → parseo → QA → resultado.
 */
import type OpenAI from 'openai';
import {
  getOpenAIClient,
  getLLMModel,
  getLLMRequestOverrides,
  OpenAIKeyMissingError,
} from './openai';
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

// Reintentos automaticos desactivados por UX/latencia.
// 0 = una sola llamada al LLM y, si falla, el reintento queda en manos del usuario.
const MAX_REINTENTOS = 0;
const TIPOS_PREGUNTA_CANONICOS = ['literal', 'inferencia', 'vocabulario', 'resumen'] as const;

type TipoPreguntaCanonico = (typeof TIPOS_PREGUNTA_CANONICOS)[number];
type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

interface CompletionSnapshot {
  finishReason: string | null;
  contentKind: 'string' | 'array' | 'null' | 'other';
  contentLength: number;
  hasReasoningContent: boolean;
  reasoningLength: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

function buildChatParams(base: ChatParams, overrides: Record<string, unknown>): ChatParams {
  return {
    ...base,
    ...overrides,
  } as ChatParams;
}

function extractTextFromContentPart(part: unknown): string {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';
  const node = part as Record<string, unknown>;
  if (typeof node.text === 'string') return node.text;
  return '';
}

function extractCompletionContent(
  completion: ChatCompletion,
): { content: string | null; snapshot: CompletionSnapshot } {
  const choice = completion.choices[0];
  const message = (choice?.message ?? {}) as unknown as Record<string, unknown>;
  const rawContent = message.content;

  let contentKind: CompletionSnapshot['contentKind'] = 'null';
  let content = '';

  if (typeof rawContent === 'string') {
    contentKind = 'string';
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    contentKind = 'array';
    content = rawContent.map(extractTextFromContentPart).join('');
  } else if (rawContent !== null && rawContent !== undefined) {
    contentKind = 'other';
    content = String(rawContent);
  }

  const normalized = content.trim();
  const reasoningContent = typeof message.reasoning_content === 'string' ? message.reasoning_content : '';

  return {
    content: normalized || null,
    snapshot: {
      finishReason: choice?.finish_reason ?? null,
      contentKind,
      contentLength: normalized.length,
      hasReasoningContent: reasoningContent.length > 0,
      reasoningLength: reasoningContent.length,
      promptTokens: completion.usage?.prompt_tokens ?? null,
      completionTokens: completion.usage?.completion_tokens ?? null,
      totalTokens: completion.usage?.total_tokens ?? null,
    },
  };
}

function formatCompletionSnapshot(snapshot: CompletionSnapshot): string {
  const parts = [
    `finish_reason=${snapshot.finishReason ?? 'null'}`,
    `content_kind=${snapshot.contentKind}`,
    `content_len=${snapshot.contentLength}`,
    `prompt_tokens=${snapshot.promptTokens ?? 'n/a'}`,
    `completion_tokens=${snapshot.completionTokens ?? 'n/a'}`,
  ];
  if (snapshot.hasReasoningContent) {
    parts.push(`reasoning_len=${snapshot.reasoningLength}`);
  }
  return parts.join(', ');
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envFlag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function normalizarTextoPlano(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarTipoPregunta(value: unknown): TipoPreguntaCanonico | null {
  if (typeof value !== 'string') return null;
  const tipo = normalizarTextoPlano(value);
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
    (op) => normalizarTextoPlano(op) === normalizarTextoPlano(cleaned),
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
  let requestOverrides: Record<string, unknown>;
  const maxTokens = envInt('LLM_MAX_TOKENS_STORY', 1200);
  try {
    client = await getOpenAIClient();
    model = envString('LLM_MODEL_STORY') ?? await getLLMModel();
    requestOverrides = await getLLMRequestOverrides();
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
      const completion = await client.chat.completions.create(
        buildChatParams(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          requestOverrides,
        ),
      );

      const { content, snapshot } = extractCompletionContent(completion);
      if (!content) {
        lastError = `El LLM no devolvio contenido (${formatCompletionSnapshot(snapshot)})`;
        console.warn('[llm:generateStory] Respuesta sin contenido', snapshot);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (snapshot.finishReason === 'length') {
          lastError = `El LLM devolvio JSON truncado (${formatCompletionSnapshot(snapshot)})`;
        } else {
          lastError = 'El LLM devolvio JSON invalido';
        }
        console.warn('[llm:generateStory] JSON no parseable', {
          ...snapshot,
          preview: content.slice(0, 220),
        });
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
      console.error('[llm:generateStory] Error de API', { model, error: msg });
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
  let requestOverrides: Record<string, unknown>;
  const maxTokens = envInt('LLM_MAX_TOKENS_STORY', 900);
  const fastPromptMode = envFlag('LLM_FAST_STORY_PROMPT', true);
  try {
    client = await getOpenAIClient();
    model = envString('LLM_MODEL_STORY') ?? await getLLMModel();
    requestOverrides = await getLLMRequestOverrides();
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
      fastMode: fastPromptMode,
    });

    try {
      const completion = await client.chat.completions.create(
        buildChatParams(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          requestOverrides,
        ),
      );

      const { content, snapshot } = extractCompletionContent(completion);
      if (!content) {
        lastError = `El LLM no devolvio contenido (${formatCompletionSnapshot(snapshot)})`;
        console.warn('[llm:generateStoryOnly] Respuesta sin contenido', snapshot);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (snapshot.finishReason === 'length') {
          lastError = `El LLM devolvio JSON truncado (${formatCompletionSnapshot(snapshot)})`;
        } else {
          lastError = 'El LLM devolvio JSON invalido';
        }
        console.warn('[llm:generateStoryOnly] JSON no parseable', {
          ...snapshot,
          preview: content.slice(0, 220),
        });
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
      console.error('[llm:generateStoryOnly] Error de API', { model, error: msg });
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
  let requestOverrides: Record<string, unknown>;
  const maxTokens = envInt('LLM_MAX_TOKENS_QUESTIONS', 650);
  try {
    client = await getOpenAIClient();
    model = envString('LLM_MODEL_QUESTIONS') ?? await getLLMModel();
    requestOverrides = await getLLMRequestOverrides();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

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

  let lastError = '';

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const completion = await client.chat.completions.create(
        buildChatParams(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          requestOverrides,
        ),
      );

      const { content, snapshot } = extractCompletionContent(completion);
      if (!content) {
        lastError = `El LLM no devolvio contenido (${formatCompletionSnapshot(snapshot)})`;
        console.warn('[llm:generateQuestions] Respuesta sin contenido', snapshot);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (snapshot.finishReason === 'length') {
          lastError = `El LLM devolvio JSON truncado (${formatCompletionSnapshot(snapshot)})`;
        } else {
          lastError = 'El LLM devolvio JSON invalido';
        }
        console.warn('[llm:generateQuestions] JSON no parseable', {
          ...snapshot,
          preview: content.slice(0, 220),
        });
        continue;
      }

      const normalizedQuestions = normalizarPreguntasLLM(parsed);

      if (!normalizedQuestions || !validarEstructuraPreguntas(normalizedQuestions)) {
        lastError = 'Estructura de preguntas invalida';
        continue;
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
      console.error('[llm:generateQuestions] Error de API', { model, error: msg });
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
  let requestOverrides: Record<string, unknown>;
  const maxTokens = envInt('LLM_MAX_TOKENS_REWRITE', 1200);
  try {
    client = await getOpenAIClient();
    model = envString('LLM_MODEL_REWRITE') ?? await getLLMModel();
    requestOverrides = await getLLMRequestOverrides();
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
      const completion = await client.chat.completions.create(
        buildChatParams(
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          requestOverrides,
        ),
      );

      const { content, snapshot } = extractCompletionContent(completion);
      if (!content) {
        lastError = `El LLM no devolvio contenido (${formatCompletionSnapshot(snapshot)})`;
        console.warn('[llm:rewriteStory] Respuesta sin contenido', snapshot);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (snapshot.finishReason === 'length') {
          lastError = `El LLM devolvio JSON truncado (${formatCompletionSnapshot(snapshot)})`;
        } else {
          lastError = 'El LLM devolvio JSON invalido';
        }
        console.warn('[llm:rewriteStory] JSON no parseable', {
          ...snapshot,
          preview: content.slice(0, 220),
        });
        continue;
      }

      if (!validarEstructura(parsed)) {
        lastError = 'Estructura de respuesta invalida';
        continue;
      }

      const storyOutput = parsed as StoryLLMOutput;
      const nivelObjetivo =
        input.direccion === 'mas_facil'
          ? Math.max(1.0, input.nivelActual - 0.2)
          : Math.min(4.8, input.nivelActual + 0.2);
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
      console.error('[llm:rewriteStory] Error de API', { model, error: msg });
    }
  }

  return {
    ok: false,
    error: `No se pudo reescribir historia despues de ${MAX_REINTENTOS + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}
