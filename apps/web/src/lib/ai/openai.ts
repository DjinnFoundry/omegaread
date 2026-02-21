/**
 * Cliente LLM singleton.
 * Soporta OpenAI y z.ai (GLM) — cualquier proveedor compatible con OpenAI API.
 * Prioridad: LLM_API_KEY > OPENAI_API_KEY
 */
import OpenAI from 'openai';

let _client: OpenAI | null = null;
let _clientConfigKey: string | null = null;

function getLLMConfig() {
  // Custom LLM provider (z.ai, GLM, etc.) - requires explicit base URL
  if (process.env.LLM_API_KEY) {
    if (!process.env.LLM_BASE_URL) {
      throw new Error(
        'LLM_BASE_URL is required when using LLM_API_KEY. ' +
        'Set it to the API base URL of your LLM provider (e.g., https://open.bigmodel.cn/api/paas/v4).'
      );
    }
    return {
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL || 'glm-4-flash',
    };
  }
  // OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: undefined,
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
    };
  }
  throw new LLMKeyMissingError();
}

export function getOpenAIClient(): OpenAI {
  const config = getLLMConfig();
  const configKey = `${config.apiKey}|${config.baseURL ?? ''}`;
  if (!_client || _clientConfigKey !== configKey) {
    _client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    _clientConfigKey = configKey;
  }
  return _client;
}

export function getLLMModel(): string {
  return getLLMConfig().model;
}

export function hasOpenAIKey(): boolean {
  return !!(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY);
}

export class LLMKeyMissingError extends Error {
  constructor() {
    super(
      'No hay API key de LLM configurada. ' +
      'Configura LLM_API_KEY (z.ai) o OPENAI_API_KEY en .env.local.'
    );
    this.name = 'LLMKeyMissingError';
  }
}

// Backwards compat
export { LLMKeyMissingError as OpenAIKeyMissingError };
