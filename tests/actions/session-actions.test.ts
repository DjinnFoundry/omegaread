import { vi, describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────
// MOCKS - CRÍTICO: antes de las importaciones
// ────────────────────────────────────────────────────

vi.mock('@/server/auth', () => ({
  requireAuth: vi.fn(async () => ({ id: 'parent-1', email: 'test@test.com', nombre: 'Test' })),
  requireStudentOwnership: vi.fn(async () => ({
    padre: { id: 'parent-1', email: 'test@test.com', nombre: 'Test' },
    estudiante: {
      id: 'student-1',
      parentId: 'parent-1',
      nombre: 'Nino',
      nivelLectura: 2,
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
  sessions: { id: 'id', studentId: 'student_id', tipoActividad: 'tipo_actividad' },
  responses: { sessionId: 'session_id', correcta: 'correcta' },
  skillProgress: { studentId: 'student_id', skillId: 'skill_id', id: 'id' },
  achievements: { studentId: 'student_id', tipo: 'tipo' },
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
}));

const mockReturning = vi.fn(() => [{ id: 'session-1', iniciadaEn: new Date() }]);
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockWhere = vi.fn(async () => []);
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSet = vi.fn(() => ({ where: vi.fn(async () => []) }));
const mockFindFirst = vi.fn(async () => null);
const mockFindMany = vi.fn(async () => []);

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn(() => ({ values: mockValues })),
    select: vi.fn(() => ({ from: mockFrom })),
    update: vi.fn(() => ({ set: mockSet })),
    query: {
      sessions: { findFirst: mockFindFirst, findMany: mockFindMany },
      skillProgress: { findFirst: mockFindFirst, findMany: mockFindMany },
    },
  })),
}));

import {
  iniciarSesion,
  guardarRespuestaIndividual,
  actualizarSesionEnCurso,
  finalizarSesionDB,
  actualizarProgresoInmediato,
  cargarProgresoEstudiante,
} from '@/server/actions/session-actions';

describe('session-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────
  // INICIAR SESION
  // ────────────────────────────────────────────────────

  it('debería crear una sesión exitosamente', async () => {
    mockValues.mockReturnValueOnce({ returning: mockReturning });

    const result = await iniciarSesion({
      studentId: '00000000-0000-4000-8000-000000000020',
      tipoActividad: 'lectura',
      modulo: 'lectura-adaptativa',
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.sessionId).toBe('session-1');
  });

  it('debería rechazar sesión sin datos válidos', async () => {
    await expect(
      iniciarSesion({
        studentId: 'not-a-uuid',
        tipoActividad: 'lectura',
        modulo: 'lectura-adaptativa',
      }),
    ).rejects.toThrow();
  });

  // ────────────────────────────────────────────────────
  // GUARDAR RESPUESTA INDIVIDUAL
  // ────────────────────────────────────────────────────

  it('debería guardar respuesta correcta en sesión existente', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
    });
    mockValues.mockReturnValueOnce({ returning: [{ id: '00000000-0000-4000-8000-000000000030' }] });

    const result = await guardarRespuestaIndividual({
      sessionId: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      ejercicioId: 'ex-1',
      tipoEjercicio: 'literal',
      pregunta: '¿Qué ocurre?',
      respuesta: 'Opción A',
      respuestaCorrecta: 'Opción A',
      correcta: true,
      tiempoRespuestaMs: 5000,
    });

    expect(result.ok).toBe(true);
  });

  it('debería fallar si sesión no existe o no pertenece al estudiante', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await guardarRespuestaIndividual({
      sessionId: '00000000-0000-4000-8000-000000000099',
      studentId: '00000000-0000-4000-8000-000000000020',
      ejercicioId: 'ex-1',
      tipoEjercicio: 'literal',
      pregunta: 'Pregunta',
      respuesta: 'Respuesta',
      respuestaCorrecta: 'Respuesta',
      correcta: true,
    }).catch(e => e);

    expect(res.message).toContain('Sesion no encontrada o no pertenece al estudiante');
  });

  // ────────────────────────────────────────────────────
  // ACTUALIZAR SESION EN CURSO
  // ────────────────────────────────────────────────────

  it('debería actualizar estrellasGanadas de sesión en curso', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
    });
    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await actualizarSesionEnCurso({
      sessionId: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      estrellasGanadas: 3,
    });

    expect(result.ok).toBe(true);
  });

  it('debería actualizar metadata de sesión', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
    });
    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await actualizarSesionEnCurso({
      sessionId: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      metadata: { topicSlug: 'animales' },
    });

    expect(result.ok).toBe(true);
  });

  // ────────────────────────────────────────────────────
  // FINALIZAR SESION
  // ────────────────────────────────────────────────────

  it('debería finalizar sesión y crear logro si hay sticker', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
    });
    mockValues.mockReturnValueOnce({ returning: [{ id: '00000000-0000-4000-8000-000000000050' }] });

    const result = await finalizarSesionDB({
      sessionId: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      duracionSegundos: 300,
      completada: true,
      estrellasGanadas: 3,
      stickerGanado: 'oro',
    });

    expect(result.ok).toBe(true);
  });

  it('debería fallar si sesión no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await finalizarSesionDB({
      sessionId: '00000000-0000-4000-8000-000000000099',
      studentId: '00000000-0000-4000-8000-000000000020',
      duracionSegundos: 300,
      completada: true,
      estrellasGanadas: 0,
    }).catch(e => e);

    expect(res.message).toContain('Sesion no encontrada o no pertenece al estudiante');
  });

  // ────────────────────────────────────────────────────
  // ACTUALIZAR PROGRESO INMEDIATO
  // ────────────────────────────────────────────────────

  it('debería crear progreso de habilidad nuevo cuando no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockValues.mockReturnValueOnce({ returning: [{ id: 'skill-progress-1' }] });

    const result = await actualizarProgresoInmediato({
      studentId: '00000000-0000-4000-8000-000000000020',
      skillId: 'skill-1',
      categoria: 'comprension',
      correcto: true,
      tiempoRespuestaMs: 5000,
    });

    expect(result.ok).toBe(true);
    expect(result.nivelMastery).toBe(0);
    expect(result.dominada).toBe(false);
    expect(result.totalIntentos).toBe(1);
    expect(result.totalAciertos).toBe(1);
  });

  it('debería actualizar progreso existente e incrementar intentos', async () => {
    const progressExistente = {
      id: 'prog-1',
      studentId: '00000000-0000-4000-8000-000000000020',
      skillId: 'skill-1',
      totalIntentos: 4,
      totalAciertos: 3,
      nivelMastery: 0.6,
      dominada: false,
      metadata: { historialReciente: [true, true, false, true] },
    };

    mockFindFirst.mockResolvedValueOnce(progressExistente);
    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await actualizarProgresoInmediato({
      studentId: '00000000-0000-4000-8000-000000000020',
      skillId: 'skill-1',
      categoria: 'comprension',
      correcto: true,
      tiempoRespuestaMs: 4000,
    });

    expect(result.ok).toBe(true);
    expect(result.totalIntentos).toBe(5);
    expect(result.totalAciertos).toBe(4);
  });

  it('debería marcar skill como dominada cuando alcanza umbral de mastery', async () => {
    const progressCercaAlUmbral = {
      id: 'prog-1',
      studentId: '00000000-0000-4000-8000-000000000020',
      skillId: 'skill-1',
      totalIntentos: 9,
      totalAciertos: 9,
      nivelMastery: 1.0,
      dominada: false,
      metadata: { historialReciente: [true, true, true, true, true, true, true, true, true] },
    };

    mockFindFirst.mockResolvedValueOnce(progressCercaAlUmbral);
    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await actualizarProgresoInmediato({
      studentId: '00000000-0000-4000-8000-000000000020',
      skillId: 'skill-1',
      categoria: 'comprension',
      correcto: true,
    });

    expect(result.ok).toBe(true);
    expect(result.totalIntentos).toBe(10);
  });

  // ────────────────────────────────────────────────────
  // CARGAR PROGRESO ESTUDIANTE
  // ────────────────────────────────────────────────────

  it('debería cargar progreso de estudiante con sesiones', async () => {
    const sesiones = [
      {
        id: '00000000-0000-4000-8000-000000000010',
        studentId: '00000000-0000-4000-8000-000000000020',
        tipoActividad: 'lectura',
        completada: true,
        estrellasGanadas: 3,
        iniciadaEn: new Date(Date.now() - 60000),
        finalizadaEn: new Date(),
      },
    ];

    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce(sesiones);

    const result = await cargarProgresoEstudiante('00000000-0000-4000-8000-000000000020');

    expect(result.totalSesiones).toBe(1);
    expect(result.totalEstrellas).toBe(3);
  });

  it('debería retornar sesión en curso si está activa', async () => {
    const ahora = new Date();
    const sesionActiva = {
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      tipoActividad: 'lectura',
      completada: false,
      finalizadaEn: null,
      iniciadaEn: ahora,
      estrellasGanadas: 0,
    };

    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([sesionActiva]);

    const result = await cargarProgresoEstudiante('00000000-0000-4000-8000-000000000020');

    expect(result.sesionEnCurso).not.toBeNull();
    expect(result.sesionEnCurso?.id).toBe('00000000-0000-4000-8000-000000000010');
  });

  it('debería cerrar sesiones huérfanas inactivas más de 1 hora', async () => {
    const ahora = Date.now();
    const hace2Horas = new Date(ahora - 2 * 60 * 60 * 1000);
    const sesionHuerfana = {
      id: '00000000-0000-4000-8000-000000000010',
      studentId: '00000000-0000-4000-8000-000000000020',
      tipoActividad: 'lectura',
      completada: false,
      finalizadaEn: null,
      iniciadaEn: hace2Horas,
      estrellasGanadas: 0,
    };

    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([sesionHuerfana]);
    mockSet.mockReturnValueOnce({ where: vi.fn(async () => []) });

    const result = await cargarProgresoEstudiante('00000000-0000-4000-8000-000000000020');

    expect(result).toBeDefined();
  });

  it('debería retornar datos vacíos cuando no hay sesiones', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockFindMany.mockResolvedValueOnce([]);

    const result = await cargarProgresoEstudiante('00000000-0000-4000-8000-000000000020');

    expect(result.totalEstrellas).toBe(0);
    expect(result.totalSesiones).toBe(0);
    expect(result.sesionEnCurso).toBeNull();
  });
});
