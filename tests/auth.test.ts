/**
 * Tests para autenticación de padres (auth.ts).
 * Cubre: registrarPadre, loginPadre, obtenerPadreActual, requireAuth, requireStudentOwnership.
 *
 * Mocking strategy:
 * - next/headers and next/navigation: Aliased to __mocks__/next/* in vitest.config.ts
 * - jose, bcryptjs, @/server/db, @zetaread/db: Mocked inline with vi.mock()
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UUID_PARENT, UUID_STUDENT, createMockParent, createMockStudent } from './_helpers/fixtures';

// ─── SHARED MOCK OBJECTS ───

const mockDb = {
  insert: vi.fn(),
  query: {
    parents: {
      findFirst: vi.fn(),
    },
    students: {
      findFirst: vi.fn(),
    },
  },
};

// Mock cookie store - must be initialized before tests
// Gets the actual mock from the next/headers mock when needed
let mockCookieStore: any = null;

// ─── MOCKS (jose, bcryptjs, @/server/db, @zetaread/db) ───

vi.mock('jose', () => {
  const mockSignJWT = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn(async () => 'mock-jwt-token'),
  };
  return {
    SignJWT: class {
      constructor() {
        return mockSignJWT;
      }
    },
    jwtVerify: vi.fn(),
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password: string) => `$2a$12$hashed-${password}`),
    compare: vi.fn(async () => true),
  },
}));

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => mockDb),
}));

vi.mock('@zetaread/db', () => ({
  parents: {},
  students: {},
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conditions: unknown[]) => ({ and: conditions })),
}));

// ─── DYNAMIC IMPORTS ───

async function importAuth() {
  return import('@/server/auth');
}

// ─── TESTS ───

describe('auth.ts - registrarPadre', () => {
  beforeEach(async () => {
    // Get the mock cookie store from the mocked next/headers
    const nextHeaders = await import('next/headers');
    const result = await nextHeaders.cookies();
    mockCookieStore = result;

    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'a'.repeat(32);
  });

  it('debe insertar padre con email normalizado (lowercase)', async () => {
    const { registrarPadre } = await importAuth();
    const mockParent = createMockParent();

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [mockParent]),
      }),
    });

    const result = await registrarPadre({
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      nombre: 'Juan',
    });

    expect(result).toEqual(mockParent);
    expect(mockDb.insert).toHaveBeenCalled();
    const insertCall = mockDb.insert.mock.calls[0][0];
    const valuesCall = mockDb.insert().values.mock.calls[0][0];
    expect(valuesCall.email).toBe('test@example.com');
  });

  it('debe normalizar email (trim + lowercase)', async () => {
    const { registrarPadre } = await importAuth();
    const mockParent = createMockParent();

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [mockParent]),
      }),
    });

    await registrarPadre({
      email: '  PADRE@TEST.COM  ',
      password: 'pass',
      nombre: 'Padre',
    });

    const valuesCall = mockDb.insert().values.mock.calls[0][0];
    expect(valuesCall.email).toBe('padre@test.com');
  });

  it('debe hashear la contraseña con bcrypt', async () => {
    const bcryptjs = await import('bcryptjs');
    const { registrarPadre } = await importAuth();
    const mockParent = createMockParent();

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [mockParent]),
      }),
    });

    await registrarPadre({
      email: 'padre@test.com',
      password: 'miPassword123',
      nombre: 'Padre',
    });

    expect(bcryptjs.default.hash).toHaveBeenCalledWith('miPassword123', 12);
    const valuesCall = mockDb.insert().values.mock.calls[0][0];
    expect(valuesCall.passwordHash).toContain('$2a$12$hashed-');
  });

  it('debe retornar objeto padre con id', async () => {
    const { registrarPadre } = await importAuth();
    const mockParent = createMockParent({ id: UUID_PARENT, email: 'nuevo@test.com' });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [mockParent]),
      }),
    });

    const result = await registrarPadre({
      email: 'nuevo@test.com',
      password: 'pass',
      nombre: 'Nuevo Padre',
    });

    expect(result.id).toBe(UUID_PARENT);
    expect(result.email).toBe('nuevo@test.com');
  });

  it('debe normalizar nombre (trim)', async () => {
    const { registrarPadre } = await importAuth();
    const mockParent = createMockParent();

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => [mockParent]),
      }),
    });

    await registrarPadre({
      email: 'padre@test.com',
      password: 'pass',
      nombre: '  Juan Pérez  ',
    });

    const valuesCall = mockDb.insert().values.mock.calls[0][0];
    expect(valuesCall.nombre).toBe('Juan Pérez');
  });
});

describe('auth.ts - loginPadre', () => {
  beforeEach(async () => {
    const nextHeaders = await import('next/headers');
    mockCookieStore = await nextHeaders.cookies();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'a'.repeat(32);
  });

  it('debe retornar padre cuando credenciales son válidas', async () => {
    const { loginPadre } = await importAuth();
    const mockParent = createMockParent({ email: 'padre@test.com' });

    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(true);

    const result = await loginPadre('padre@test.com', 'password123');

    expect(result).toEqual(mockParent);
    expect(mockDb.query.parents.findFirst).toHaveBeenCalled();
  });

  it('debe retornar null cuando usuario no existe', async () => {
    const { loginPadre } = await importAuth();

    mockDb.query.parents.findFirst.mockResolvedValue(null);

    const result = await loginPadre('inexistente@test.com', 'password123');

    expect(result).toBeNull();
  });

  it('debe retornar null cuando contraseña es incorrecta', async () => {
    const { loginPadre } = await importAuth();
    const mockParent = createMockParent({ email: 'padre@test.com' });

    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(false);

    const result = await loginPadre('padre@test.com', 'wrongpassword');

    expect(result).toBeNull();
  });

  it('debe normalizar email (lowercase + trim)', async () => {
    const { loginPadre } = await importAuth();
    const mockParent = createMockParent({ email: 'padre@test.com' });

    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(true);

    await loginPadre('  PADRE@TEST.COM  ', 'password123');

    const findFirstCall = mockDb.query.parents.findFirst.mock.calls[0][0];
    expect(findFirstCall).toBeDefined();
  });

  it('debe establecer cookie JWT en login exitoso', async () => {
    const { loginPadre } = await importAuth();
    const mockParent = createMockParent({ id: UUID_PARENT, email: 'padre@test.com' });

    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(true);

    await loginPadre('padre@test.com', 'password123');

    expect(mockCookieStore.set).toHaveBeenCalled();
    const setCookieCall = mockCookieStore.set.mock.calls[0];
    expect(setCookieCall[0]).toBe('omega-auth');
    expect(setCookieCall[1]).toBe('mock-jwt-token');
  });

  it('debe setear cookie con opciones correctas (httpOnly, 7 días)', async () => {
    const { loginPadre } = await importAuth();
    const mockParent = createMockParent();

    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(true);

    await loginPadre('padre@test.com', 'password123');

    const setCookieCall = mockCookieStore.set.mock.calls[0];
    const cookieOptions = setCookieCall[2];
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60);
    expect(cookieOptions.path).toBe('/');
  });
});

describe('auth.ts - obtenerPadreActual', () => {
  beforeEach(async () => {
    const nextHeaders = await import('next/headers');
    mockCookieStore = await nextHeaders.cookies();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'a'.repeat(32);
  });

  it('debe retornar null cuando no hay cookie', async () => {
    const { obtenerPadreActual } = await importAuth();

    mockCookieStore.get.mockReturnValue(undefined);

    const result = await obtenerPadreActual();

    expect(result).toBeNull();
  });

  it('debe retornar null cuando JWT es inválido', async () => {
    const { obtenerPadreActual } = await importAuth();

    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockRejectedValue(new Error('Invalid token'));

    const result = await obtenerPadreActual();

    expect(result).toBeNull();
  });

  it('debe retornar padre cuando cookie y JWT son válidos', async () => {
    const { obtenerPadreActual } = await importAuth();
    const mockParent = createMockParent();

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);

    const result = await obtenerPadreActual();

    expect(result).toEqual(mockParent);
    expect(mockDb.query.parents.findFirst).toHaveBeenCalled();
  });

  it('debe buscar padre por id desde el JWT', async () => {
    const { obtenerPadreActual } = await importAuth();
    const mockParent = createMockParent({ id: UUID_PARENT });

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);

    await obtenerPadreActual();

    expect(mockDb.query.parents.findFirst).toHaveBeenCalled();
  });

  it('debe incluir relación students en el query', async () => {
    const { obtenerPadreActual } = await importAuth();
    const mockParent = createMockParent({ students: [createMockStudent()] });

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);

    const result = await obtenerPadreActual();

    expect(result.students).toBeDefined();
  });
});

describe('auth.ts - requireAuth', () => {
  beforeEach(async () => {
    const nextHeaders = await import('next/headers');
    mockCookieStore = await nextHeaders.cookies();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'a'.repeat(32);
  });

  it('debe retornar padre cuando autenticado', async () => {
    const { requireAuth } = await importAuth();
    const mockParent = createMockParent();

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValue(mockParent);

    const result = await requireAuth();

    expect(result).toEqual(mockParent);
  });

  it('debe redirigir a /padre/login cuando no autenticado', async () => {
    const { requireAuth } = await importAuth();

    mockCookieStore.get.mockReturnValue(undefined);

    try {
      await requireAuth();
      expect.fail('Debería haber lanzado redirect');
    } catch (error: any) {
      expect(error.message).toContain('REDIRECT:/padre/login');
    }
  });

  it('debe redirigir cuando JWT es inválido', async () => {
    const { requireAuth } = await importAuth();

    mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockRejectedValue(new Error('Invalid token'));

    try {
      await requireAuth();
      expect.fail('Debería haber lanzado redirect');
    } catch (error: any) {
      expect(error.message).toContain('REDIRECT:/padre/login');
    }
  });
});

describe('auth.ts - requireStudentOwnership', () => {
  beforeEach(async () => {
    const nextHeaders = await import('next/headers');
    mockCookieStore = await nextHeaders.cookies();
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'a'.repeat(32);
  });

  it('debe retornar padre y estudiante cuando estudiante pertenece al padre', async () => {
    const { requireStudentOwnership } = await importAuth();
    const mockParent = createMockParent();
    const mockStudent = createMockStudent({ parentId: UUID_PARENT });

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValueOnce(mockParent);
    mockDb.query.students.findFirst.mockResolvedValue(mockStudent);

    const result = await requireStudentOwnership(UUID_STUDENT);

    expect(result.padre).toEqual(mockParent);
    expect(result.estudiante).toEqual(mockStudent);
  });

  it('debe lanzar error cuando estudiante no pertenece al padre', async () => {
    const { requireStudentOwnership } = await importAuth();
    const mockParent = createMockParent();

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValueOnce(mockParent);
    mockDb.query.students.findFirst.mockResolvedValue(null);

    try {
      await requireStudentOwnership(UUID_STUDENT);
      expect.fail('Debería haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('Acceso no autorizado');
    }
  });

  it('debe redirigir cuando no autenticado (requireAuth falla)', async () => {
    const { requireStudentOwnership } = await importAuth();

    mockCookieStore.get.mockReturnValue(undefined);

    try {
      await requireStudentOwnership(UUID_STUDENT);
      expect.fail('Debería haber lanzado redirect');
    } catch (error: any) {
      expect(error.message).toContain('REDIRECT:/padre/login');
    }
  });

  it('debe buscar estudiante con parentId del padre autenticado', async () => {
    const { requireStudentOwnership } = await importAuth();
    const mockParent = createMockParent({ id: UUID_PARENT });
    const mockStudent = createMockStudent();

    mockCookieStore.get.mockReturnValue({ value: 'valid-token' });
    const jose = await import('jose');
    (jose.jwtVerify as any).mockResolvedValue({
      payload: { parentId: UUID_PARENT, email: 'padre@test.com' },
    });
    mockDb.query.parents.findFirst.mockResolvedValueOnce(mockParent);
    mockDb.query.students.findFirst.mockResolvedValue(mockStudent);

    await requireStudentOwnership(UUID_STUDENT);

    expect(mockDb.query.students.findFirst).toHaveBeenCalled();
  });
});

describe('auth.ts - Error handling', () => {
  beforeEach(async () => {
    const nextHeaders = await import('next/headers');
    mockCookieStore = await nextHeaders.cookies();
    vi.clearAllMocks();
  });

  it('debe lanzar error si AUTH_SECRET no está configurado', async () => {
    delete process.env.AUTH_SECRET;

    // Reset modules to clear the _cachedSecret in jwt.ts. Without this,
    // earlier tests that set a valid AUTH_SECRET leave the cache populated,
    // so getSecret() never re-reads process.env and never throws.
    vi.resetModules();
    const { loginPadre } = await import('@/server/auth');

    mockDb.query.parents.findFirst.mockResolvedValue(createMockParent());
    const bcryptjs = await import('bcryptjs');
    (bcryptjs.default.compare as any).mockResolvedValue(true);

    try {
      await loginPadre('padre@test.com', 'password');
      expect.fail('Deberia haber lanzado error');
    } catch (error: any) {
      expect(error.message).toContain('AUTH_SECRET must be set');
    }
  });
});
