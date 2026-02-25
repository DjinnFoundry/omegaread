/**
 * This file is deprecated.
 * Tests should configure auth mocks directly in test files or use fixtures.
 *
 * Example usage in tests:
 * import { createMockParent, createMockStudent } from './fixtures';
 *
 * vi.mock('@/server/auth', () => ({
 *   requireAuth: vi.fn(async () => createMockParent()),
 *   requireStudentOwnership: vi.fn(async () => ({
 *     padre: createMockParent(),
 *     estudiante: createMockStudent(),
 *   })),
 * }));
 */
