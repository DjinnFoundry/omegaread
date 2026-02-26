import { vi, describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────
// MOCKS
// ────────────────────────────────────────────────────

vi.mock('@/server/auth', () => ({
  requireStudentOwnership: vi.fn(async () => ({
    padre: { id: 'parent-1', config: { funMode: false } },
    estudiante: {
      id: 'student-1',
      parentId: 'parent-1',
      nombre: 'Juan',
      nivelLectura: 2.0,
      fechaNacimiento: new Date('2018-05-15'),
      eloGlobal: 1000,
      eloLiteral: 1000,
      eloInferencia: 1000,
      eloVocabulario: 1000,
      eloResumen: 1000,
      eloRd: 350,
      contextoPersonal: '',
      personajesFavoritos: '',
      intereses: [],
      temasEvitar: [],
      senalesDificultad: {},
      accesibilidad: {},
    },
  })),
}));

vi.mock('@/lib/utils/fecha', () => ({
  calcularEdad: vi.fn(() => 6),
}));

vi.mock('@/lib/profile/micro-profile', () => ({
  seleccionarPreguntaPerfilActiva: vi.fn(() => null),
}));

vi.mock('@/lib/learning/graph', () => ({
  recomendarSiguientesSkills: vi.fn(() => []),
}));

vi.mock('@/lib/data/skills', () => ({
  DOMINIOS: [{ slug: 'naturaleza', nombre: 'Naturaleza', emoji: '🌿' }],
  getSkillBySlug: vi.fn(() => ({ slug: 'animales', nombre: 'Animales', dominio: 'naturaleza', emoji: '🦁' })),
  getSkillsDeDominio: vi.fn(() => []),
}));

vi.mock('@zetaread/db', () => ({
  sessions: { id: 'id', studentId: 'student_id' },
  responses: { sessionId: 'session_id' },
  generatedStories: { id: 'id', studentId: 'student_id' },
  topics: { id: 'id', slug: 'slug' },
  difficultyAdjustments: { id: 'id', studentId: 'student_id' },
  eloSnapshots: { id: 'id', studentId: 'student_id' },
  skillProgress: { studentId: 'student_id' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
  asc: vi.fn(),
  inArray: vi.fn((...args: unknown[]) => args),
}));

// Per-entity mock functions to handle parallel queries correctly
const mockSessionsFindMany = vi.fn(async () => []);
const mockResponsesFindMany = vi.fn(async () => []);
const mockStoriesFindMany = vi.fn(async () => []);
const mockTopicsFindMany = vi.fn(async () => []);
const mockAdjustmentsFindMany = vi.fn(async () => []);
const mockEloSnapshotsFindMany = vi.fn(async () => []);
const mockSkillProgressFindMany = vi.fn(async () => []);
const mockFindFirst = vi.fn(async () => null);

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    query: {
      sessions: { findMany: mockSessionsFindMany, findFirst: mockFindFirst },
      responses: { findMany: mockResponsesFindMany },
      generatedStories: { findMany: mockStoriesFindMany },
      topics: { findMany: mockTopicsFindMany },
      difficultyAdjustments: { findMany: mockAdjustmentsFindMany },
      eloSnapshots: { findMany: mockEloSnapshotsFindMany },
      skillProgress: { findMany: mockSkillProgressFindMany },
    },
  })),
}));

import { obtenerDashboardNino, obtenerDashboardPadre } from '@/server/actions/dashboard-actions';

describe('dashboard-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all per-entity mocks to return empty arrays by default
    mockSessionsFindMany.mockResolvedValue([]);
    mockResponsesFindMany.mockResolvedValue([]);
    mockStoriesFindMany.mockResolvedValue([]);
    mockTopicsFindMany.mockResolvedValue([]);
    mockAdjustmentsFindMany.mockResolvedValue([]);
    mockEloSnapshotsFindMany.mockResolvedValue([]);
    mockSkillProgressFindMany.mockResolvedValue([]);
  });

  // ────────────────────────────────────────────────────
  // DASHBOARD NINO
  // ────────────────────────────────────────────────────

  it('deberia obtener dashboard del nino con sesiones completadas', async () => {
    const hoy = new Date();
    const sesiones = [
      {
        id: 'session-1',
        studentId: 'student-1',
        tipoActividad: 'lectura',
        completada: true,
        storyId: 'story-1',
        iniciadaEn: new Date(hoy.getTime() - 3600000),
        duracionSegundos: 300,
        estrellasGanadas: 3,
      },
    ];

    mockSessionsFindMany.mockResolvedValue(sesiones);

    const result = await obtenerDashboardNino('student-1');

    expect(result).toBeDefined();
    expect(result.tendenciaComprension).toBeDefined();
    expect(result.racha).toBeDefined();
    expect(result.mensajeMotivacional).toBeDefined();
  });

  it('deberia retornar datos vacios cuando no hay sesiones', async () => {
    const result = await obtenerDashboardNino('student-1');

    expect(result.tendenciaComprension).toHaveLength(0);
    expect(result.racha.diasConsecutivos).toBe(0);
  });

  it('deberia calcular ritmo lector mejorado', async () => {
    const hoy = new Date();
    const sesiones = [
      { id: 's6', tipoActividad: 'lectura', storyId: null, duracionSegundos: 320, iniciadaEn: new Date(hoy.getTime() - 60 * 60 * 1000) },
      { id: 's5', tipoActividad: 'lectura', storyId: null, duracionSegundos: 300, iniciadaEn: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000) },
      { id: 's4', tipoActividad: 'lectura', storyId: null, duracionSegundos: 570, iniciadaEn: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000) },
      { id: 's3', tipoActividad: 'lectura', storyId: null, duracionSegundos: 590, iniciadaEn: new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000) },
      { id: 's2', tipoActividad: 'lectura', storyId: null, duracionSegundos: 580, iniciadaEn: new Date(hoy.getTime() - 6 * 24 * 60 * 60 * 1000) },
      { id: 's1', tipoActividad: 'lectura', storyId: null, duracionSegundos: 600, iniciadaEn: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000) },
    ];

    mockSessionsFindMany.mockResolvedValue(sesiones);

    const result = await obtenerDashboardNino('student-1');

    expect(result).toBeDefined();
    expect(result.racha).toBeDefined();
  });

  it('deberia calcular racha con ultimos 7 dias', async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const sesiones = [
      { id: 's1', tipoActividad: 'lectura', iniciadaEn: new Date(hoy) },
      { id: 's2', tipoActividad: 'lectura', iniciadaEn: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000) },
      { id: 's3', tipoActividad: 'lectura', iniciadaEn: new Date(hoy.getTime() - 2 * 24 * 60 * 60 * 1000) },
    ];

    mockSessionsFindMany.mockResolvedValue(sesiones);

    const result = await obtenerDashboardNino('student-1');

    expect(result.racha.ultimosDias).toHaveLength(7);
  });

  // ────────────────────────────────────────────────────
  // DASHBOARD PADRE
  // ────────────────────────────────────────────────────

  it('deberia obtener dashboard padre con evolucion semanal', async () => {
    const hoy = new Date();
    const sesiones = [
      {
        id: '00000000-0000-4000-8000-000000000010',
        studentId: 'student-1',
        tipoActividad: 'lectura',
        completada: true,
        storyId: '00000000-0000-4000-8000-000000000040',
        iniciadaEn: new Date(hoy.getTime() - 24 * 60 * 60 * 1000),
        duracionSegundos: 300,
        wpmPromedio: 95,
      },
    ];

    const historias = [
      {
        id: '00000000-0000-4000-8000-000000000040',
        topicSlug: 'animales',
      },
    ];

    mockSessionsFindMany.mockResolvedValue(sesiones);
    mockStoriesFindMany.mockResolvedValue(historias);

    const result = await obtenerDashboardPadre('student-1');

    expect(result).toBeDefined();
    expect(result.studentId).toBe('student-1');
    expect(result.nombreEstudiante).toBe('Juan');
    expect(result.evolucionSemanal).toBeDefined();
    expect(result.desgloseTipos).toBeDefined();
  });

  it('deberia incluir historial de sesiones (ultimas 20)', async () => {
    const hoy = new Date();
    const sesiones = Array.from({ length: 25 }, (_, i) => ({
      id: `session-${i}`,
      studentId: 'student-1',
      tipoActividad: 'lectura',
      completada: true,
      storyId: `story-${i}`,
      iniciadaEn: new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000),
      duracionSegundos: 300,
    }));

    mockSessionsFindMany.mockResolvedValue(sesiones);

    const result = await obtenerDashboardPadre('student-1');

    expect(result.historialSesiones.length).toBeLessThanOrEqual(20);
  });

  it('deberia incluir evolucion Elo', async () => {
    mockEloSnapshotsFindMany.mockResolvedValue([
      {
        id: 'elo-snapshot-1',
        studentId: 'student-1',
        sessionId: 'session-1',
        creadoEn: new Date(),
        eloGlobal: 1050,
        eloLiteral: 1040,
        eloInferencia: 1030,
        eloVocabulario: 1020,
        eloResumen: 1010,
        rdGlobal: 360,
      },
    ]);

    const result = await obtenerDashboardPadre('student-1');

    expect(result.eloEvolucion).toBeDefined();
    expect(result.eloActual).toBeDefined();
  });

  it('deberia incluir timeline de cambios de nivel', async () => {
    mockAdjustmentsFindMany.mockResolvedValue([
      {
        id: 'adj-1',
        studentId: 'student-1',
        sessionId: 'session-1',
        creadoEn: new Date(),
        nivelAnterior: 2.0,
        nivelNuevo: 2.4,
        direccion: 'subir',
        razon: 'Score alto',
        evidencia: { comprensionScore: 0.85 },
      },
    ]);

    const result = await obtenerDashboardPadre('student-1');

    expect(result.timelineCambiosNivel).toBeDefined();
  });

  it('deberia incluir Elo actual y Elo por tipo', async () => {
    const result = await obtenerDashboardPadre('student-1');

    expect(result.eloActual.global).toBe(1000);
    expect(result.eloActual.literal).toBe(1000);
    expect(result.desgloseTipos).toBeDefined();
  });
});
