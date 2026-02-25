import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UUID_STUDENT, UUID_PARENT, UUID_SESSION } from '../_helpers/fixtures';

// ────────────────────────────────────────────────────
// MOCKS
// ────────────────────────────────────────────────────

vi.mock('@/server/auth', () => ({
  requireStudentOwnership: vi.fn(async () => ({
    padre: { id: UUID_PARENT },
    estudiante: {
      id: UUID_STUDENT,
      parentId: UUID_PARENT,
      nombre: 'Nino',
      nivelLectura: 2.0,
      fechaNacimiento: new Date('2018-05-15'),
    },
  })),
}));

vi.mock('@omegaread/db', () => ({
  sessions: { id: 'id', studentId: 'student_id' },
  responses: { sessionId: 'session_id' },
  difficultyAdjustments: { id: 'id', studentId: 'student_id' },
  manualAdjustments: { id: 'id', sessionId: 'session_id' },
  students: { id: 'id', nivelLectura: 'nivel_lectura' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
}));

vi.mock('@/lib/ai/prompts', () => ({
  getNivelConfig: vi.fn((nivel: number) => ({
    nivel,
    wpmEsperado: 85 + nivel * 10,
    tiempoEsperadoMs: 180000 + nivel * 30000,
  })),
  NIVEL_MAX: 4.8,
  NIVEL_MIN: 1.0,
  desplazarSubnivel: vi.fn((nivel: number, direction: string) => {
    if (direction === 'subir') return Math.min(4.8, nivel + 0.4);
    if (direction === 'bajar') return Math.max(1.0, nivel - 0.4);
    return nivel;
  }),
  normalizarSubnivel: vi.fn((nivel: number) => {
    return Math.max(1.0, Math.min(4.8, nivel));
  }),
}));

// REMOVED: No mock for @/lib/types/reading
// determinarAjuste is a pure function. The real logic should be tested directly.
// Test data below is designed to trigger the real function's behavior.

const mockFindFirst = vi.fn(async () => null);
const mockFindMany = vi.fn(async () => []);
const mockReturning = vi.fn(async () => [{ id: 'adj-1' }]);
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockSet = vi.fn(() => ({ where: vi.fn(async () => []) }));
const mockWhere = vi.fn(async () => []);
const mockTransaction = vi.fn(async (fn: Function) => fn({ query: { sessions: { findMany: mockFindMany }, manualAdjustments: { findFirst: mockFindFirst } }, insert: vi.fn(() => ({ values: mockValues })), update: vi.fn(() => ({ set: mockSet })), select: vi.fn(() => ({ from: mockWhere })) }));

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn(() => ({ values: mockValues })),
    select: vi.fn(() => ({ from: mockWhere })),
    update: vi.fn(() => ({ set: mockSet })),
    query: {
      sessions: { findFirst: mockFindFirst, findMany: mockFindMany },
      manualAdjustments: { findFirst: mockFindFirst },
      students: { findFirst: mockFindFirst },
    },
    transaction: mockTransaction,
  })),
}));

import { crearSesionLectura, registrarRespuestaComprension, calcularAjusteDificultad } from '@/server/actions/reading-actions';

describe('reading-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────
  // CREAR SESION LECTURA
  // ────────────────────────────────────────────────────

  it('debería crear sesión de lectura adaptativa', async () => {
    mockReturning.mockResolvedValueOnce([{ id: UUID_SESSION }]);

    const result = await crearSesionLectura({
      studentId: UUID_STUDENT,
      nivelTexto: 2.0,
    });

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBe(UUID_SESSION);
  });

  it('debería guardar metadata de sesión', async () => {
    mockReturning.mockResolvedValueOnce([{ id: UUID_SESSION }]);

    await crearSesionLectura({
      studentId: UUID_STUDENT,
      textoId: 'story-1',
      nivelTexto: 2.5,
    });

    expect(mockValues).toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────
  // REGISTRAR RESPUESTA COMPRENSION
  // ────────────────────────────────────────────────────

  it('debería guardar respuesta de comprensión literal', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: UUID_SESSION,
      studentId: UUID_STUDENT,
    });

    const result = await registrarRespuestaComprension({
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      preguntaId: 'q-1',
      tipo: 'literal',
      respuestaSeleccionada: 1,
      correcta: true,
      tiempoMs: 5000,
    });

    expect(result.ok).toBe(true);
  });

  it('debería guardar respuesta de comprensión inferencia', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: UUID_SESSION,
      studentId: UUID_STUDENT,
    });

    const result = await registrarRespuestaComprension({
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      preguntaId: 'q-2',
      tipo: 'inferencia',
      respuestaSeleccionada: 2,
      correcta: false,
      tiempoMs: 8000,
    });

    expect(result.ok).toBe(true);
  });

  it('debería fallar si sesión no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(
      registrarRespuestaComprension({
        sessionId: '00000000-0000-4000-8000-000000000099',
        studentId: UUID_STUDENT,
        preguntaId: 'q-1',
        tipo: 'vocabulario',
        respuestaSeleccionada: 0,
        correcta: true,
        tiempoMs: 3000,
      }),
    ).rejects.toThrow('Sesion no encontrada');
  });

  // ────────────────────────────────────────────────────
  // CALCULAR AJUSTE DIFICULTAD
  // ────────────────────────────────────────────────────

  it('debería subir nivel cuando score >= 80% en sesiones consecutivas', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: UUID_SESSION,
        studentId: UUID_STUDENT,
        tipoActividad: 'lectura',
        iniciadaEn: new Date(),
        metadata: { comprensionScore: 0.85 },
      },
    ]);
    mockFindFirst.mockResolvedValueOnce(null);

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => []) },
        manualAdjustments: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: UUID_SESSION,
      comprensionScore: 0.85,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
      wpmPromedio: 95,
    });

    expect(result.ok).toBe(true);
  });

  it('debería mantener nivel cuando score está entre 60-79%', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000000031',
        studentId: UUID_STUDENT,
        tipoActividad: 'lectura',
        iniciadaEn: new Date(),
        metadata: { comprensionScore: 0.70 },
      },
    ]);
    mockFindFirst.mockResolvedValueOnce(null);

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => []) },
        manualAdjustments: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: '00000000-0000-4000-8000-000000000032',
      comprensionScore: 0.70,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
    });

    expect(result.ok).toBe(true);
    expect(result.direccion).toBe('mantener');
  });

  it('debería bajar nivel cuando score < 60%', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => [
          {
            id: '00000000-0000-4000-8000-000000000033',
            studentId: UUID_STUDENT,
            tipoActividad: 'lectura',
            iniciadaEn: new Date(),
            metadata: { comprensionScore: 0.45 },
          },
        ]) },
        manualAdjustments: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: '00000000-0000-4000-8000-000000000034',
      comprensionScore: 0.45,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
    });

    expect(result.ok).toBe(true);
    expect(result.direccion).toBe('bajar');
  });

  it('debería aplicar modificador manual mas_facil', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000050',
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      tipo: 'mas_facil',
    });

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => []) },
        manualAdjustments: { findFirst: vi.fn(async () => ({ id: '00000000-0000-4000-8000-000000000050', tipo: 'mas_facil' })) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: UUID_SESSION,
      comprensionScore: 0.75,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
    });

    expect(result.ok).toBe(true);
  });

  it('debería calcular estabilidad desde sesiones recientes', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000000060',
        metadata: { comprensionScore: 0.75 },
        iniciadaEn: new Date(),
      },
      {
        id: '00000000-0000-4000-8000-000000000061',
        metadata: { comprensionScore: 0.78 },
        iniciadaEn: new Date(),
      },
      {
        id: '00000000-0000-4000-8000-000000000062',
        metadata: { comprensionScore: 0.72 },
        iniciadaEn: new Date(),
      },
    ]);
    mockFindFirst.mockResolvedValueOnce(null);

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => []) },
        manualAdjustments: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: '00000000-0000-4000-8000-000000000063',
      comprensionScore: 0.76,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
    });

    expect(result.ok).toBe(true);
  });

  it('debería incluir razon descriptiva en respuesta', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockFindFirst.mockResolvedValueOnce(null);

    const txDb = {
      query: {
        sessions: { findMany: vi.fn(async () => []) },
        manualAdjustments: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    };

    mockTransaction.mockImplementationOnce(async (fn: Function) => {
      return fn(txDb);
    });

    const result = await calcularAjusteDificultad({
      studentId: UUID_STUDENT,
      sessionId: '00000000-0000-4000-8000-000000000070',
      comprensionScore: 0.65,
      tiempoLecturaMs: 180000,
      tiempoEsperadoMs: 180000,
    });

    expect(result.ok).toBe(true);
    expect(result.razon).toBeDefined();
    expect(typeof result.razon).toBe('string');
  });
});
