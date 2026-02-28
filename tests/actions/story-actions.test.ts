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
      nombre: 'Nino',
      nivelLectura: 2.0,
      fechaNacimiento: new Date('2018-05-15'),
      eloGlobal: 1000,
      eloLiteral: 1000,
      eloInferencia: 1000,
      eloVocabulario: 1000,
      eloResumen: 1000,
      eloRd: 350,
      intereses: [],
      senalesDificultad: {},
    },
  })),
}));

vi.mock('@/lib/ai/openai', () => ({
  getOpenAIClient: vi.fn(async () => ({ chat: { completions: { create: vi.fn() } } })),
  hasLLMKey: vi.fn(async () => true),
  getLLMModel: vi.fn(async () => 'test-model'),
  OpenAIKeyMissingError: Error,
}));

vi.mock('@/lib/ai/story-generator', () => ({
  generateStoryOnly: vi.fn(async () => ({
    ok: true,
    story: {
      titulo: 'Test Story',
      contenido: 'Once upon a time...',
      modelo: 'test-model',
      aprobadaQA: true,
      motivoRechazo: null,
      llmUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      metadata: { longitudPalabras: 500 },
    },
  })),
  generateQuestions: vi.fn(async () => ({
    ok: true,
    questions: {
      preguntas: [
        {
          tipo: 'literal',
          pregunta: 'Test question',
          opciones: ['A', 'B', 'C', 'D'],
          respuestaCorrecta: 0,
          explicacion: 'Explanation',
          dificultadPregunta: 3,
        },
      ],
      modelo: 'test-model',
      llmUsage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
    },
  })),
  rewriteStory: vi.fn(async () => ({
    ok: true,
    story: {
      titulo: 'Rewritten Story',
      contenido: 'Modified content...',
      modelo: 'test-model',
      aprobadaQA: true,
      preguntas: [],
      llmUsage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      metadata: { longitudPalabras: 400 },
    },
  })),
}));

vi.mock('@zetaread/db', () => ({
  generatedStories: { id: 'id', studentId: 'student_id', topicSlug: 'topic_slug' },
  storyQuestions: { id: 'id', storyId: 'story_id' },
  sessions: { id: 'id', studentId: 'student_id' },
  responses: { sessionId: 'session_id' },
  skillProgress: { studentId: 'student_id' },
  students: { id: 'id' },
  eloSnapshots: { id: 'id' },
  manualAdjustments: { id: 'id' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gte: vi.fn((...args: unknown[]) => args),
  lte: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
  sql: vi.fn((...args: unknown[]) => ({ raw: vi.fn() })),
}));

vi.mock('@/lib/ai/prompts', () => ({
  getNivelConfig: vi.fn(() => ({ tiempoEsperadoMs: 180000, wpmEsperado: 95 })),
  normalizarSubnivel: vi.fn((nivel: number) => nivel),
  calcularNivelReescritura: vi.fn((nivel: number, dir: string) => dir === 'mas_facil' ? nivel - 0.4 : nivel + 0.4),
  getModoFromCategoria: vi.fn(() => 'narrativo'),
  inferirEstrategiaPedagogica: vi.fn(() => 'basico'),
}));

vi.mock('@/lib/data/skills', () => ({
  TOPICS_SEED: [
    { slug: 'animales', nombre: 'Animales', categoria: 'naturaleza', emoji: '🦁', edadMinima: 3, edadMaxima: 10, descripcion: 'Animals' },
    { slug: 'sistema-solar', nombre: 'Sistema Solar', categoria: 'universo', emoji: '🪐', edadMinima: 5, edadMaxima: 10, descripcion: 'Space' },
  ],
  CATEGORIAS: [],
  getSkillBySlug: vi.fn(() => ({ slug: 'animales', nombre: 'Animales', dominio: 'naturaleza', prerequisitos: [] })),
  getSkillsDeDominio: vi.fn(() => []),
  getSkillsPorEdad: vi.fn(() => []),
  DOMINIOS: [],
}));

vi.mock('@/lib/utils/fecha', () => ({
  calcularEdad: vi.fn(() => 6),
}));

vi.mock('@/server/actions/reading-actions', () => ({
  calcularAjusteDificultad: vi.fn(async () => ({
    ok: true,
    sessionScore: 0.8,
    direccion: 'mantener',
    nivelAnterior: 2.0,
    nivelNuevo: 2.0,
  })),
}));

const { mockActualizarProgresoInmediato } = vi.hoisted(() => ({
  mockActualizarProgresoInmediato: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/server/actions/session-actions', () => ({
  actualizarProgresoInmediato: mockActualizarProgresoInmediato,
}));

vi.mock('@/lib/elo', () => ({
  procesarRespuestasElo: vi.fn(() => ({
    nuevoElo: { global: 1050, literal: 1040, inferencia: 1030, vocabulario: 1020, resumen: 1010, rd: 360 },
  })),
  inflarRdPorInactividad: vi.fn((elo) => elo),
}));

vi.mock('@/lib/learning/graph', () => ({
  recomendarSiguientesSkills: vi.fn(() => []),
}));

const mockFindFirst = vi.fn(async () => null);
const mockFindMany = vi.fn(async () => []);
const mockResponsesFindMany = vi.fn(async () => []);
const mockWhereSelect = vi.fn(async () => [{ count: 0 }]);
const mockFrom = vi.fn(() => ({ where: mockWhereSelect }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

// Track returning calls separately
const returningQueue: any[] = [];
let returningIndex = 0;

const mockReturning = vi.fn(async () => {
  const result = returningQueue[returningIndex] || [{ id: '00000000-0000-4000-8000-000000000040' }];
  returningIndex++;
  return result;
});

const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) }));

const createMockDbShape = () => ({
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  query: {
    generatedStories: { findMany: mockFindMany, findFirst: mockFindFirst },
    sessions: { findFirst: mockFindFirst, findMany: mockFindMany },
    responses: { findMany: mockResponsesFindMany },
    storyQuestions: { findMany: mockFindMany },
    students: { findFirst: mockFindFirst },
    skillProgress: { findMany: mockFindMany },
    manualAdjustments: { findFirst: mockFindFirst },
    eloSnapshots: {},
  },
});

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => {
    const shape = createMockDbShape();
    return {
      ...shape,
      // transaction(cb) executes cb with a tx that has the same shape as db
      transaction: vi.fn(async (cb: (tx: any) => Promise<void>) => {
        const tx = createMockDbShape();
        await cb(tx);
      }),
    };
  }),
}));

import {
  generarHistoria,
  generarPreguntasSesion,
  registrarLecturaCompletada,
  finalizarSesionLectura,
  reescribirHistoria,
} from '@/server/actions/story-actions';

describe('story-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks does NOT flush mockResolvedValueOnce queues.
    // Unconsumed once-values from previous tests leak into subsequent tests.
    // Reset shared mocks explicitly and restore their default implementations.
    mockFindFirst.mockReset().mockImplementation(async () => null);
    mockFindMany.mockReset().mockImplementation(async () => []);
    mockResponsesFindMany.mockReset().mockImplementation(async () => []);
    mockWhereSelect.mockReset().mockImplementation(async () => [{ count: 0 }]);
    mockInsert.mockReset().mockImplementation(() => ({ values: mockValues }));
    mockValues.mockReset().mockImplementation(() => ({ returning: mockReturning }));
    mockUpdate.mockReset().mockImplementation(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) }));
    mockReturning.mockReset().mockImplementation(async () => {
      const result = returningQueue[returningIndex] || [{ id: '00000000-0000-4000-8000-000000000040' }];
      returningIndex++;
      return result;
    });
    returningQueue.length = 0;
    returningIndex = 0;
  });

  // ────────────────────────────────────────────────────
  // GENERAR HISTORIA
  // ────────────────────────────────────────────────────

  it('debería generar historia nueva exitosamente con cache valida', async () => {
    // This test validates the happy path through cache retrieval
    // Mock count query (under limit)
    mockWhereSelect.mockResolvedValueOnce([{ count: 5 }]);
    // Mock skillProgress
    mockFindMany.mockResolvedValueOnce([]);
    // Mock recent stories
    mockFindMany.mockResolvedValueOnce([]);
    // Mock cache candidates - return a cached story
    mockFindMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000000040',
        titulo: 'Cached Story',
        contenido: 'Cached content',
        nivel: 2.0,
        reutilizable: true,
        aprobadaQA: true,
        questions: [{ id: 'q1', orden: 0, tipo: 'literal', pregunta: 'Test?', opciones: ['A', 'B', 'C', 'D'], respuestaCorrecta: 0, explicacion: 'Exp' }],
        metadata: { generationFlags: { funMode: false, tonoHistoria: 3 } },
      },
    ]);
    // Queue session insert returning
    returningQueue.push([{ id: '00000000-0000-4000-8000-000000000030' }]);

    const result = await generarHistoria({
      studentId: '00000000-0000-4000-8000-000000000020',
      topicSlug: 'animales',
    });

    expect(result.ok).toBe(true);
    expect(result.storyId).toBe('00000000-0000-4000-8000-000000000040');
    expect(result.sessionId).toBeDefined();
    expect(result.fromCache).toBe(true);
  });

  it('debería retornar error si no hay API key configurada', async () => {
    const { hasLLMKey } = await vi.importMock('@/lib/ai/openai');
    (hasLLMKey as any).mockResolvedValueOnce(false);

    const result = await generarHistoria({
      studentId: '00000000-0000-4000-8000-000000000020',
      topicSlug: 'animales',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_API_KEY');
  });

  it('debería respetar límite de 20 historias por día', async () => {
    mockWhereSelect.mockResolvedValueOnce([{ count: 21 }]);

    const result = await generarHistoria({
      studentId: '00000000-0000-4000-8000-000000000020',
      topicSlug: 'animales',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('RATE_LIMIT');
  });

  it('debería usar historia cached si existe y es válida', async () => {
    // Mock count query
    mockWhereSelect.mockResolvedValueOnce([{ count: 5 }]);
    // Mock skillProgress
    mockFindMany.mockResolvedValueOnce([]);
    // Mock recent stories
    mockFindMany.mockResolvedValueOnce([]);
    // Mock cache candidates
    mockFindMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000000040',
        titulo: 'Cached Story',
        contenido: 'Cached content',
        nivel: 2.0,
        reutilizable: true,
        aprobadaQA: true,
        questions: [{ id: 'q1', orden: 0, tipo: 'literal', pregunta: 'Test?', opciones: ['A', 'B', 'C', 'D'], respuestaCorrecta: 0, explicacion: 'Exp' }],
        metadata: { generationFlags: { funMode: false, tonoHistoria: 3 } },
      },
    ]);
    // Queue session insert returning
    returningQueue.push([{ id: '00000000-0000-4000-8000-000000000030' }]);

    const result = await generarHistoria({
      studentId: '00000000-0000-4000-8000-000000000020',
      topicSlug: 'animales',
    });

    expect(result.ok).toBe(true);
    expect(result.fromCache).toBe(true);
  });

  it('debería remapear slugs legacy al generar desde ruta de aprendizaje', async () => {
    // Mock count query
    mockWhereSelect.mockResolvedValueOnce([{ count: 5 }]);
    // Mock skillProgress
    mockFindMany.mockResolvedValueOnce([]);
    // Mock recent stories
    mockFindMany.mockResolvedValueOnce([]);
    // Mock cache candidates
    mockFindMany.mockResolvedValueOnce([
      {
        id: '00000000-0000-4000-8000-000000000041',
        titulo: 'Solar Story',
        contenido: 'Cached solar content',
        nivel: 2.0,
        reutilizable: true,
        aprobadaQA: true,
        questions: [{ id: 'q1', orden: 0, tipo: 'literal', pregunta: 'Test?', opciones: ['A', 'B', 'C', 'D'], respuestaCorrecta: 0, explicacion: 'Exp' }],
        metadata: { generationFlags: { funMode: false, tonoHistoria: 3 } },
      },
    ]);
    // Queue session insert returning
    returningQueue.push([{ id: '00000000-0000-4000-8000-000000000031' }]);

    const result = await generarHistoria({
      studentId: '00000000-0000-4000-8000-000000000020',
      topicSlug: 'espacio',
    });

    expect(result.ok).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.historia.topicSlug).toBe('sistema-solar');
  });

  // ────────────────────────────────────────────────────
  // GENERAR PREGUNTAS SESION
  // ────────────────────────────────────────────────────

  it('debería generar preguntas para sesión sin preguntas', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      storyId: '00000000-0000-4000-8000-000000000040',
      metadata: {},
    });

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000040',
      titulo: 'Test Story',
      contenido: 'Test content',
      nivel: 2.0,
      questions: [],
    });

    // Student data is now obtained via getStudentContext -> requireStudentOwnership (mocked globally).
    // No additional db.query.students.findFirst call needed.

    // Mock for checking existing questions
    mockFindMany.mockResolvedValueOnce([]);

    // Queue insert().values().returning() for storyQuestions
    returningQueue.push([
      {
        id: '00000000-0000-4000-8000-000000000060',
        tipo: 'literal',
        pregunta: 'Test question',
        opciones: ['A', 'B', 'C', 'D'],
        respuestaCorrecta: 0,
        explicacion: 'Explanation',
        orden: 0,
      }
    ]);

    const result = await generarPreguntasSesion({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
    });

    expect(result.ok).toBe(true);
    expect(result.preguntas).toBeDefined();
  });

  it('debería retornar preguntas cached si existen', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      storyId: '00000000-0000-4000-8000-000000000040',
      metadata: {},
    });

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000040',
      questions: [
        {
          id: 'q1',
          tipo: 'literal',
          pregunta: 'Pregunta',
          opciones: ['A', 'B'],
          respuestaCorrecta: 0,
          explicacion: 'Exp',
          orden: 0,
        },
      ],
    });

    const result = await generarPreguntasSesion({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
    });

    expect(result.ok).toBe(true);
    expect(result.preguntas).toHaveLength(1);
  });

  it('debería fallar si sesión no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await generarPreguntasSesion({
      sessionId: '00000000-0000-4000-8000-000000000099',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('GENERATION_FAILED');
  });

  // ────────────────────────────────────────────────────
  // REGISTRAR LECTURA COMPLETADA
  // ────────────────────────────────────────────────────

  it('debería registrar lectura completada', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      metadata: {},
    });

    const result = await registrarLecturaCompletada({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      wpmPromedio: 95,
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyMarked).toBe(false);
    expect(result.lecturaCompletadaEn).toBeDefined();
  });

  it('debería usar wpm de audio si es confiable', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      metadata: {},
    });

    const audioAnalisis = {
      confiable: true,
      wpmUtil: 92,
      qualityScore: 0.8,
      precisionLectura: 0.85,
      coberturaTexto: 0.9,
      pauseRatio: 0.2,
      tiempoVozActivaMs: 180000,
      totalPalabrasTranscritas: 250,
      totalPalabrasAlineadas: 220,
      motor: 'openai',
    };

    const result = await registrarLecturaCompletada({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      audioAnalisis,
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyMarked).toBe(false);
    expect(result.lecturaCompletadaEn).toBeDefined();
  });

  // ────────────────────────────────────────────────────
  // FINALIZAR SESION LECTURA
  // ────────────────────────────────────────────────────

  it('debería finalizar sesión con respuestas correctas', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      completada: false,
      metadata: { nivelTexto: 2.0, tiempoEsperadoMs: 180000 },
      storyId: '00000000-0000-4000-8000-000000000040',
    });

    mockFindMany.mockResolvedValueOnce([]); // story questions
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000020',
      eloGlobal: 1000,
      eloLiteral: 1000,
      eloInferencia: 1000,
      eloVocabulario: 1000,
      eloResumen: 1000,
      eloRd: 350,
    });

    const result = await finalizarSesionLectura({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      respuestas: [
        {
          preguntaId: 'q1',
          tipo: 'literal',
          respuestaSeleccionada: 0,
          correcta: true,
          tiempoMs: 5000,
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it('debería calcular estrellas según aciertos (3 estrellas = 100%)', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      completada: false,
      metadata: { nivelTexto: 2.0, tiempoEsperadoMs: 180000 },
      storyId: null, // No story -> Elo block is skipped entirely
    });

    const result = await finalizarSesionLectura({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 0, correcta: true, tiempoMs: 5000 },
        { preguntaId: 'q2', tipo: 'literal', respuestaSeleccionada: 1, correcta: true, tiempoMs: 4000 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.resultado?.estrellas).toBe(3);
  });

  it('debería reutilizar respuestas persistidas para evitar duplicados en reintentos', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      completada: false,
      metadata: { nivelTexto: 2.0, tiempoEsperadoMs: 180000 },
      storyId: null, // No story -> Elo block is skipped entirely
    });

    mockResponsesFindMany.mockResolvedValueOnce([
      {
        pregunta: 'q1',
        tipoEjercicio: 'literal',
        respuesta: '0',
        correcta: true,
        tiempoRespuestaMs: 5000,
      },
    ]);

    const result = await finalizarSesionLectura({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 0, correcta: true, tiempoMs: 5000 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.resultado?.estrellas).toBe(3);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockActualizarProgresoInmediato).not.toHaveBeenCalled();
  });

  it('debería fallar si sesión ya está completada', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      completada: true,
      metadata: {},
    });

    const result = await finalizarSesionLectura({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 0, correcta: true, tiempoMs: 5000 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('ya fue finalizada');
  });

  it('debería devolver error si falla la persistencia final en transacción y fallback', async () => {
    // Both transaction and sequential fallback must fail for ok=false
    const failingUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => { throw new Error('update failed'); }) })) }));
    const dbModule = await vi.importMock<any>('@/server/db');
    dbModule.getDb.mockImplementationOnce(async () => ({
      ...createMockDbShape(),
      update: failingUpdate,
      transaction: vi.fn(async () => {
        throw new Error('tx failed');
      }),
    }));

    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      completada: false,
      metadata: { nivelTexto: 2.0, tiempoEsperadoMs: 180000 },
      storyId: null,
    });

    const result = await finalizarSesionLectura({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      tiempoLecturaMs: 300000,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 0, correcta: true, tiempoMs: 5000 },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('No se pudo finalizar la sesion');
  });

  // ────────────────────────────────────────────────────
  // REESCRIBIR HISTORIA
  // ────────────────────────────────────────────────────

  it('debería reescribir historia a nivel más fácil', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000040',
      topicSlug: 'animales',
      titulo: 'Original Story',
      contenido: 'Original content',
      nivel: 2.0,
    });

    mockFindFirst.mockResolvedValueOnce(null); // no previous adjustment

    // Queue story insert returning
    returningQueue.push([{ id: '00000000-0000-4000-8000-000000000041' }]);

    // Queue questions insert returning
    returningQueue.push([
      {
        id: '00000000-0000-4000-8000-000000000070',
        tipo: 'literal',
        pregunta: 'Test question',
        opciones: ['A', 'B'],
        respuestaCorrecta: 0,
        explicacion: 'Explanation',
        orden: 0,
      }
    ]);

    // Queue manual adjustments insert
    returningQueue.push([{ id: '00000000-0000-4000-8000-000000000080' }]);

    // Mock session findFirst for metadata
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000030',
      metadata: {},
    });

    const result = await reescribirHistoria({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
      direccion: 'mas_facil',
      tiempoLecturaAntesDePulsar: 60000,
    });

    expect(result.ok).toBe(true);
    expect(result.storyId).toBeDefined();
  });

  it('debería fallar si ya existe ajuste manual en la sesión', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000040',
      topicSlug: 'animales',
      nivel: 2.0,
    });

    mockFindFirst.mockResolvedValueOnce({
      id: 'manual-prev',
      tipo: 'mas_desafiante',
    }); // existing adjustment

    const result = await reescribirHistoria({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
      direccion: 'mas_facil',
      tiempoLecturaAntesDePulsar: 60000,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Ya se realizo un ajuste');
  });

  it('debería fallar si no hay API key', async () => {
    const { hasLLMKey } = await vi.importMock('@/lib/ai/openai');
    (hasLLMKey as any).mockResolvedValueOnce(false);

    const result = await reescribirHistoria({
      sessionId: '00000000-0000-4000-8000-000000000030',
      studentId: '00000000-0000-4000-8000-000000000020',
      storyId: '00000000-0000-4000-8000-000000000040',
      direccion: 'mas_desafiante',
      tiempoLecturaAntesDePulsar: 60000,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_API_KEY');
  });
});
