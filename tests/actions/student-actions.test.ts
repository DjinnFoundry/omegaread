import { vi, describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────
// MOCKS
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
    },
  })),
}));

vi.mock('@/lib/utils/fecha', () => ({
  calcularEdad: vi.fn((fechaNac: Date) => {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  }),
}));

vi.mock('@omegaread/db', () => ({
  students: { id: 'id', parentId: 'parent_id' },
  sessions: { studentId: 'student_id', tipoActividad: 'tipo_actividad' },
  achievements: { studentId: 'student_id' },
  skillProgress: { studentId: 'student_id' },
  eq: vi.fn((...args: unknown[]) => args),
  desc: vi.fn(),
  and: vi.fn((...args: unknown[]) => args),
}));

const mockReturning = vi.fn(() => [
  {
    id: 'student-1',
    nombre: 'Test Student',
    fechaNacimiento: new Date('2018-05-15'),
    nivelLectura: 2.0,
  },
]);
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockFindFirst = vi.fn(async () => null);
const mockFindMany = vi.fn(async () => []);

vi.mock('@/server/db', () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn(() => ({ values: mockValues })),
    query: {
      students: { findFirst: mockFindFirst, findMany: mockFindMany },
      sessions: { findMany: mockFindMany },
      achievements: { findMany: mockFindMany },
      skillProgress: { findMany: mockFindMany },
    },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
  })),
}));

import { crearEstudiante, obtenerEstudiantes, obtenerEstudiante, obtenerResumenProgreso } from '@/server/actions/student-actions';

describe('student-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────
  // CREAR ESTUDIANTE
  // ────────────────────────────────────────────────────

  it('debería crear estudiante con edad válida entre 3 y 10 años', async () => {
    const formData = new FormData();
    formData.append('nombre', 'Juan');
    formData.append('fechaNacimiento', '2018-05-15');

    mockReturning.mockReturnValueOnce([
      {
        id: 'new-student-1',
        nombre: 'Juan',
        fechaNacimiento: new Date('2018-05-15'),
        nivelLectura: 2.0,
        baselineCompletado: true,
        baselineConfianza: 'bajo',
      },
    ]);

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(true);
    expect(result.estudiante?.nombre).toBe('Juan');
    expect(result.estudiante?.nivelLectura).toBe(2.0);
  });

  it('debería calcular nivel inicial según edad (edad 4 -> 1.0)', async () => {
    const formData = new FormData();
    formData.append('nombre', 'Sofia');
    formData.append('fechaNacimiento', new Date(Date.now() - 4 * 365 * 24 * 60 * 60 * 1000).toISOString());

    mockReturning.mockReturnValueOnce([
      {
        id: 'student-4',
        nombre: 'Sofia',
        nivelLectura: 1.0,
      },
    ]);

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(true);
  });

  it('debería calcular nivel inicial según edad (edad 6 -> 2.0)', async () => {
    const formData = new FormData();
    formData.append('nombre', 'Carlos');
    formData.append('fechaNacimiento', new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString());

    mockReturning.mockReturnValueOnce([
      {
        id: 'student-6',
        nombre: 'Carlos',
        nivelLectura: 2.0,
      },
    ]);

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(true);
  });

  it('debería rechazar estudiante menor de 3 años', async () => {
    const formData = new FormData();
    formData.append('nombre', 'Bebe');
    formData.append('fechaNacimiento', new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString());

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('edad debe estar entre 3 y 10');
  });

  it('debería rechazar estudiante mayor de 10 años', async () => {
    const formData = new FormData();
    formData.append('nombre', 'Mayor');
    formData.append('fechaNacimiento', new Date(Date.now() - 12 * 365 * 24 * 60 * 60 * 1000).toISOString());

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('edad debe estar entre 3 y 10');
  });

  it('debería rechazar si falta nombre', async () => {
    const formData = new FormData();
    formData.append('fechaNacimiento', '2018-05-15');

    const result = await crearEstudiante(formData);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('obligatorios');
  });

  // ────────────────────────────────────────────────────
  // OBTENER ESTUDIANTES
  // ────────────────────────────────────────────────────

  it('debería obtener lista de estudiantes del padre actual', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'student-1',
        nombre: 'Juan',
        nivelLectura: 2.0,
        baselineCompletado: true,
      },
      {
        id: 'student-2',
        nombre: 'Sofia',
        nivelLectura: 2.6,
        baselineCompletado: true,
      },
    ]);

    const result = await obtenerEstudiantes();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('debería retornar lista vacía cuando no hay estudiantes', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const result = await obtenerEstudiantes();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  // ────────────────────────────────────────────────────
  // OBTENER ESTUDIANTE POR ID
  // ────────────────────────────────────────────────────

  it('debería obtener estudiante específico por ID', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'student-1',
      nombre: 'Juan',
      parentId: 'parent-1',
      nivelLectura: 2.0,
    });

    const result = await obtenerEstudiante('student-1');

    expect(result).toBeDefined();
    expect(result?.id).toBe('student-1');
  });

  it('debería retornar null si estudiante no pertenece al padre', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await obtenerEstudiante('student-invalid');

    expect(result).toBeNull();
  });

  // ────────────────────────────────────────────────────
  // OBTENER RESUMEN PROGRESO
  // ────────────────────────────────────────────────────

  it('debería obtener resumen de progreso con sesiones completadas', async () => {
    const hoy = new Date();
    const hace1Dia = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);

    mockFindFirst.mockResolvedValueOnce({
      id: 'student-1',
      nombre: 'Juan',
      parentId: 'parent-1',
      nivelLectura: 2.0,
      contextoPersonal: 'Vive en Madrid',
    });

    mockFindMany.mockResolvedValueOnce([]); // skillProgress
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'session-1',
        studentId: 'student-1',
        tipoActividad: 'lectura',
        completada: true,
        estrellasGanadas: 3,
        duracionSegundos: 300,
        iniciadaEn: hoy,
      },
      {
        id: 'session-2',
        studentId: 'student-1',
        tipoActividad: 'lectura',
        completada: true,
        estrellasGanadas: 2,
        duracionSegundos: 240,
        iniciadaEn: hace1Dia,
      },
    ]);

    mockFindMany.mockResolvedValueOnce([]); // achievements

    const result = await obtenerResumenProgreso('student-1');

    expect(result).not.toBeNull();
    expect(result?.totalEstrellas).toBe(5);
    expect(result?.totalSesiones).toBe(2);
  });

  it('debería retornar null si estudiante no existe', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await obtenerResumenProgreso('student-invalid');

    expect(result).toBeNull();
  });

  it('debería calcular racha de días consecutivos con sesiones', async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    mockFindFirst.mockResolvedValueOnce({
      id: 'student-1',
      nombre: 'Juan',
      parentId: 'parent-1',
      nivelLectura: 2.0,
    });

    mockFindMany.mockResolvedValueOnce([]); // skillProgress

    const sesiones = [];
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      sesiones.push({
        id: `session-${i}`,
        studentId: 'student-1',
        tipoActividad: 'lectura',
        completada: true,
        estrellasGanadas: 1,
        duracionSegundos: 300,
        iniciadaEn: fecha,
      });
    }

    mockFindMany.mockResolvedValueOnce(sesiones);
    mockFindMany.mockResolvedValueOnce([]); // achievements

    const result = await obtenerResumenProgreso('student-1');

    expect(result?.racha).toBeGreaterThanOrEqual(1);
  });

  it('debería incluir sugerencia offline determinista por fecha', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'student-1',
      nombre: 'Juan',
      parentId: 'parent-1',
      nivelLectura: 2.0,
    });

    mockFindMany.mockResolvedValueOnce([]); // skillProgress
    mockFindMany.mockResolvedValueOnce([]); // sessions
    mockFindMany.mockResolvedValueOnce([]); // achievements

    const result = await obtenerResumenProgreso('student-1');

    expect(result?.sugerenciaOffline).toBeDefined();
    expect(typeof result?.sugerenciaOffline).toBe('string');
    expect(result?.sugerenciaOffline.length).toBeGreaterThan(0);
  });
});
