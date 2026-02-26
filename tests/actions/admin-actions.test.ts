import { vi, describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────
// MOCKS
// ────────────────────────────────────────────────────

vi.mock('@/server/admin-auth', () => ({
  requireAdminAuth: vi.fn(async () => ({ username: 'admin' })),
}));

vi.mock('@zetaread/db', () => ({
  generatedStories: { id: 'id', creadoEn: 'creado_en', studentId: 'student_id' },
  responses: { id: 'id', sessionId: 'session_id', correcta: 'correcta' },
  sessions: { id: 'id', studentId: 'student_id', tipoActividad: 'tipo_actividad', completada: 'completada' },
  students: { id: 'id', creadoEn: 'creado_en' },
  asc: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(),
  eq: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
  sql: Object.assign(
    vi.fn((strings: any, ...values: any[]) => ({ _isRaw: true, strings, values })),
    { raw: vi.fn() }
  ),
}));

/**
 * Create a single chainable query builder with all methods
 * Each method returns a new builder to support chaining
 */
const createChainableBuilder = () => {
  let result: any[] = [];

  const builder = {
    from: vi.fn(function() {
      return builder;
    }),
    where: vi.fn(function() {
      return builder;
    }),
    orderBy: vi.fn(function() {
      return builder;
    }),
    leftJoin: vi.fn(function() {
      return builder;
    }),
    groupBy: vi.fn(function() {
      return builder;
    }),
    limit: vi.fn(function() {
      return builder;
    }),
    offset: vi.fn(function() {
      return builder;
    }),
    // The actual execution
    then: vi.fn(function(onFulfilled) {
      return Promise.resolve(result).then(onFulfilled);
    }),
    // For Promise.all compatibility
    [Symbol.toStringTag]: 'Promise',
  };

  // Make from, where, orderBy etc. resolve to the result when awaited
  // by wrapping them to return a Promise-like
  const createResolvableBuilder = (currentResult: any[]) => {
    const resolvable = {
      from: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      where: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      orderBy: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      leftJoin: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      groupBy: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      limit: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      offset: vi.fn(function() {
        return createResolvableBuilder(currentResult);
      }),
      then: vi.fn(function(onFulfilled: any) {
        return Promise.resolve(currentResult).then(onFulfilled);
      }),
      catch: vi.fn(function(onRejected: any) {
        return Promise.resolve(currentResult).catch(onRejected);
      }),
      finally: vi.fn(function(onFinally: any) {
        return Promise.resolve(currentResult).finally(onFinally);
      }),
    };
    return resolvable;
  };

  return { createResolvableBuilder, setResult: (r: any[]) => { result = r; } };
};

let dbBuilder: any;
let builderResults: any[] = [];

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => {
    const { createResolvableBuilder, setResult } = createChainableBuilder();
    return {
      select: vi.fn(function() {
        // Each call to select returns a new resolvable builder
        const builder = createResolvableBuilder(builderResults.shift() || []);
        return builder;
      }),
    };
  }),
}));

import { obtenerAdminDashboard } from '@/server/actions/admin-actions';

describe('admin-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builderResults = [];
  });

  // ────────────────────────────────────────────────────
  // OBTENER ADMIN DASHBOARD
  // ────────────────────────────────────────────────────

  it('debería obtener dashboard admin con totales', async () => {
    // The source makes 5 db.select() calls in Promise.all:
    // 1. totalStudents via count()
    // 2. totalStories via count()
    // 3. students with orderBy
    // 4. stories with where and orderBy
    // 5. sessions with leftJoin, where, groupBy, orderBy
    builderResults = [
      [{ value: 150 }], // totalStudents
      [{ value: 500 }], // totalStories
      [], // studentsRows
      [], // storiesRows
      [], // sessionStatsRows
    ];

    const result = await obtenerAdminDashboard();

    expect(result).toBeDefined();
    expect(result.totals).toBeDefined();
    expect(result.totals.students).toBe(150);
    expect(result.totals.stories).toBe(500);
  });

  it('debería calcular consumo de tokens por stories', async () => {
    const mockStoryWithUsage = {
      creadoEn: new Date(),
      metadata: {
        llmUsage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      },
    };

    builderResults = [
      [{ value: 10 }], // totalStudents
      [{ value: 100 }], // totalStories
      [], // studentsRows
      [mockStoryWithUsage], // storiesRows
      [], // sessionStatsRows
    ];

    const result = await obtenerAdminDashboard();

    expect(result.totals.totalStoryTokens).toBeGreaterThanOrEqual(0);
  });

  it('debería incluir historias por día en ventana de 30 días', async () => {
    builderResults = [
      [{ value: 10 }],
      [{ value: 100 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.storiesByDay).toBeDefined();
    expect(result.storiesByDay.length).toBe(30);
  });

  it('debería calcular DAU (Daily Active Users) y WAU (Weekly Active Users)', async () => {
    builderResults = [
      [{ value: 100 }], // totalStudents
      [{ value: 500 }], // totalStories
      [], // studentsRows
      [], // storiesRows
      [], // sessionStatsRows
    ];

    const result = await obtenerAdminDashboard();

    expect(result.engagement).toBeDefined();
    expect(result.engagement.dau).toBeDefined();
    expect(result.engagement.wau).toBeDefined();
    expect(result.engagement.series).toBeDefined();
  });

  it('debería calcular completion rate (stories generadas vs completadas)', async () => {
    builderResults = [
      [{ value: 50 }],
      [{ value: 200 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.completionByDay).toBeDefined();
    expect(result.totals.avgCompletionRate30d).toBeDefined();
  });

  it('debería incluir readings by student (top por actividad)', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        nombre: 'Juan',
        creadoEn: new Date(),
      },
      {
        id: 'student-2',
        nombre: 'Sofia',
        creadoEn: new Date(),
      },
    ];

    builderResults = [
      [{ value: 2 }], // totalStudents
      [{ value: 100 }], // totalStories
      mockStudents, // studentsRows
      [], // storiesRows
      [], // sessionStatsRows
    ];

    const result = await obtenerAdminDashboard();

    expect(result.readingsByStudent).toBeDefined();
    expect(result.readingsByStudent.length).toBeLessThanOrEqual(2);
  });

  it('debería calcular retention por cohorte (D1, D7, D30)', async () => {
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const estudiante = {
      id: 'student-1',
      nombre: 'Test',
      creadoEn: hace30Dias,
    };

    builderResults = [
      [{ value: 1 }],
      [{ value: 10 }],
      [estudiante],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.retentionByCohort).toBeDefined();
    expect(result.retentionByCohort.cohorts).toBeDefined();
  });

  it('debería incluir comprehension by cohort (evolución semanal)', async () => {
    builderResults = [
      [{ value: 50 }],
      [{ value: 300 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.comprehensionByCohort).toBeDefined();
    expect(result.comprehensionByCohort.weeks).toBeDefined();
    expect(result.comprehensionByCohort.cohorts).toBeDefined();
  });

  it('debería parsear LLM usage cost si está configurado', async () => {
    process.env.LLM_COST_INPUT_USD_PER_1M = '0.0005';
    process.env.LLM_COST_OUTPUT_USD_PER_1M = '0.0015';

    builderResults = [
      [{ value: 10 }],
      [{ value: 100 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.totals.pricingConfigured).toBe(true);
  });

  it('debería retornar null para estimatedCostUsd si pricing no está configurado', async () => {
    process.env.LLM_COST_INPUT_USD_PER_1M = '';
    process.env.LLM_COST_OUTPUT_USD_PER_1M = '';

    builderResults = [
      [{ value: 10 }],
      [{ value: 100 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.totals.pricingConfigured).toBe(false);
    expect(result.totals.estimatedCostUsd).toBeNull();
  });

  it('debería incluir timestamp generatedAt', async () => {
    builderResults = [
      [{ value: 10 }],
      [{ value: 100 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.generatedAt).toBeDefined();
    expect(typeof result.generatedAt).toBe('string');
  });

  it('debería requerir autenticación de admin', async () => {
    // Import the mocked requireAdminAuth
    const { requireAdminAuth } = await vi.importMock('@/server/admin-auth');

    // Configure it to throw an error
    (requireAdminAuth as any).mockRejectedValueOnce(new Error('Admin no autenticado'));

    // Call the actual action and expect it to reject with the auth error
    await expect(obtenerAdminDashboard()).rejects.toThrow('Admin no autenticado');
  });

  it('debería parsear question tokens de metadata de sesiones', async () => {
    builderResults = [
      [{ value: 10 }],
      [{ value: 100 }],
      [],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.totals.totalQuestionTokens).toBeDefined();
    expect(result.totals.totalTokens).toBeDefined();
  });

  it('debería calcular metricas por estudiante (totalReadings, avgComprehension)', async () => {
    const student = { id: 'student-1', nombre: 'Juan', creadoEn: new Date() };

    builderResults = [
      [{ value: 1 }],
      [{ value: 50 }],
      [student],
      [],
      [],
    ];

    const result = await obtenerAdminDashboard();

    expect(result.readingsByStudent).toBeDefined();
    if (result.readingsByStudent.length > 0) {
      expect(result.readingsByStudent[0]).toHaveProperty('totalReadings');
      expect(result.readingsByStudent[0]).toHaveProperty('avgComprehension');
    }
  });
});
