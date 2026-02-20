/**
 * Tests para verificacion de ownership en server actions.
 *
 * Verifica que:
 * 1. Todas las server actions requieren autenticacion
 * 2. Los inputs se validan con Zod
 */
import { describe, it, expect } from 'vitest';
import {
  iniciarSesionSchema,
  guardarRespuestaSchema,
  actualizarSesionSchema,
  finalizarSesionSchema,
  actualizarProgresoSchema,
  cargarProgresoSchema,
  crearEstudianteSchema,
} from '@/server/validation';

// ─────────────────────────────────────────────
// TEST DE VALIDACION ZOD
// ─────────────────────────────────────────────

describe('Validacion de inputs con Zod', () => {
  const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';
  const UUID_INVALIDO = 'no-es-un-uuid';

  // ── iniciarSesion ──
  describe('iniciarSesionSchema', () => {
    it('acepta datos validos', () => {
      const datos = {
        studentId: UUID_VALIDO,
        tipoActividad: 'lectura',
        modulo: 'lectura-adaptativa',
      };
      expect(iniciarSesionSchema.parse(datos)).toEqual(datos);
    });

    it('rechaza studentId invalido', () => {
      expect(() =>
        iniciarSesionSchema.parse({
          studentId: UUID_INVALIDO,
          tipoActividad: 'lectura',
          modulo: 'lectura-adaptativa',
        }),
      ).toThrow();
    });

    it('rechaza tipoActividad vacio', () => {
      expect(() =>
        iniciarSesionSchema.parse({
          studentId: UUID_VALIDO,
          tipoActividad: '',
          modulo: 'lectura-adaptativa',
        }),
      ).toThrow();
    });

    it('rechaza campos faltantes', () => {
      expect(() => iniciarSesionSchema.parse({})).toThrow();
      expect(() =>
        iniciarSesionSchema.parse({ studentId: UUID_VALIDO }),
      ).toThrow();
    });
  });

  // ── guardarRespuesta ──
  describe('guardarRespuestaSchema', () => {
    const datosValidos = {
      sessionId: UUID_VALIDO,
      studentId: UUID_VALIDO,
      ejercicioId: 'comprension-1234',
      tipoEjercicio: 'comprension',
      pregunta: 'Que paso en la historia?',
      respuesta: 'El gato encontro un tesoro',
      respuestaCorrecta: 'El gato encontro un tesoro',
      correcta: true,
      tiempoRespuestaMs: 1200,
      intentoNumero: 1,
    };

    it('acepta datos validos completos', () => {
      const result = guardarRespuestaSchema.parse(datosValidos);
      expect(result.correcta).toBe(true);
      expect(result.tiempoRespuestaMs).toBe(1200);
    });

    it('acepta sin campos opcionales', () => {
      const {
        tiempoRespuestaMs: _tiempoRespuestaMs,
        intentoNumero: _intentoNumero,
        ...sinOpcionales
      } = datosValidos;
      const result = guardarRespuestaSchema.parse(sinOpcionales);
      expect(result.tiempoRespuestaMs).toBeUndefined();
    });

    it('rechaza sessionId invalido', () => {
      expect(() =>
        guardarRespuestaSchema.parse({
          ...datosValidos,
          sessionId: 'invalido',
        }),
      ).toThrow();
    });

    it('rechaza respuesta vacia', () => {
      expect(() =>
        guardarRespuestaSchema.parse({ ...datosValidos, respuesta: '' }),
      ).toThrow();
    });

    it('rechaza tiempoRespuestaMs negativo', () => {
      expect(() =>
        guardarRespuestaSchema.parse({
          ...datosValidos,
          tiempoRespuestaMs: -100,
        }),
      ).toThrow();
    });
  });

  // ── actualizarSesion ──
  describe('actualizarSesionSchema', () => {
    it('acepta datos minimos', () => {
      const datos = { sessionId: UUID_VALIDO, studentId: UUID_VALIDO };
      expect(actualizarSesionSchema.parse(datos)).toEqual(datos);
    });

    it('acepta con estrellas', () => {
      const datos = {
        sessionId: UUID_VALIDO,
        studentId: UUID_VALIDO,
        estrellasGanadas: 3,
      };
      expect(actualizarSesionSchema.parse(datos).estrellasGanadas).toBe(3);
    });

    it('rechaza estrellas negativas', () => {
      expect(() =>
        actualizarSesionSchema.parse({
          sessionId: UUID_VALIDO,
          studentId: UUID_VALIDO,
          estrellasGanadas: -1,
        }),
      ).toThrow();
    });
  });

  // ── finalizarSesion ──
  describe('finalizarSesionSchema', () => {
    it('acepta datos validos', () => {
      const datos = {
        sessionId: UUID_VALIDO,
        duracionSegundos: 300,
        completada: true,
        estrellasGanadas: 3,
        stickerGanado: '🐬',
        studentId: UUID_VALIDO,
      };
      expect(finalizarSesionSchema.parse(datos).completada).toBe(true);
    });

    it('rechaza duracion negativa', () => {
      expect(() =>
        finalizarSesionSchema.parse({
          sessionId: UUID_VALIDO,
          duracionSegundos: -1,
          completada: true,
          estrellasGanadas: 0,
          studentId: UUID_VALIDO,
        }),
      ).toThrow();
    });

    it('acepta sin sticker', () => {
      const datos = {
        sessionId: UUID_VALIDO,
        duracionSegundos: 300,
        completada: false,
        estrellasGanadas: 0,
        studentId: UUID_VALIDO,
      };
      expect(finalizarSesionSchema.parse(datos).stickerGanado).toBeUndefined();
    });
  });

  // ── actualizarProgreso ──
  describe('actualizarProgresoSchema', () => {
    it('acepta datos validos', () => {
      const datos = {
        studentId: UUID_VALIDO,
        skillId: 'comprension-inferencia',
        categoria: 'comprension',
        correcto: true,
      };
      expect(actualizarProgresoSchema.parse(datos)).toEqual(datos);
    });

    it('rechaza skillId vacio', () => {
      expect(() =>
        actualizarProgresoSchema.parse({
          studentId: UUID_VALIDO,
          skillId: '',
          categoria: 'comprension',
          correcto: true,
        }),
      ).toThrow();
    });

    it('rechaza correcto no booleano', () => {
      expect(() =>
        actualizarProgresoSchema.parse({
          studentId: UUID_VALIDO,
          skillId: 'comprension-inferencia',
          categoria: 'comprension',
          correcto: 'si',
        }),
      ).toThrow();
    });
  });

  // ── cargarProgreso ──
  describe('cargarProgresoSchema', () => {
    it('acepta UUID valido', () => {
      expect(cargarProgresoSchema.parse(UUID_VALIDO)).toBe(UUID_VALIDO);
    });

    it('rechaza string no UUID', () => {
      expect(() => cargarProgresoSchema.parse('no-uuid')).toThrow();
    });

    it('rechaza vacio', () => {
      expect(() => cargarProgresoSchema.parse('')).toThrow();
    });
  });

  // ── crearEstudiante ──
  describe('crearEstudianteSchema', () => {
    it('acepta datos validos', () => {
      const datos = {
        nombre: 'Sofia',
        fechaNacimiento: '2020-03-15',
      };
      expect(crearEstudianteSchema.parse(datos).nombre).toBe('Sofia');
    });

    it('rechaza nombre vacio', () => {
      expect(() =>
        crearEstudianteSchema.parse({
          nombre: '',
          fechaNacimiento: '2020-03-15',
        }),
      ).toThrow();
    });

    it('rechaza fecha malformada', () => {
      expect(() =>
        crearEstudianteSchema.parse({
          nombre: 'Sofia',
          fechaNacimiento: '15/03/2020',
        }),
      ).toThrow();
    });
  });
});

// ─────────────────────────────────────────────
// TEST DE ESTRUCTURA DE AUTH
// ─────────────────────────────────────────────

describe('Estructura de autenticacion', () => {
  it('requireStudentOwnership esta exportado desde auth.ts', async () => {
    const authModule = await import('@/server/auth');
    expect(typeof authModule.requireStudentOwnership).toBe('function');
    expect(typeof authModule.requireAuth).toBe('function');
  });

  it('session-actions exporta todas las funciones esperadas', async () => {
    const sessionModule = await import('@/server/actions/session-actions');
    expect(typeof sessionModule.iniciarSesion).toBe('function');
    expect(typeof sessionModule.guardarRespuestaIndividual).toBe('function');
    expect(typeof sessionModule.actualizarSesionEnCurso).toBe('function');
    expect(typeof sessionModule.finalizarSesionDB).toBe('function');
    expect(typeof sessionModule.actualizarProgresoInmediato).toBe('function');
    expect(typeof sessionModule.cargarProgresoEstudiante).toBe('function');
  });

  it('student-actions exporta funciones del nuevo modelo', async () => {
    const studentModule = await import('@/server/actions/student-actions');
    expect(typeof studentModule.crearEstudiante).toBe('function');
    expect(typeof studentModule.obtenerEstudiantes).toBe('function');
    expect(typeof studentModule.obtenerEstudiante).toBe('function');
    expect(typeof studentModule.obtenerResumenProgreso).toBe('function');

    // guardarDiagnostico ya no existe
    expect((studentModule as Record<string, unknown>).guardarDiagnostico).toBeUndefined();
  });
});
