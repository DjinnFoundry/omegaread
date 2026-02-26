/**
 * Abstraccion generica para llamadas al LLM con retry, parseo JSON y validacion.
 *
 * Elimina el boilerplate duplicado en generateStory, generateStoryOnly,
 * generateQuestions y rewriteStory.
 */
import type OpenAI from 'openai';
import {
  getOpenAIClient,
  getLLMModel,
  getLLMRequestOverrides,
  OpenAIKeyMissingError,
} from './openai';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export interface LLMUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CallLLMConfig {
  /** System prompt */
  systemPrompt: string;
  /** User message content */
  userMessage: string;
  /** Max retries on parse/validation/API failure (default 0) */
  maxRetries?: number;
  /** Temperature (default 0.7) */
  temperature?: number;
  /** Max tokens for completion */
  maxTokens?: number;
  /** Model override env var name (e.g. 'LLM_MODEL_STORY') */
  modelEnvVar?: string;
  /** Tag for log messages (e.g. 'generateStory') */
  logTag?: string;
}

export interface CallLLMResult {
  /** Raw parsed JSON from LLM */
  parsed: unknown;
  /** Token usage snapshot */
  usage: LLMUsageSnapshot;
  /** Model used for generation */
  model: string;
}

export type CallLLMOutcome =
  | { ok: true; result: CallLLMResult }
  | { ok: false; error: string; code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' };

// ─────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────

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

function buildUsageSnapshot(snapshot: CompletionSnapshot): LLMUsageSnapshot {
  const promptTokens = Math.max(0, snapshot.promptTokens ?? 0);
  const completionTokens = Math.max(0, snapshot.completionTokens ?? 0);
  const totalFromUsage = Math.max(0, snapshot.totalTokens ?? 0);

  return {
    promptTokens,
    completionTokens,
    totalTokens: totalFromUsage > 0 ? totalFromUsage : promptTokens + completionTokens,
  };
}

function buildChatParams(
  base: ChatParams,
  overrides: Record<string, unknown>,
): ChatParams {
  return {
    ...base,
    ...overrides,
  } as ChatParams;
}

function envString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

/**
 * Generic LLM call with JSON response format, retry loop, and usage tracking.
 *
 * Returns raw parsed JSON (caller is responsible for validation/normalization).
 * The retry loop handles: empty responses, invalid JSON, and API errors.
 * Callers can add their own post-parse validation by wrapping callLLM
 * in their own retry logic or by using the `maxRetries` config.
 */
export async function callLLM(config: CallLLMConfig): Promise<CallLLMOutcome> {
  const {
    systemPrompt,
    userMessage,
    maxRetries = 0,
    temperature = 0.7,
    maxTokens,
    modelEnvVar,
    logTag = 'callLLM',
  } = config;

  let client: OpenAI;
  let model: string;
  let requestOverrides: Record<string, unknown>;

  try {
    client = await getOpenAIClient();
    model = (modelEnvVar ? envString(modelEnvVar) : undefined) ?? await getLLMModel();
    requestOverrides = await getLLMRequestOverrides();
  } catch (e) {
    if (e instanceof OpenAIKeyMissingError) {
      return { ok: false, error: e.message, code: 'NO_API_KEY' };
    }
    throw e;
  }

  let lastError = '';

  for (let intento = 0; intento <= maxRetries; intento++) {
    try {
      const params: ChatParams = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        response_format: { type: 'json_object' },
      };
      if (maxTokens !== undefined) {
        params.max_tokens = maxTokens;
      }

      const completion = await client.chat.completions.create(
        buildChatParams(params, requestOverrides),
      );

      const { content, snapshot } = extractCompletionContent(completion);
      if (!content) {
        lastError = `El LLM no devolvio contenido (${formatCompletionSnapshot(snapshot)})`;
        console.warn(`[llm:${logTag}] Respuesta sin contenido`, snapshot);
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
        console.warn(`[llm:${logTag}] JSON no parseable`, {
          ...snapshot,
          preview: content.slice(0, 220),
        });
        continue;
      }

      return {
        ok: true,
        result: {
          parsed,
          usage: buildUsageSnapshot(snapshot),
          model,
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      lastError = `Error de API: ${msg}`;
      console.error(`[llm:${logTag}] Error de API`, { model, error: msg });
    }
  }

  return {
    ok: false,
    error: `No se pudo completar despues de ${maxRetries + 1} intentos. Ultimo error: ${lastError}`,
    code: 'GENERATION_FAILED',
  };
}

