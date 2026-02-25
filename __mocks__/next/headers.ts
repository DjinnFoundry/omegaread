// Mock for next/headers
// Provides a mock cookies() function that returns a trackable cookie store

import { vi } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

export const cookies = vi.fn(async () => mockCookieStore);
