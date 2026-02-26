import { describe, it, expect, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function createRequest(params: {
  url: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const nextUrl = new URL(params.url) as URL & { clone: () => URL };
  nextUrl.clone = () => new URL(nextUrl.toString());

  return {
    nextUrl,
    headers: new Headers(params.headers),
    cookies: {
      get: (name: string) => {
        const value = params.cookies?.[name];
        return value ? { name, value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe('middleware', () => {
  beforeEach(() => {
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASS;
    process.env.NODE_ENV = 'test';
  });

  it('redirecciona HTTP a HTTPS para hosts no-localhost', () => {
    const request = createRequest({
      url: 'http://zetaread.com/padre/login',
    });

    const response = middleware(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('https://zetaread.com/padre/login');
  });

  it('no fuerza HTTPS en localhost', () => {
    const request = createRequest({
      url: 'http://localhost:3000/padre/login',
    });

    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('omite Basic Auth en rutas criticas de autenticacion', () => {
    process.env.BASIC_AUTH_USER = 'beta';
    process.env.BASIC_AUTH_PASS = 'secret';

    const request = createRequest({
      url: 'https://zetaread.com/api/auth/login',
    });

    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('www-authenticate')).toBeNull();
  });

  it('exige Basic Auth en rutas no criticas', () => {
    process.env.BASIC_AUTH_USER = 'beta';
    process.env.BASIC_AUTH_PASS = 'secret';

    const request = createRequest({
      url: 'https://zetaread.com/',
    });

    const response = middleware(request);

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Basic');
  });

  it('setea cookie de gate al autenticar con Basic Auth valida', () => {
    process.env.BASIC_AUTH_USER = 'beta';
    process.env.BASIC_AUTH_PASS = 'secret';

    const credentials = Buffer.from('beta:secret').toString('base64');
    const request = createRequest({
      url: 'https://zetaread.com/',
      headers: {
        authorization: `Basic ${credentials}`,
        'x-forwarded-proto': 'https',
      },
    });

    const response = middleware(request);
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(setCookie).toContain('zeta-gate=v1-');
    expect(setCookie).toMatch(/;\s*Secure/i);
  });

  it('falla cerrado en produccion si falta configuracion Basic Auth', () => {
    process.env.NODE_ENV = 'production';

    const request = createRequest({
      url: 'https://zetaread.com/',
    });

    const response = middleware(request);

    expect(response.status).toBe(503);
  });
});
