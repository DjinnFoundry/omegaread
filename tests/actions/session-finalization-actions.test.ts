/**
 * Tests for session finalization actions.
 * Covers: finalizarSesionLectura, transaction fallback, retry-safe path,
 * already-finalized detection, ELO calculation, and edge cases.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UUID_STUDENT, UUID_PARENT, UUID_SESSION, UUID_STORY } from '../_helpers/fixtures';

// ────────────────────────────────────────────────────
// MOCKS - before imports
// ────────────────────────────────────────────────────

vi.mock('@/server/auth', () => ({
  requireStudentOwnership: vi.fn(async () => ({
    padre: { id: UUID_PARENT },
    estudiante: {
      id: UUID_STUDENT,
      parentId: UUID_PARENT,
      nombre: 'Nino',
      nivelLectura: 2.0,
      eloGlobal: 1000,
      eloLiteral: 1000,
      eloInferencia: 1000,
      eloVocabulario: 1000,
      eloResumen: 1000,
      eloRd: 350,
    },
  })),
}));

vi.mock('@zetaread/db', () => ({
  sessions: { id: 'id', studentId: 'student_id', completada: 'completada', finalizadaEn: 'finalizada_en', storyId: 'story_id' },
  responses: { sessionId: 'session_id' },
  students: { id: 'id' },
  storyQuestions: { storyId: 'story_id' },
  eloSnapshots: { studentId: 'student_id' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
}));

vi.mock('@/lib/ai/prompts', () => ({
  getNivelConfig: vi.fn(() => ({
    nivel: 2,
    wpmEsperado: 105,
    tiempoEsperadoMs: 240000,
  })),
}));

vi.mock('@/lib/audio/utils', () => ({
  serializarAudioAnalisis: vi.fn(() => null),
}));

vi.mock('@/lib/types/session-metadata', () => ({
  parseSessionMetadata: vi.fn(() => ({
    topicSlug: 'sistema-solar',
    nivelTexto: 2,
    tiempoEsperadoMs: 240000,
  })),
  mergeSessionMetadata: vi.fn((_old: unknown, newMeta: unknown) => newMeta),
}));

vi.mock('@/lib/wpm', () => ({
  sanitizeFromStoredData: vi.fn(() => []),
  computeSessionWpm: vi.fn(() => ({ wpmRobusto: 80, confianza: 'medium' })),
}));

vi.mock('@/lib/elo', () => ({
  procesarRespuestasElo: vi.fn(() => ({
    nuevoElo: {
      global: 1020,
      literal: 1010,
      inferencia: 1015,
      vocabulario: 1005,
      resumen: 1010,
      rd: 340,
    },
    detalles: [],
  })),
  inflarRdPorInactividad: vi.fn((elo: unknown) => elo),
}));

const mockAjusteDificultad = vi.fn(async () => ({
  sessionScore: 0.85,
  direccion: 'mantener' as const,
  nivelAnterior: 2.0,
  nivelNuevo: 2.0,
  razon: 'Buen desempeno, se mantiene nivel.',
}));

vi.mock('@/server/actions/reading-actions', () => ({
  calcularAjusteDificultad: (...args: unknown[]) => mockAjusteDificultad(...args),
}));

const mockActualizarProgreso = vi.fn(async () => ({ ok: true }));
vi.mock('@/server/actions/session-actions', () => ({
  actualizarProgresoInmediato: (...args: unknown[]) => mockActualizarProgreso(...args),
}));

// ── DB Mock ──
type TxCallback = (tx: unknown) => unknown | Promise<unknown>;

const mockFindFirstSession = vi.fn(async () => null);
const mockFindManyResponses = vi.fn(async () => []);
const mockFindManyQuestions = vi.fn(async () => []);
const mockFindFirstStudent = vi.fn(async () => null);
const mockFindFirstLastSession = vi.fn(async () => null);
const mockSet = vi.fn(() => ({ where: vi.fn(async () => []) }));
const mockValues = vi.fn(async () => []);
const mockTransaction = vi.fn(async (fn: TxCallback) => {
  const txDb = buildMockExecutor();
  return fn(txDb);
});

function buildMockExecutor() {
  return {
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
    query: {
      sessions: { findFirst: mockFindFirstSession },
      responses: { findMany: mockFindManyResponses },
      storyQuestions: { findMany: mockFindManyQuestions },
      students: { findFirst: mockFindFirstStudent },
    },
  };
}

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
    query: {
      sessions: { findFirst: mockFindFirstSession },
      responses: { findMany: mockFindManyResponses },
      storyQuestions: { findMany: mockFindManyQuestions },
      students: { findFirst: mockFindFirstStudent },
    },
    transaction: mockTransaction,
  })),
}));

import { finalizarSesionLectura, registrarLecturaCompletada } from '@/server/actions/session-finalization-actions';

// ────────────────────────────────────────────────────
// Test data
// ────────────────────────────────────────────────────

const VALID_PAYLOAD = {
  sessionId: UUID_SESSION,
  studentId: UUID_STUDENT,
  tiempoLecturaMs: 120000,
  respuestas: [
    { preguntaId: 'q-1', tipo: 'literal' as const, respuestaSeleccionada: 1, correcta: true, tiempoMs: 5000 },
    { preguntaId: 'q-2', tipo: 'inferencia' as const, respuestaSeleccionada: 0, correcta: true, tiempoMs: 8000 },
    { preguntaId: 'q-3', tipo: 'vocabulario' as const, respuestaSeleccionada: 2, correcta: false, tiempoMs: 4000 },
    { preguntaId: 'q-4', tipo: 'resumen' as const, respuestaSeleccionada: 0, correcta: true, tiempoMs: 6000 },
  ],
};

const MOCK_SESSION = {
  id: UUID_SESSION,
  studentId: UUID_STUDENT,
  completada: false,
  storyId: UUID_STORY,
  metadata: {},
  wpmPromedio: null,
  wpmPorPagina: null,
  totalPaginas: null,
};

const MOCK_STUDENT_ELO = {
  eloGlobal: 1000,
  eloLiteral: 1000,
  eloInferencia: 1000,
  eloVocabulario: 1000,
  eloResumen: 1000,
  eloRd: 350,
};

const MOCK_QUESTIONS = [
  { id: 'q-1', dificultad: 3 },
  { id: 'q-2', dificultad: 3 },
  { id: 'q-3', dificultad: 4 },
  { id: 'q-4', dificultad: 2 },
];

// ────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────

describe('finalizarSesionLectura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    mockFindFirstSession.mockResolvedValue(MOCK_SESSION);
    mockFindManyResponses.mockResolvedValue([]);
    mockFindManyQuestions.mockResolvedValue(MOCK_QUESTIONS);
    mockFindFirstStudent.mockResolvedValue(MOCK_STUDENT_ELO);
    mockFindFirstLastSession.mockResolvedValue(null);
  });

  // ─── Happy path ───

  it('returns ok:true with resultado on success', async () => {
    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.aciertos).toBe(3);
      expect(result.resultado.totalPreguntas).toBe(4);
      expect(result.resultado.comprensionScore).toBe(75);
      expect(result.resultado.estrellas).toBe(2);
      expect(result.resultado.direccion).toBe('mantener');
      expect(typeof result.resultado.nivelAnterior).toBe('number');
      expect(typeof result.resultado.nivelNuevo).toBe('number');
    }
  });

  it('returns eloGlobal and eloPrevio in resultado', async () => {
    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.eloGlobal).toBe(1020);
      expect(result.resultado.eloPrevio).toBe(1000);
    }
  });

  // ─── Session validation ───

  it('returns error when session not found', async () => {
    mockFindFirstSession.mockResolvedValue(null);

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Sesion no encontrada');
    }
  });

  it('returns error when session already finalized', async () => {
    mockFindFirstSession.mockResolvedValue({ ...MOCK_SESSION, completada: true });

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('La sesion ya fue finalizada');
    }
  });

  // ─── Stars calculation ───

  it('awards 3 stars for 100% correct answers', async () => {
    const allCorrect = {
      ...VALID_PAYLOAD,
      respuestas: VALID_PAYLOAD.respuestas.map(r => ({ ...r, correcta: true })),
    };

    const result = await finalizarSesionLectura(allCorrect);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.estrellas).toBe(3);
      expect(result.resultado.comprensionScore).toBe(100);
    }
  });

  it('awards 2 stars for 75% correct answers', async () => {
    // 3/4 = 75%
    const result = await finalizarSesionLectura(VALID_PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.estrellas).toBe(2);
    }
  });

  it('awards 1 star for 50% correct answers', async () => {
    const halfCorrect = {
      ...VALID_PAYLOAD,
      respuestas: VALID_PAYLOAD.respuestas.map((r, i) => ({
        ...r,
        correcta: i < 2,
      })),
    };

    const result = await finalizarSesionLectura(halfCorrect);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.estrellas).toBe(1);
    }
  });

  it('awards 0 stars for 0% correct answers', async () => {
    const noneCorrect = {
      ...VALID_PAYLOAD,
      respuestas: VALID_PAYLOAD.respuestas.map(r => ({ ...r, correcta: false })),
    };

    const result = await finalizarSesionLectura(noneCorrect);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.estrellas).toBe(0);
    }
  });

  // ─── Retry-safe path (persisted responses) ───

  it('reuses persisted responses on retry instead of inserting duplicates', async () => {
    const persistedResponses = [
      { pregunta: 'q-1', tipoEjercicio: 'literal', respuesta: '1', correcta: true, tiempoRespuestaMs: 5000 },
      { pregunta: 'q-2', tipoEjercicio: 'inferencia', respuesta: '0', correcta: true, tiempoRespuestaMs: 8000 },
      { pregunta: 'q-3', tipoEjercicio: 'vocabulario', respuesta: '2', correcta: false, tiempoRespuestaMs: 4000 },
      { pregunta: 'q-4', tipoEjercicio: 'resumen', respuesta: '0', correcta: true, tiempoRespuestaMs: 6000 },
    ];
    mockFindManyResponses.mockResolvedValue(persistedResponses);

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(true);
    // Should NOT call actualizarProgresoInmediato when responses already persisted
    expect(mockActualizarProgreso).not.toHaveBeenCalled();
  });

  // ─── Transaction fallback ───

  it('falls back to sequential writes when transaction fails', async () => {
    mockTransaction.mockRejectedValueOnce(new Error('D1 TRANSACTION_ERROR'));

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    // Should still succeed via fallback
    expect(result.ok).toBe(true);
  });

  it('returns error when both transaction and sequential fallback fail', async () => {
    mockTransaction.mockRejectedValueOnce(new Error('D1 TRANSACTION_ERROR'));
    // Make the fallback write also fail by having the session lookup return null
    // on the second call (the fallback call)
    mockSet.mockImplementationOnce(() => {
      throw new Error('Sequential write failed');
    });

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('No se pudo finalizar');
    }
  });

  // ─── ELO handling ───

  it('handles missing student ELO data gracefully', async () => {
    mockFindFirstStudent.mockResolvedValue(null);

    const result = await finalizarSesionLectura(VALID_PAYLOAD);
    // Should complete successfully even without ELO data
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.eloGlobal).toBeNull();
    }
  });

  it('handles missing storyId gracefully', async () => {
    mockFindFirstSession.mockResolvedValue({ ...MOCK_SESSION, storyId: null });

    const result = await finalizarSesionLectura(VALID_PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.eloGlobal).toBeNull();
    }
  });

  // ─── Difficulty adjustment fallback ───

  it('uses fallback when calcularAjusteDificultad throws', async () => {
    mockAjusteDificultad.mockRejectedValueOnce(new Error('Transaction not supported'));

    const result = await finalizarSesionLectura(VALID_PAYLOAD);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resultado.direccion).toBe('mantener');
      expect(result.resultado.razon).toContain('no disponible');
    }
  });

  // ─── Skill progress updates ───

  it('calls actualizarProgresoInmediato for each question type', async () => {
    await finalizarSesionLectura(VALID_PAYLOAD);

    // 4 comprension updates + 1 topic update
    expect(mockActualizarProgreso).toHaveBeenCalledTimes(5);
    expect(mockActualizarProgreso).toHaveBeenCalledWith(
      expect.objectContaining({ skillId: 'comprension-literal' }),
    );
    expect(mockActualizarProgreso).toHaveBeenCalledWith(
      expect.objectContaining({ skillId: 'topic-sistema-solar' }),
    );
  });
});

// ────────────────────────────────────────────────────
// registrarLecturaCompletada
// ────────────────────────────────────────────────────

describe('registrarLecturaCompletada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstSession.mockResolvedValue(MOCK_SESSION);
  });

  it('returns ok:true on success', async () => {
    const result = await registrarLecturaCompletada({
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      tiempoLecturaMs: 120000,
    });

    expect(result.ok).toBe(true);
  });

  it('returns error when session not found', async () => {
    mockFindFirstSession.mockResolvedValue(null);

    const result = await registrarLecturaCompletada({
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      tiempoLecturaMs: 120000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Sesion no encontrada');
    }
  });

  it('marks alreadyMarked:true if lectura was already completed', async () => {
    const { parseSessionMetadata } = await import('@/lib/types/session-metadata');
    (parseSessionMetadata as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      lecturaCompletada: true,
      lecturaCompletadaEn: '2026-01-15T10:05:00Z',
      nivelTexto: 2,
    });

    const result = await registrarLecturaCompletada({
      sessionId: UUID_SESSION,
      studentId: UUID_STUDENT,
      tiempoLecturaMs: 120000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyMarked).toBe(true);
    }
  });
});
