/**
 * Tests para autenticación de admin (admin-auth.ts).
 * Cubre: loginAdmin, getCurrentAdmin, isAdminAuthenticated, requireAdminAuth, logoutAdmin.
 * Usa vi.mock() para moclear next/headers y jose.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Setup mocks BEFORE any module imports
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockSignJWT = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  sign: vi.fn(async () => 'mock-admin-token'),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock('jose', () => ({
  SignJWT: class {
    constructor() {
      return mockSignJWT;
    }
  },
  jwtVerify: vi.fn(),
}));

// Now import the module we want to test
import { loginAdmin, getCurrentAdmin, isAdminAuthenticated, requireAdminAuth, logoutAdmin } from '@/server/admin-auth';

// Get the mocked modules for manipulation in tests
let nextHeadersMock: any;
let joseMock: any;

beforeEach(async () => {
  vi.clearAllMocks();
  nextHeadersMock = await import('next/headers');
  joseMock = await import('jose');

  mockCookieStore.get.mockClear();
  mockCookieStore.set.mockClear();
  mockCookieStore.delete.mockClear();
  mockSignJWT.setProtectedHeader.mockClear().mockReturnThis();
  mockSignJWT.setIssuedAt.mockClear().mockReturnThis();
  mockSignJWT.setExpirationTime.mockClear().mockReturnThis();
  mockSignJWT.sign.mockClear().mockResolvedValue('mock-admin-token');

  delete process.env.AUTH_SECRET;
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
  process.env.NODE_ENV = 'development';
});

// ─── TESTS ───

describe('admin-auth.ts - loginAdmin', () => {
  it('debe retornar ok=false cuando no hay credenciales configuradas', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    const result = await loginAdmin('admin', 'admin');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Credenciales invalidas');
  });

  it('debe retornar ok=true con credenciales de entorno correctas', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const result = await loginAdmin('customuser', 'custompass');

    expect(result.ok).toBe(true);
    expect(result.username).toBe('customuser');
  });

  it('debe retornar ok=false con contraseña incorrecta', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const result = await loginAdmin('customuser', 'wrongpassword');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Credenciales invalidas');
  });

  it('debe retornar ok=false con usuario incorrecto', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const result = await loginAdmin('wronguser', 'custompass');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Credenciales invalidas');
  });

  it('debe establecer cookie de admin en login exitoso', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    await loginAdmin('customuser', 'custompass');

    expect(mockCookieStore.set).toHaveBeenCalled();
    const setCookieCall = mockCookieStore.set.mock.calls[0];
    expect(setCookieCall[0]).toBe('zeta-admin');
    expect(setCookieCall[1]).toBe('mock-admin-token');
  });

  it('debe setear cookie con opciones correctas (httpOnly, 7 días)', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    await loginAdmin('customuser', 'custompass');

    const setCookieCall = mockCookieStore.set.mock.calls[0];
    const cookieOptions = setCookieCall[2];
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60);
    expect(cookieOptions.path).toBe('/admin');
  });

  it('debe trimear whitespace en username y password', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const result = await loginAdmin('  customuser  ', '  custompass  ');

    expect(result.ok).toBe(true);
  });

  it('la respuesta de login exitoso no incluye usingDefaultCredentials', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const result = await loginAdmin('customuser', 'custompass');

    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty('usingDefaultCredentials');
  });
});

describe('admin-auth.ts - getCurrentAdmin', () => {
  it('debe retornar null cuando no hay cookie', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue(undefined);

    const result = await getCurrentAdmin();

    expect(result).toBeNull();
  });

  it('debe retornar null cuando JWT es inválido', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    joseMock.jwtVerify.mockRejectedValue(new Error('Invalid token'));

    const result = await getCurrentAdmin();

    expect(result).toBeNull();
  });

  it('debe retornar null cuando JWT no contiene role=admin', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'user', username: 'juan' },
    });

    const result = await getCurrentAdmin();

    expect(result).toBeNull();
  });

  it('debe retornar null cuando JWT no contiene username string', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'admin', username: 123 },
    });

    const result = await getCurrentAdmin();

    expect(result).toBeNull();
  });

  it('debe retornar admin data cuando JWT es válido', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'admin', username: 'juan' },
    });

    const result = await getCurrentAdmin();

    expect(result).not.toBeNull();
    expect(result.username).toBe('juan');
  });

  it('la respuesta de getCurrentAdmin no incluye usingDefaultCredentials', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'admin', username: 'juan' },
    });

    const result = await getCurrentAdmin();

    expect(result).not.toHaveProperty('usingDefaultCredentials');
  });
});

describe('admin-auth.ts - isAdminAuthenticated', () => {
  it('debe retornar true cuando admin autenticado', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'admin', username: 'juan' },
    });

    const result = await isAdminAuthenticated();

    expect(result).toBe(true);
  });

  it('debe retornar false cuando no hay cookie', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue(undefined);

    const result = await isAdminAuthenticated();

    expect(result).toBe(false);
  });

  it('debe retornar false cuando JWT es inválido', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    joseMock.jwtVerify.mockRejectedValue(new Error('Invalid token'));

    const result = await isAdminAuthenticated();

    expect(result).toBe(false);
  });
});

describe('admin-auth.ts - requireAdminAuth', () => {
  it('debe retornar admin cuando autenticado', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    joseMock.jwtVerify.mockResolvedValue({
      payload: { role: 'admin', username: 'juan' },
    });

    const result = await requireAdminAuth();

    expect(result.username).toBe('juan');
  });

  it('debe lanzar error cuando no autenticado', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue(undefined);

    try {
      await requireAdminAuth();
      expect.fail('Debería haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('Admin no autenticado');
    }
  });

  it('debe lanzar error cuando JWT es inválido', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    joseMock.jwtVerify.mockRejectedValue(new Error('Invalid token'));

    try {
      await requireAdminAuth();
      expect.fail('Debería haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('Admin no autenticado');
    }
  });
});

describe('admin-auth.ts - logoutAdmin', () => {
  it('debe setear cookie vacía con maxAge=0', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    await logoutAdmin();

    expect(mockCookieStore.set).toHaveBeenCalled();
    const setCookieCall = mockCookieStore.set.mock.calls[0];
    expect(setCookieCall[0]).toBe('zeta-admin');
    expect(setCookieCall[1]).toBe('');
    expect(setCookieCall[2].maxAge).toBe(0);
  });

  it('debe preservar opciones de cookie correctas en logout', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);

    await logoutAdmin();

    const setCookieCall = mockCookieStore.set.mock.calls[0];
    const cookieOptions = setCookieCall[2];
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.path).toBe('/admin');
  });
});

describe('admin-auth.ts - AUTH_SECRET validation', () => {
  // These tests need a fresh jwt.ts module each time because getSecret()
  // caches the secret at module level (_cachedSecret). Without resetting
  // modules, earlier tests that set a valid AUTH_SECRET leave the cache
  // populated, so getSecret() never re-reads process.env.AUTH_SECRET.

  async function importFreshLoginAdmin() {
    vi.resetModules();
    const mod = await import('@/server/admin-auth');
    return mod.loginAdmin;
  }

  it('debe lanzar error si AUTH_SECRET no está configurado', async () => {
    delete process.env.AUTH_SECRET;
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const freshLoginAdmin = await importFreshLoginAdmin();

    try {
      await freshLoginAdmin('customuser', 'custompass');
      expect.fail('Deberia haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('AUTH_SECRET must be set');
    }
  });

  it('debe lanzar error si AUTH_SECRET es menor a 32 caracteres', async () => {
    process.env.AUTH_SECRET = 'short-secret';
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const freshLoginAdmin = await importFreshLoginAdmin();

    try {
      await freshLoginAdmin('customuser', 'custompass');
      expect.fail('Deberia haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('AUTH_SECRET must be at least 32 characters');
    }
  });

  it('debe aceptar AUTH_SECRET de exactamente 32 caracteres', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(32);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const freshLoginAdmin = await importFreshLoginAdmin();
    const result = await freshLoginAdmin('customuser', 'custompass');

    expect(result.ok).toBe(true);
  });

  it('debe aceptar AUTH_SECRET mayor a 32 caracteres', async () => {
    process.env.AUTH_SECRET = 'a'.repeat(64);
    process.env.ADMIN_USER = 'customuser';
    process.env.ADMIN_PASSWORD = 'custompass';

    const freshLoginAdmin = await importFreshLoginAdmin();
    const result = await freshLoginAdmin('customuser', 'custompass');

    expect(result.ok).toBe(true);
  });
});
