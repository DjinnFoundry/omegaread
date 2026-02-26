import { vi, describe, it, expect, beforeEach } from 'vitest';

// ─── Mocks ───

const mockRequireStudentOwnership = vi.fn();
vi.mock('@/server/auth', () => ({
  requireStudentOwnership: (...args: unknown[]) => mockRequireStudentOwnership(...args),
}));

vi.mock('@/lib/utils/fecha', () => ({
  calcularEdad: vi.fn((fecha: Date | string) => {
    // Deterministic age calculation for test
    const nacimiento = new Date(fecha);
    const hoy = new Date('2026-02-26');
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }),
}));

import { getStudentContext } from '@/server/student-context';

describe('getStudentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return padre, estudiante, edadAnos, and nivel', async () => {
    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: {
        id: 'student-1',
        nombre: 'Nino',
        fechaNacimiento: new Date('2018-05-15'),
        nivelLectura: 2.5,
        intereses: ['naturaleza-vida'],
      },
    });

    const ctx = await getStudentContext('student-1');

    expect(ctx.padre.id).toBe('parent-1');
    expect(ctx.estudiante.id).toBe('student-1');
    expect(ctx.edadAnos).toBe(7); // Born 2018-05-15, today is 2026-02-26
    expect(ctx.nivel).toBe(2.5);
    expect(mockRequireStudentOwnership).toHaveBeenCalledWith('student-1');
  });

  it('should default nivel to 1 when nivelLectura is null', async () => {
    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: {
        id: 'student-2',
        nombre: 'Nino Nuevo',
        fechaNacimiento: new Date('2020-01-01'),
        nivelLectura: null,
        intereses: [],
      },
    });

    const ctx = await getStudentContext('student-2');

    expect(ctx.nivel).toBe(1);
    expect(ctx.edadAnos).toBe(6); // Born 2020-01-01, today is 2026-02-26
  });

  it('should default nivel to 1 when nivelLectura is undefined', async () => {
    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: {
        id: 'student-3',
        nombre: 'Nino Sin Nivel',
        fechaNacimiento: new Date('2019-06-15'),
        // nivelLectura not present at all
        intereses: [],
      },
    });

    const ctx = await getStudentContext('student-3');

    expect(ctx.nivel).toBe(1);
  });

  it('should keep nivel 0 when nivelLectura is explicitly 0', async () => {
    // nivelLectura ?? 1 means 0 stays as 0 (it is not null/undefined, just falsy)
    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: {
        id: 'student-zero',
        nombre: 'Nino Sin Nivel Aun',
        fechaNacimiento: new Date('2019-03-01'),
        nivelLectura: 0,
        intereses: [],
      },
    });

    const ctx = await getStudentContext('student-zero');

    // 0 is a valid value; ?? 1 should NOT replace it
    expect(ctx.nivel).toBe(0);
  });

  it('should propagate auth errors from requireStudentOwnership', async () => {
    mockRequireStudentOwnership.mockRejectedValue(
      new Error('Acceso no autorizado: el estudiante no pertenece a este padre'),
    );

    await expect(getStudentContext('bad-student')).rejects.toThrow(
      'Acceso no autorizado',
    );
  });

  it('should compute correct age for a child born recently', async () => {
    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: {
        id: 'student-4',
        nombre: 'Bebe',
        fechaNacimiento: new Date('2023-06-01'),
        nivelLectura: 1,
        intereses: [],
      },
    });

    const ctx = await getStudentContext('student-4');

    expect(ctx.edadAnos).toBe(2); // Born 2023-06-01, today is 2026-02-26 = 2 years old
  });

  it('should preserve all estudiante fields', async () => {
    const estudianteCompleto = {
      id: 'student-5',
      nombre: 'Nino Completo',
      fechaNacimiento: new Date('2017-12-25'),
      nivelLectura: 3.2,
      intereses: ['universo', 'cuerpo-mente'],
      eloGlobal: 1200,
      eloLiteral: 1100,
      eloInferencia: 1150,
      eloVocabulario: 1050,
      eloResumen: 1000,
      eloRd: 300,
      personajesFavoritos: 'Spiderman',
      contextoPersonal: 'Le gustan los dinosaurios',
    };

    mockRequireStudentOwnership.mockResolvedValue({
      padre: { id: 'parent-1', nombre: 'Papa', email: 'papa@test.com' },
      estudiante: estudianteCompleto,
    });

    const ctx = await getStudentContext('student-5');

    expect(ctx.estudiante).toEqual(estudianteCompleto);
    expect(ctx.edadAnos).toBe(8); // Born 2017-12-25, today 2026-02-26
    expect(ctx.nivel).toBe(3.2);
  });
});
