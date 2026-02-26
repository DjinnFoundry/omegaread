import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  mockFindParent,
  mockInsertReturning,
  mockInsertValues,
  mockCompare,
  mockHash,
  mockCreateToken,
  mockDb,
} = vi.hoisted(() => {
  const findParent = vi.fn();
  const insertReturning = vi.fn();
  const insertValues = vi.fn(() => ({ returning: insertReturning }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const compare = vi.fn();
  const hash = vi.fn();
  const createToken = vi.fn();
  return {
    mockFindParent: findParent,
    mockInsertReturning: insertReturning,
    mockInsertValues: insertValues,
    mockInsert: insert,
    mockCompare: compare,
    mockHash: hash,
    mockCreateToken: createToken,
    mockDb: {
      query: {
        parents: {
          findFirst: findParent,
        },
      },
      insert,
    },
  };
});

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => mockDb),
}));

vi.mock('@/server/jwt', () => ({
  createToken: mockCreateToken,
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
}));

vi.mock('@zetaread/db', () => ({
  parents: { email: 'email' },
  eq: vi.fn((...args: unknown[]) => args),
}));

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as registroPOST } from '@/app/api/auth/registro/route';

function createRequest(params: {
  url: string;
  form: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: string[];
}): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(params.form)) {
    formData.set(key, value);
  }

  const cookies = new Set(params.cookies ?? []);

  return {
    url: params.url,
    nextUrl: new URL(params.url),
    headers: new Headers(params.headers),
    formData: vi.fn(async () => formData),
    cookies: {
      has: (name: string) => cookies.has(name),
    },
  } as unknown as NextRequest;
}

describe('api auth routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockFindParent.mockResolvedValue(null);
    mockInsertReturning.mockResolvedValue([
      { id: 'parent-1', email: 'new@example.com' },
    ]);
    mockCompare.mockResolvedValue(true);
    mockHash.mockResolvedValue('$2a$12$hash');
    mockCreateToken.mockResolvedValue('mock-jwt-token');
  });

  it('login redirige con error cuando faltan credenciales', async () => {
    const request = createRequest({
      url: 'https://zetaread.com/api/auth/login',
      form: { email: 'padre@test.com' },
    });

    const response = await loginPOST(request);
    const locationRaw = response.headers.get('location');
    expect(locationRaw).toBeTruthy();
    const location = new URL(locationRaw!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe('/padre/login');
    expect(location.searchParams.get('error')).toContain('obligatorios');
  });

  it('login exitoso setea cookie Secure en HTTPS', async () => {
    mockFindParent.mockResolvedValue({
      id: 'parent-1',
      email: 'padre@test.com',
      passwordHash: '$2a$12$hash',
    });
    mockCompare.mockResolvedValue(true);

    const request = createRequest({
      url: 'https://zetaread.com/api/auth/login',
      form: { email: 'padre@test.com', password: 'secreto' },
      headers: { 'x-forwarded-proto': 'https' },
    });

    const response = await loginPOST(request);
    const location = response.headers.get('location');
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(303);
    expect(location).toBe('https://zetaread.com/padre/dashboard');
    expect(setCookie).toContain('omega-auth=mock-jwt-token');
    expect(setCookie).toMatch(/;\s*Secure/i);
  });

  it('login en HTTP sin x-forwarded-proto no setea cookie Secure', async () => {
    mockFindParent.mockResolvedValue({
      id: 'parent-1',
      email: 'padre@test.com',
      passwordHash: '$2a$12$hash',
    });
    mockCompare.mockResolvedValue(true);

    const request = createRequest({
      url: 'http://zetaread.com/api/auth/login',
      form: { email: 'padre@test.com', password: 'secreto' },
    });

    const response = await loginPOST(request);
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(303);
    expect(setCookie).not.toMatch(/;\s*Secure/i);
  });

  it('registro redirige con error cuando email ya existe', async () => {
    mockInsertValues.mockImplementationOnce(() => {
      throw new Error('UNIQUE constraint failed: parents.email');
    });

    const request = createRequest({
      url: 'https://zetaread.com/api/auth/registro',
      form: {
        nombre: 'Juan',
        email: 'juan@test.com',
        password: 'secreto123',
      },
    });

    const response = await registroPOST(request);
    const locationRaw = response.headers.get('location');
    expect(locationRaw).toBeTruthy();
    const location = new URL(locationRaw!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe('/padre/registro');
    expect(location.searchParams.get('error')).toContain('Ya existe');
  });

  it('registro exitoso redirige a dashboard y setea cookie auth', async () => {
    const request = createRequest({
      url: 'https://zetaread.com/api/auth/registro',
      form: {
        nombre: 'Juan',
        email: 'juan@test.com',
        password: 'secreto123',
      },
      headers: { 'x-forwarded-proto': 'https' },
    });

    const response = await registroPOST(request);
    const location = response.headers.get('location');
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(303);
    expect(location).toBe('https://zetaread.com/padre/dashboard');
    expect(setCookie).toContain('omega-auth=mock-jwt-token');
    expect(setCookie).toMatch(/;\s*Secure/i);
  });
});
