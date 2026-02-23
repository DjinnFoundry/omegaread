/**
 * Cliente LLM singleton.
 * Soporta z.ai Code subscription, OpenAI y otros proveedores compatibles.
 * Prioridad: ZAI_API_KEY > LLM_API_KEY > OPENAI_API_KEY
 *
 * Resuelve env vars desde Cloudflare context (produccion) o process.env (local).
 */
import OpenAI from 'openai';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const DEFAULT_ZAI_CODE_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const DEFAULT_ZAI_MODEL = 'glm-5';
const DEFAULT_LLM_TIMEOUT_MS = 45_000;
const DEFAULT_LLM_MAX_RETRIES = 0;
const ENV_KEYS = [
  'ZAI_API_KEY',
  'ZAI_BASE_URL',
  'ZAI_MODEL',
  'ZAI_THINKING_TYPE',
  'LLM_MODEL_STORY',
  'LLM_MODEL_QUESTIONS',
  'LLM_MODEL_REWRITE',
  'LLM_MAX_TOKENS_STORY',
  'LLM_MAX_TOKENS_QUESTIONS',
  'LLM_MAX_TOKENS_REWRITE',
  'LLM_FAST_STORY_PROMPT',
  'LLM_API_KEY',
  'LLM_BASE_URL',
  'LLM_MODEL',
  'LLM_REASONING_EFFORT',
  'LLM_TIMEOUT_MS',
  'LLM_MAX_RETRIES',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
] as const;

export type LLMProvider = 'zai' | 'openai' | 'compatible';

interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  provider: LLMProvider;
}

let _client: OpenAI | null = null;
let _clientConfigKey: string | null = null;
let _envResolved = false;

/**
 * Asegura que process.env tiene las variables de entorno del LLM.
 * En Cloudflare Workers, los secrets estan en el binding context, no en process.env.
 * Esta funcion los copia a process.env para que el resto del codigo funcione igual.
 */
async function ensureEnvFromCloudflare(): Promise<void> {
  if (_envResolved) return;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const cfEnv = env as Record<string, string>;
    for (const key of ENV_KEYS) {
      if (cfEnv[key] && !process.env[key]) {
        process.env[key] = cfEnv[key];
      }
    }
  } catch {
    // No estamos en Cloudflare context (dev local) - process.env ya tiene los valores
  }
  _envResolved = true;
}

function isLikelyOpenAIKey(key: string): boolean {
  return key.startsWith('sk-') || key.startsWith('sess-');
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function detectProviderFromBaseURL(baseURL?: string): LLMProvider {
  if (!baseURL) return 'openai';
  const normalized = baseURL.toLowerCase();
  if (normalized.includes('api.z.ai')) return 'zai';
  return 'compatible';
}

function getLLMConfig(): LLMConfig {
  const modelZai = process.env.ZAI_MODEL || process.env.LLM_MODEL || DEFAULT_ZAI_MODEL;

  // z.ai explicit config (recommended for Code subscription)
  if (process.env.ZAI_API_KEY) {
    const baseURL = process.env.ZAI_BASE_URL || process.env.LLM_BASE_URL || DEFAULT_ZAI_CODE_BASE_URL;
    return {
      apiKey: process.env.ZAI_API_KEY,
      baseURL,
      model: modelZai,
      provider: detectProviderFromBaseURL(baseURL),
    };
  }

  // Generic OpenAI-compatible provider.
  // If no base URL is provided, default to z.ai Code endpoint for backwards compatibility.
  if (process.env.LLM_API_KEY) {
    const baseURL = process.env.LLM_BASE_URL || process.env.ZAI_BASE_URL || DEFAULT_ZAI_CODE_BASE_URL;
    return {
      apiKey: process.env.LLM_API_KEY,
      baseURL,
      model: modelZai,
      provider: detectProviderFromBaseURL(baseURL),
    };
  }

  // OPENAI_API_KEY path:
  // - If key looks like OpenAI (sk-...), use OpenAI direct.
  // - Otherwise treat as z.ai key for compatibility with older setups.
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    if (process.env.OPENAI_BASE_URL) {
      const baseURL = process.env.OPENAI_BASE_URL;
      return {
        apiKey: openaiKey,
        baseURL,
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        provider: detectProviderFromBaseURL(baseURL),
      };
    }

    if (isLikelyOpenAIKey(openaiKey)) {
      return {
        apiKey: openaiKey,
        baseURL: undefined,
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        provider: 'openai',
      };
    }

    const baseURL = process.env.ZAI_BASE_URL || process.env.LLM_BASE_URL || DEFAULT_ZAI_CODE_BASE_URL;
    return {
      apiKey: openaiKey,
      baseURL,
      model: modelZai,
      provider: detectProviderFromBaseURL(baseURL),
    };
  }

  throw new LLMKeyMissingError();
}

export async function getOpenAIClient(): Promise<OpenAI> {
  await ensureEnvFromCloudflare();
  const config = getLLMConfig();
  const timeoutMs = parseIntEnv(process.env.LLM_TIMEOUT_MS, DEFAULT_LLM_TIMEOUT_MS);
  const maxRetries = parseIntEnv(process.env.LLM_MAX_RETRIES, DEFAULT_LLM_MAX_RETRIES);
  const configKey = `${config.apiKey}|${config.baseURL ?? ''}|${timeoutMs}|${maxRetries}`;
  if (!_client || _clientConfigKey !== configKey) {
    _client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: timeoutMs,
      maxRetries,
    });
    _clientConfigKey = configKey;
  }
  return _client;
}

export async function getLLMModel(): Promise<string> {
  await ensureEnvFromCloudflare();
  return getLLMConfig().model;
}

export async function getLLMProvider(): Promise<LLMProvider> {
  await ensureEnvFromCloudflare();
  return getLLMConfig().provider;
}

export async function getLLMRequestOverrides(): Promise<Record<string, unknown>> {
  await ensureEnvFromCloudflare();
  const config = getLLMConfig();
  const overrides: Record<string, unknown> = {};

  const reasoningEffort = process.env.LLM_REASONING_EFFORT?.trim();
  if (reasoningEffort) {
    overrides.reasoning_effort = reasoningEffort;
  }

  // z.ai exposes "thinking" controls. Disable by default to cut latency
  // and avoid responses that spend the budget in reasoning_content.
  if (config.provider === 'zai') {
    const thinkingType = (process.env.ZAI_THINKING_TYPE || 'disabled').trim().toLowerCase();
    if (thinkingType === 'enabled' || thinkingType === 'disabled') {
      overrides.thinking = { type: thinkingType };
    }
  }

  return overrides;
}

export async function hasLLMKey(): Promise<boolean> {
  await ensureEnvFromCloudflare();
  return !!(process.env.ZAI_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
}

class LLMKeyMissingError extends Error {
  constructor() {
    super(
      'No hay API key de LLM configurada. ' +
        'Configura ZAI_API_KEY (recomendado), LLM_API_KEY o OPENAI_API_KEY en .env.local.',
    );
    this.name = 'LLMKeyMissingError';
  }
}

// Backwards compat
export { LLMKeyMissingError as OpenAIKeyMissingError };
export async function hasOpenAIKey(): Promise<boolean> {
  return hasLLMKey();
}
