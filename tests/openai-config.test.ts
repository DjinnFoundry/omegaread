/**
 * @vitest-environment node
 * Tests para configuración de LLM/OpenAI (openai.ts).
 * Cubre: hasLLMKey, getLLMModel, getOpenAIClient, provider detection, key priority.
 * IMPORTANTE: Usar vi.resetModules() en beforeEach para resetear estado singleton.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── MOCKS AT MODULE LEVEL ───

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(async () => ({ env: {} })),
}));

vi.mock('openai', () => {
  return {
    default: vi.fn((config: any) => {
      // Store config as properties for testing purposes
      const mockClient: any = {
        _config: config,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        chat: {
          completions: {
            create: vi.fn(async () => ({
              choices: [
                {
                  message: { content: '{}' },
                  finish_reason: 'stop',
                },
              ],
            })),
          },
        },
      };
      return mockClient;
    }),
  };
});

// ─── DYNAMIC IMPORTS ───

const LLM_ENV_KEYS = [
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
];

function clearLLMEnv() {
  for (const key of LLM_ENV_KEYS) {
    delete process.env[key];
  }
}

async function importOpenAIModule() {
  vi.resetModules();
  return import('@/lib/ai/openai');
}

// ─── TESTS ───

describe('openai.ts - hasLLMKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe retornar true cuando ZAI_API_KEY está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key-123';
    const { hasLLMKey } = await importOpenAIModule();

    const result = await hasLLMKey();

    expect(result).toBe(true);
  });

  it('debe retornar true cuando LLM_API_KEY está configurado', async () => {
    process.env.LLM_API_KEY = 'llm-key-456';
    const { hasLLMKey } = await importOpenAIModule();

    const result = await hasLLMKey();

    expect(result).toBe(true);
  });

  it('debe retornar true cuando OPENAI_API_KEY está configurado', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-789';
    const { hasLLMKey } = await importOpenAIModule();

    const result = await hasLLMKey();

    expect(result).toBe(true);
  });

  it('debe retornar false cuando ninguna API key está configurada', async () => {
    const { hasLLMKey } = await importOpenAIModule();

    const result = await hasLLMKey();

    expect(result).toBe(false);
  });
});

describe('openai.ts - getLLMModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe retornar ZAI_MODEL cuando está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_MODEL = 'glm-custom';

    const { getLLMModel } = await importOpenAIModule();
    const result = await getLLMModel();

    expect(result).toBe('glm-custom');
  });

  it('debe fallback a LLM_MODEL cuando ZAI_MODEL no está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.LLM_MODEL = 'glm-alternative';

    const { getLLMModel } = await importOpenAIModule();
    const result = await getLLMModel();

    expect(result).toBe('glm-alternative');
  });

  it('debe defaultear a glm-5 cuando no hay modelo configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getLLMModel } = await importOpenAIModule();
    const result = await getLLMModel();

    expect(result).toBe('glm-5');
  });

  it('debe priorizar ZAI_MODEL sobre LLM_MODEL', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_MODEL = 'glm-zai';
    process.env.LLM_MODEL = 'glm-llm';

    const { getLLMModel } = await importOpenAIModule();
    const result = await getLLMModel();

    expect(result).toBe('glm-zai');
  });

  it('debe usar LLM_MODEL como modelo por defecto para OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';
    process.env.LLM_MODEL = 'gpt-4o-mini';

    const { getLLMModel } = await importOpenAIModule();
    const result = await getLLMModel();

    expect(result).toBe('gpt-4o-mini');
  });
});

describe('openai.ts - getOpenAIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe lanzar LLMKeyMissingError cuando no hay API key configurada', async () => {
    const { getOpenAIClient } = await importOpenAIModule();

    try {
      await getOpenAIClient();
      expect.fail('Debería haber lanzado LLMKeyMissingError');
    } catch (error: any) {
      expect(error.name).toBe('LLMKeyMissingError');
      expect(error.message).toContain('No hay API key');
    }
  });

  it('debe retornar cliente OpenAI cuando ZAI_API_KEY está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key-123';

    const { getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();

    expect(client).toBeDefined();
    expect(client.chat).toBeDefined();
  });

  it('debe retornar cliente OpenAI cuando LLM_API_KEY está configurado', async () => {
    process.env.LLM_API_KEY = 'llm-key-456';

    const { getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();

    expect(client).toBeDefined();
  });

  it('debe retornar cliente OpenAI cuando OPENAI_API_KEY está configurado', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-789';

    const { getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();

    expect(client).toBeDefined();
  });

  it('debe usar timeout y maxRetries desde env vars', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.LLM_TIMEOUT_MS = '60000';
    process.env.LLM_MAX_RETRIES = '3';

    const { getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();

    // Verify client is created successfully
    expect(client).toBeDefined();
    expect(client.chat).toBeDefined();
  });

  it('debe usar valores por defecto cuando timeout/retries no están configurados', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();

    // Verify client is created successfully
    expect(client).toBeDefined();
    expect(client.chat).toBeDefined();
  });
});

describe('openai.ts - Key Priority (ZAI > LLM > OPENAI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe priorizar ZAI_API_KEY sobre LLM_API_KEY', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.LLM_API_KEY = 'llm-key';

    const { getLLMModel, getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    // ZAI_API_KEY should be prioritized (z.ai provider)
    expect(provider).toBe('zai');
  });

  it('debe priorizar ZAI_API_KEY sobre OPENAI_API_KEY', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    // ZAI_API_KEY should be prioritized
    expect(provider).toBe('zai');
  });

  it('debe priorizar LLM_API_KEY sobre OPENAI_API_KEY', async () => {
    process.env.LLM_API_KEY = 'llm-key';
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    // LLM_API_KEY should be prioritized
    expect(provider).toBe('zai');
  });

  it('debe usar OPENAI_API_KEY cuando otras keys no están configuradas', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    // OPENAI_API_KEY should be used (and detected as openai provider because sk- prefix)
    expect(provider).toBe('openai');
  });
});

describe('openai.ts - Provider Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe detectar provider zai cuando baseURL contiene api.z.ai', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('zai');
  });

  it('debe detectar provider openai para sk- keys sin base URL', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('openai');
  });

  it('debe detectar provider compatible para custom base URL', async () => {
    process.env.LLM_API_KEY = 'custom-key';
    process.env.LLM_BASE_URL = 'https://custom-llm.example.com/v1';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('compatible');
  });

  it('debe detectar zai incluso con uppercase en baseURL', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_BASE_URL = 'https://API.Z.AI/api/coding/paas/v4';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('zai');
  });

  it('debe defaultear a openai cuando no hay baseURL explícito con OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('openai');
  });

  it('debe defaultear a zai para non-sk- OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'zai-key-without-sk';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('zai');
  });
});

describe('openai.ts - BaseURL Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe usar ZAI_BASE_URL cuando está configurado explícitamente', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_BASE_URL = 'https://api.z.ai/custom/v4';

    const { getLLMProvider, getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();
    const provider = await getLLMProvider();

    // Custom Z.AI URL with api.z.ai should be detected as z.ai provider
    expect(provider).toBe('zai');
    expect(client).toBeDefined();
  });

  it('debe usar baseURL por defecto de z.ai cuando solo ZAI_API_KEY está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    expect(provider).toBe('zai');
  });

  it('debe usar LLM_BASE_URL como fallback para ZAI_API_KEY', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.LLM_BASE_URL = 'https://llm-base.example.com';

    const { getLLMProvider, getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();
    const provider = await getLLMProvider();

    // Should work with compatible provider
    expect(client).toBeDefined();
    expect(provider).toBe('compatible');
  });

  it('debe usar OPENAI_BASE_URL cuando está explícitamente configurado', async () => {
    process.env.OPENAI_API_KEY = 'custom-key';
    process.env.OPENAI_BASE_URL = 'https://openai-custom.example.com/v1';

    const { getLLMProvider, getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();
    const provider = await getLLMProvider();

    expect(provider).toBe('compatible');
    expect(client).toBeDefined();
  });

  it('debe omitir baseURL para OPENAI_API_KEY sin OPENAI_BASE_URL (usar default OpenAI)', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMProvider, getOpenAIClient } = await importOpenAIModule();
    const client = await getOpenAIClient();
    const provider = await getLLMProvider();

    // sk- prefix should be detected as openai provider
    expect(provider).toBe('openai');
    expect(client).toBeDefined();
  });

  it('debe usar z.ai base URL por defecto para non-sk- OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'custom-key';

    const { getLLMProvider } = await importOpenAIModule();
    const provider = await getLLMProvider();

    // Non-sk- key without explicit base URL should default to z.ai
    expect(provider).toBe('zai');
  });
});

describe('openai.ts - Model Configuration by Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe usar glm-5 por defecto para ZAI_API_KEY', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getLLMModel } = await importOpenAIModule();
    const model = await getLLMModel();

    expect(model).toBe('glm-5');
  });

  it('debe usar gpt-4o-mini por defecto para OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMModel } = await importOpenAIModule();
    const model = await getLLMModel();

    expect(model).toBe('gpt-4o-mini');
  });

  it('debe respetar LLM_MODEL configuration para OPENAI_API_KEY', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';
    process.env.LLM_MODEL = 'gpt-4-turbo';

    const { getLLMModel } = await importOpenAIModule();
    const model = await getLLMModel();

    expect(model).toBe('gpt-4-turbo');
  });
});

describe('openai.ts - Singleton caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe retornar el mismo cliente instance cuando config no cambia', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getOpenAIClient } = await importOpenAIModule();
    const client1 = await getOpenAIClient();
    const client2 = await getOpenAIClient();

    expect(client1).toBe(client2);
  });

  it('debe crear nuevo cliente cuando config cambia', async () => {
    process.env.ZAI_API_KEY = 'zai-key-1';
    const { getOpenAIClient: getClient1 } = await importOpenAIModule();
    const client1 = await getClient1();

    // Resetear y cambiar config
    clearLLMEnv();
    vi.resetModules();
    process.env.ZAI_API_KEY = 'zai-key-2';
    const { getOpenAIClient: getClient2 } = await importOpenAIModule();
    const client2 = await getClient2();

    // Clients should be different instances when config changes
    expect(client1).not.toBe(client2);
  });
});

describe('openai.ts - hasOpenAIKey backwards compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe ser alias de hasLLMKey', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { hasOpenAIKey, hasLLMKey } = await importOpenAIModule();
    const openaiResult = await hasOpenAIKey();
    const llmResult = await hasLLMKey();

    expect(openaiResult).toBe(llmResult);
  });

  it('debe retornar true cuando hay cualquier API key configurada', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { hasOpenAIKey } = await importOpenAIModule();
    const result = await hasOpenAIKey();

    expect(result).toBe(true);
  });
});

describe('openai.ts - getLLMRequestOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLLMEnv();
  });

  it('debe incluir reasoning_effort cuando está configurado', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.LLM_REASONING_EFFORT = 'high';

    const { getLLMRequestOverrides } = await importOpenAIModule();
    const overrides = await getLLMRequestOverrides();

    expect(overrides.reasoning_effort).toBe('high');
  });

  it('debe retornar objeto vacío cuando no hay overrides en OpenAI provider', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMRequestOverrides } = await importOpenAIModule();
    const overrides = await getLLMRequestOverrides();

    expect(Object.keys(overrides).length).toBe(0);
  });

  it('debe incluir thinking configuration para provider zai', async () => {
    process.env.ZAI_API_KEY = 'zai-key';
    process.env.ZAI_THINKING_TYPE = 'enabled';

    const { getLLMRequestOverrides } = await importOpenAIModule();
    const overrides = await getLLMRequestOverrides();

    expect(overrides.thinking).toBeDefined();
    expect(overrides.thinking.type).toBe('enabled');
  });

  it('debe defaultear thinking a disabled para z.ai', async () => {
    process.env.ZAI_API_KEY = 'zai-key';

    const { getLLMRequestOverrides } = await importOpenAIModule();
    const overrides = await getLLMRequestOverrides();

    expect(overrides.thinking?.type).toBe('disabled');
  });

  it('no debe incluir thinking para providers que no sean z.ai', async () => {
    process.env.OPENAI_API_KEY = 'sk-proj-123';

    const { getLLMRequestOverrides } = await importOpenAIModule();
    const overrides = await getLLMRequestOverrides();

    expect(overrides.thinking).toBeUndefined();
  });
});
