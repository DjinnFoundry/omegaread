/**
 * This file is deprecated.
 * Tests should configure LLM mocks directly in test files.
 *
 * Example usage in tests:
 * vi.mock('@/lib/ai/openai', () => ({
 *   getOpenAIClient: vi.fn(async () => ({
 *     chat: {
 *       completions: {
 *         create: vi.fn(async () => ({
 *           choices: [{
 *             message: { content: '{"ok": true}' },
 *             finish_reason: 'stop',
 *           }],
 *           usage: { prompt_tokens: 100, completion_tokens: 50 },
 *         })),
 *       },
 *     },
 *   })),
 *   hasLLMKey: vi.fn(async () => true),
 *   getLLMModel: vi.fn(async () => 'test-model'),
 * }));
 */
