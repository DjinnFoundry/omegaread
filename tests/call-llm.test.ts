/**
 * @vitest-environment node
 * Tests for callLLM abstraction.
 *
 * Mocks the OpenAI client to verify:
 * - Successful call with valid JSON
 * - Retry on empty response
 * - Retry on invalid JSON
 * - Max retries exceeded
 * - Usage tracking
 * - NO_API_KEY error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── MOCKS AT MODULE LEVEL ───

const mockCreate = vi.fn();

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(async () => ({ env: {} })),
}));

vi.mock('openai', () => ({
  default: vi.fn(),
}));

// Mock the openai config module to return our controlled mockCreate
vi.mock('@/lib/ai/openai', () => {
  class MockKeyMissingError extends Error {
    name = 'OpenAIKeyMissingError';
    constructor() {
      super('No API key');
    }
  }
  return {
    getOpenAIClient: vi.fn(async () => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    getLLMModel: vi.fn(async () => 'test-model'),
    getLLMRequestOverrides: vi.fn(async () => ({})),
    OpenAIKeyMissingError: MockKeyMissingError,
  };
});

// ─── IMPORT AFTER MOCKS ───

const { callLLM } = await import('@/lib/ai/call-llm');
const { getOpenAIClient, OpenAIKeyMissingError } = await import('@/lib/ai/openai');

// ─── HELPERS ───

function makeCompletion(
  content: string | null,
  opts?: {
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    finish_reason?: string;
  },
) {
  return {
    choices: [
      {
        message: { content, role: 'assistant' },
        finish_reason: opts?.finish_reason ?? (content ? 'stop' : 'length'),
      },
    ],
    usage: opts?.usage ?? { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

// ─── TESTS ───

describe('callLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('should return parsed JSON on successful call', async () => {
    const payload = { titulo: 'Test', contenido: 'Hello world' };
    mockCreate.mockResolvedValueOnce(
      makeCompletion(JSON.stringify(payload), {
        usage: { prompt_tokens: 200, completion_tokens: 80, total_tokens: 280 },
      }),
    );

    const result = await callLLM({
      systemPrompt: 'You are a test assistant',
      userMessage: 'Generate a story',
      logTag: 'test',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.parsed).toEqual(payload);
    expect(result.result.usage.promptTokens).toBe(200);
    expect(result.result.usage.completionTokens).toBe(80);
    expect(result.result.usage.totalTokens).toBe(280);
    expect(result.result.model).toBe('test-model');
  });

  it('should pass temperature and maxTokens to the API', async () => {
    const payload = { ok: true };
    mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(payload)));

    await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      temperature: 0.5,
      maxTokens: 500,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.5);
    expect(callArgs.max_tokens).toBe(500);
    expect(callArgs.response_format).toEqual({ type: 'json_object' });
  });

  it('should retry on empty content and succeed on second attempt', async () => {
    const payload = { titulo: 'Retry worked' };

    // First call: empty content
    mockCreate.mockResolvedValueOnce(makeCompletion(null));
    // Second call: valid
    mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(payload)));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      maxRetries: 1,
      logTag: 'retryTest',
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.parsed).toEqual(payload);
  });

  it('should retry on invalid JSON and succeed on second attempt', async () => {
    const payload = { titulo: 'After bad JSON' };

    // First call: invalid JSON
    mockCreate.mockResolvedValueOnce(makeCompletion('this is not json {{{'));
    // Second call: valid
    mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(payload)));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      maxRetries: 1,
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.parsed).toEqual(payload);
  });

  it('should fail when max retries exceeded with empty responses', async () => {
    // All calls return empty content
    mockCreate.mockResolvedValue(makeCompletion(null));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      maxRetries: 2,
    });

    // 3 attempts total (0, 1, 2)
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('GENERATION_FAILED');
    expect(result.error).toContain('3 intentos');
  });

  it('should fail when max retries exceeded with invalid JSON', async () => {
    mockCreate.mockResolvedValue(makeCompletion('not json'));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      maxRetries: 1,
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('GENERATION_FAILED');
    expect(result.error).toContain('JSON invalido');
  });

  it('should retry on API error and succeed on second attempt', async () => {
    const payload = { titulo: 'After error' };

    mockCreate.mockRejectedValueOnce(new Error('API rate limit'));
    mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(payload)));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      maxRetries: 1,
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('should return NO_API_KEY when OpenAI key is missing', async () => {
    vi.mocked(getOpenAIClient).mockRejectedValueOnce(new OpenAIKeyMissingError());

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_API_KEY');
  });

  it('should track usage correctly with undefined usage', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: '{"test": true}', role: 'assistant' },
          finish_reason: 'stop',
        },
      ],
      usage: undefined,
    });

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.usage.promptTokens).toBe(0);
    expect(result.result.usage.completionTokens).toBe(0);
    expect(result.result.usage.totalTokens).toBe(0);
  });

  it('should use default maxRetries=0 (single attempt)', async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion(null));

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
      // No maxRetries specified, defaults to 0
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
  });

  it('should handle truncated JSON from length finish_reason', async () => {
    mockCreate.mockResolvedValueOnce(
      makeCompletion('{"titulo": "inco', {
        finish_reason: 'length',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
    );

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('JSON truncado');
  });

  it('should handle array content from LLM', async () => {
    const payload = { titulo: 'Array content' };
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: [{ type: 'text', text: JSON.stringify(payload) }],
            role: 'assistant',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const result = await callLLM({
      systemPrompt: 'system',
      userMessage: 'user',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.parsed).toEqual(payload);
  });
});
