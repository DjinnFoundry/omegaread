/**
 * Cliente LLM singleton.
 * Soporta OpenAI y z.ai (GLM) — cualquier proveedor compatible con OpenAI API.
 * Prioridad: LLM_API_KEY > OPENAI_API_KEY
 */
import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getLLMConfig() {
  // z.ai / GLM (prioridad)
  if (process.env.LLM_API_KEY) {
    return {
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
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
  if (!_client) {
    const config = getLLMConfig();
    _client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
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
