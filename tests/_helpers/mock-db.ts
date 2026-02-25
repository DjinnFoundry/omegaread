/**
 * This file is deprecated.
 * Tests should configure DB mocks directly in test files or use fixtures.
 *
 * Example usage in tests:
 * const mockFindFirst = vi.fn(async () => null);
 * const mockFindMany = vi.fn(async () => []);
 * vi.mock('@/server/db', () => ({
 *   getDb: vi.fn(async () => ({
 *     query: {
 *       students: { findFirst: mockFindFirst, findMany: mockFindMany },
 *       // ... other tables
 *     },
 *   })),
 * }));
 */
