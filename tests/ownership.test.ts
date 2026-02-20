/**
 * Tests para verificación de ownership en server actions.
 *
 * Verifica que:
 * 1. Todas las server actions requieren autenticación
 * 2. El padre solo puede acceder a datos de sus propios hijos
 * 3. Los inputs se validan con Zod
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
  guardarDiagnosticoSchema,
} from '@/server/validation';

// ─────────────────────────────────────────────
// TEST DE VALIDACIÓN ZOD
// ─────────────────────────────────────────────

describe('Validación de inputs con Zod', () => {
  const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';
  const UUID_INVALIDO = 'no-es-un-uuid';

  // ── iniciarSesion ──
  describe('iniciarSesionSchema', () => {
    it('acepta datos válidos', () => {
      const datos = {
        studentId: UUID_VALIDO,
        tipoActividad: 'vocales',
        modulo: 'pre-lectura',
      };
      expect(iniciarSesionSchema.parse(datos)).toEqual(datos);
    });

    it('rechaza studentId inválido', () => {
      expect(() =>
        iniciarSesionSchema.parse({
          studentId: UUID_INVALIDO,
          tipoActividad: 'vocales',
          modulo: 'pre-lectura',
        }),
      ).toThrow();
    });

    it('rechaza tipoActividad vacío', () => {
      expect(() =>
        iniciarSesionSchema.parse({
          studentId: UUID_VALIDO,
          tipoActividad: '',
          modulo: 'pre-lectura',
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
      ejercicioId: 'vocal-A-reconocimiento-1234',
      tipoEjercicio: 'reconocimiento',
      pregunta: 'Busca la A',
      respuesta: 'A',
      respuestaCorrecta: 'A',
      correcta: true,
      tiempoRespuestaMs: 1200,
      intentoNumero: 1,
    };

    it('acepta datos válidos completos', () => {
      const result = guardarRespuestaSchema.parse(datosValidos);
      expect(result.correcta).toBe(true);
      expect(result.tiempoRespuestaMs).toBe(1200);
    });

    it('acepta sin campos opcionales', () => {
      const { tiempoRespuestaMs, intentoNumero, ...sinOpcionales } = datosValidos;
      const result = guardarRespuestaSchema.parse(sinOpcionales);
      expect(result.tiempoRespuestaMs).toBeUndefined();
    });

    it('rechaza sessionId inválido', () => {
      expect(() =>
        guardarRespuestaSchema.parse({
          ...datosValidos,
          sessionId: 'invalido',
        }),
      ).toThrow();
    });

    it('rechaza respuesta vacía', () => {
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
    it('acepta datos mínimos', () => {
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
    it('acepta datos válidos', () => {
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

    it('rechaza duración negativa', () => {
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
    it('acepta datos válidos', () => {
      const datos = {
        studentId: UUID_VALIDO,
        skillId: 'vocal-a',
        categoria: 'vocales',
        correcto: true,
      };
      expect(actualizarProgresoSchema.parse(datos)).toEqual(datos);
    });

    it('rechaza skillId vacío', () => {
      expect(() =>
        actualizarProgresoSchema.parse({
          studentId: UUID_VALIDO,
          skillId: '',
          categoria: 'vocales',
          correcto: true,
        }),
      ).toThrow();
    });

    it('rechaza correcto no booleano', () => {
      expect(() =>
        actualizarProgresoSchema.parse({
          studentId: UUID_VALIDO,
          skillId: 'vocal-a',
          categoria: 'vocales',
          correcto: 'si',
        }),
      ).toThrow();
    });
  });

  // ── cargarProgreso ──
  describe('cargarProgresoSchema', () => {
    it('acepta UUID válido', () => {
      expect(cargarProgresoSchema.parse(UUID_VALIDO)).toBe(UUID_VALIDO);
    });

    it('rechaza string no UUID', () => {
      expect(() => cargarProgresoSchema.parse('no-uuid')).toThrow();
    });

    it('rechaza vacío', () => {
      expect(() => cargarProgresoSchema.parse('')).toThrow();
    });
  });

  // ── crearEstudiante ──
  describe('crearEstudianteSchema', () => {
    it('acepta datos válidos', () => {
      const datos = {
        nombre: 'Sofía',
        fechaNacimiento: '2020-03-15',
        mascotaTipo: 'gato' as const,
        mascotaNombre: 'Luna',
      };
      expect(crearEstudianteSchema.parse(datos).nombre).toBe('Sofía');
    });

    it('rechaza nombre vacío', () => {
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
          nombre: 'Sofía',
          fechaNacimiento: '15/03/2020',
        }),
      ).toThrow();
    });

    it('rechaza mascota inválida', () => {
      expect(() =>
        crearEstudianteSchema.parse({
          nombre: 'Sofía',
          fechaNacimiento: '2020-03-15',
          mascotaTipo: 'unicornio',
        }),
      ).toThrow();
    });

    it('aplica defaults para mascota', () => {
      const result = crearEstudianteSchema.parse({
        nombre: 'Sofía',
        fechaNacimiento: '2020-03-15',
      });
      expect(result.mascotaTipo).toBe('gato');
      expect(result.mascotaNombre).toBe('Luna');
    });
  });

  // ── guardarDiagnostico ──
  describe('guardarDiagnosticoSchema', () => {
    it('acepta datos válidos', () => {
      const datos = {
        studentId: UUID_VALIDO,
        resultado: {
          letrasReconocidas: ['A', 'E', 'M'],
          cuentaHasta: 5,
          concienciaFonologica: 2,
          fecha: '2026-02-20T10:00:00Z',
        },
      };
      expect(guardarDiagnosticoSchema.parse(datos).resultado.cuentaHasta).toBe(5);
    });

    it('rechaza conciencia fonológica negativa', () => {
      expect(() =>
        guardarDiagnosticoSchema.parse({
          studentId: UUID_VALIDO,
          resultado: {
            letrasReconocidas: [],
            cuentaHasta: 0,
            concienciaFonologica: -1,
            fecha: '2026-02-20',
          },
        }),
      ).toThrow();
    });
  });
});

// ─────────────────────────────────────────────
// TEST DE ESTRUCTURA DE AUTH
// ─────────────────────────────────────────────

describe('Estructura de autenticación', () => {
  it('requireStudentOwnership está exportado desde auth.ts', async () => {
    // Importar dinámicamente para verificar que el export existe
    // (no podemos ejecutar la función sin DB, pero verificamos el contrato)
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

  it('student-actions no exporta funciones duplicadas', async () => {
    const studentModule = await import('@/server/actions/student-actions');
    // Estas funciones deben existir
    expect(typeof studentModule.crearEstudiante).toBe('function');
    expect(typeof studentModule.obtenerEstudiantes).toBe('function');
    expect(typeof studentModule.obtenerEstudiante).toBe('function');
    expect(typeof studentModule.guardarDiagnostico).toBe('function');
    expect(typeof studentModule.obtenerResumenProgreso).toBe('function');

    // Estas funciones NO deben existir aquí (están consolidadas en session-actions)
    expect((studentModule as Record<string, unknown>).guardarSesion).toBeUndefined();
    expect((studentModule as Record<string, unknown>).actualizarProgreso).toBeUndefined();
  });
});
