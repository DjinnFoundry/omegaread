/**
 * Cliente LLM singleton.
 * Soporta OpenAI y z.ai (GLM) -- cualquier proveedor compatible con OpenAI API.
 * Prioridad: LLM_API_KEY > OPENAI_API_KEY
 *
 * Resuelve env vars desde Cloudflare context (produccion) o process.env (local).
 */
import OpenAI from 'openai';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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
    const keys = ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL', 'OPENAI_API_KEY'];
    for (const key of keys) {
      if (cfEnv[key] && !process.env[key]) {
        process.env[key] = cfEnv[key];
      }
    }
  } catch {
    // No estamos en Cloudflare context (dev local) - process.env ya tiene los valores
  }
  _envResolved = true;
}

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
      model: process.env.LLM_MODEL || 'glm-5',
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

export async function getOpenAIClient(): Promise<OpenAI> {
  await ensureEnvFromCloudflare();
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

export async function getLLMModel(): Promise<string> {
  await ensureEnvFromCloudflare();
  return getLLMConfig().model;
}

export async function hasOpenAIKey(): Promise<boolean> {
  await ensureEnvFromCloudflare();
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
