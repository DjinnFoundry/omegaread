/**
 * Tests de validacion Zod para schemas de Sprint 1.
 *
 * Verifica:
 * 1. actualizarPerfilSchema
 * 2. guardarInteresesSchema
 * 3. guardarRespuestaBaselineSchema
 * 4. finalizarBaselineSchema
 * 5. crearSesionLecturaSchema
 * 6. registrarRespuestaComprensionSchema
 */
import { describe, it, expect } from 'vitest';
import {
  actualizarPerfilSchema,
  guardarInteresesSchema,
  guardarRespuestaBaselineSchema,
  finalizarBaselineSchema,
  crearSesionLecturaSchema,
  registrarRespuestaComprensionSchema,
} from '@/server/validation';

const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';

// ─────────────────────────────────────────────
// actualizarPerfilSchema
// ─────────────────────────────────────────────

describe('actualizarPerfilSchema', () => {
  const datosValidos = {
    studentId: UUID_VALIDO,
    curso: '1o-primaria' as const,
    rutinaLectura: 'diaria' as const,
    acompanamiento: 'siempre' as const,
    senalesDificultad: {},
  };

  it('acepta datos validos minimos', () => {
    const result = actualizarPerfilSchema.parse(datosValidos);
    expect(result.curso).toBe('1o-primaria');
  });

  it('acepta datos completos', () => {
    const datos = {
      ...datosValidos,
      centroEscolar: 'Colegio San Jose',
      senalesDificultad: {
        atencion: true,
        vocabulario: false,
        frustracion: true,
        otroDetalle: 'Se cansa rapido',
      },
      personajesFavoritos: 'Spiderman, Elsa',
      temasEvitar: ['misterio'],
    };
    const result = actualizarPerfilSchema.parse(datos);
    expect(result.senalesDificultad.atencion).toBe(true);
    expect(result.temasEvitar).toEqual(['misterio']);
  });

  it('rechaza curso invalido', () => {
    expect(() =>
      actualizarPerfilSchema.parse({ ...datosValidos, curso: 'sexto' }),
    ).toThrow();
  });

  it('rechaza rutinaLectura invalida', () => {
    expect(() =>
      actualizarPerfilSchema.parse({ ...datosValidos, rutinaLectura: 'mucho' }),
    ).toThrow();
  });

  it('rechaza acompanamiento invalido', () => {
    expect(() =>
      actualizarPerfilSchema.parse({ ...datosValidos, acompanamiento: 'quizas' }),
    ).toThrow();
  });

  it('rechaza studentId invalido', () => {
    expect(() =>
      actualizarPerfilSchema.parse({ ...datosValidos, studentId: 'invalido' }),
    ).toThrow();
  });

  it('limita temasEvitar a 10 items', () => {
    const once = Array.from({ length: 11 }, (_, i) => `tema-${i}`);
    expect(() =>
      actualizarPerfilSchema.parse({ ...datosValidos, temasEvitar: once }),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// guardarInteresesSchema
// ─────────────────────────────────────────────

describe('guardarInteresesSchema', () => {
  it('acepta lista de intereses valida', () => {
    const result = guardarInteresesSchema.parse({
      studentId: UUID_VALIDO,
      intereses: ['animales', 'espacio'],
    });
    expect(result.intereses).toHaveLength(2);
  });

  it('requiere al menos 1 interes', () => {
    expect(() =>
      guardarInteresesSchema.parse({ studentId: UUID_VALIDO, intereses: [] }),
    ).toThrow();
  });

  it('limita a 30 intereses', () => {
    const demasiados = Array.from({ length: 31 }, (_, i) => `interes-${i}`);
    expect(() =>
      guardarInteresesSchema.parse({ studentId: UUID_VALIDO, intereses: demasiados }),
    ).toThrow();
  });

  it('rechaza sin studentId', () => {
    expect(() =>
      guardarInteresesSchema.parse({ intereses: ['animales'] }),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// guardarRespuestaBaselineSchema
// ─────────────────────────────────────────────

describe('guardarRespuestaBaselineSchema', () => {
  const datosValidos = {
    studentId: UUID_VALIDO,
    nivelTexto: 1,
    textoId: 'baseline-n1',
    totalPreguntas: 3,
    aciertos: 2,
    aciertosPorTipo: { literal: 1, inferencia: 1 },
    tiempoLecturaMs: 45000,
    respuestas: [
      { preguntaId: 'n1-literal', tipo: 'literal' as const, respuesta: '1', correcta: true },
      { preguntaId: 'n1-inferencia', tipo: 'inferencia' as const, respuesta: '1', correcta: true },
      { preguntaId: 'n1-vocabulario', tipo: 'vocabulario' as const, respuesta: '0', correcta: false },
    ],
  };

  it('acepta datos validos', () => {
    const result = guardarRespuestaBaselineSchema.parse(datosValidos);
    expect(result.nivelTexto).toBe(1);
    expect(result.respuestas).toHaveLength(3);
  });

  it('rechaza nivelTexto fuera de rango', () => {
    expect(() =>
      guardarRespuestaBaselineSchema.parse({ ...datosValidos, nivelTexto: 0 }),
    ).toThrow();
    expect(() =>
      guardarRespuestaBaselineSchema.parse({ ...datosValidos, nivelTexto: 5 }),
    ).toThrow();
  });

  it('rechaza tipo de pregunta invalido', () => {
    expect(() =>
      guardarRespuestaBaselineSchema.parse({
        ...datosValidos,
        respuestas: [{ preguntaId: 'q1', tipo: 'opinion', respuesta: '1', correcta: true }],
      }),
    ).toThrow();
  });

  it('acepta sin tiempoLecturaMs (opcional)', () => {
    const { tiempoLecturaMs: _, ...sinTiempo } = datosValidos;
    const result = guardarRespuestaBaselineSchema.parse(sinTiempo);
    expect(result.tiempoLecturaMs).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// finalizarBaselineSchema
// ─────────────────────────────────────────────

describe('finalizarBaselineSchema', () => {
  it('acepta datos validos', () => {
    const result = finalizarBaselineSchema.parse({
      studentId: UUID_VALIDO,
      nivelLectura: 2.5,
      comprensionScore: 0.72,
      confianza: 'medio',
    });
    expect(result.confianza).toBe('medio');
  });

  it('rechaza confianza invalida', () => {
    expect(() =>
      finalizarBaselineSchema.parse({
        studentId: UUID_VALIDO,
        nivelLectura: 2,
        comprensionScore: 0.7,
        confianza: 'altisimo',
      }),
    ).toThrow();
  });

  it('rechaza nivelLectura fuera de rango', () => {
    expect(() =>
      finalizarBaselineSchema.parse({
        studentId: UUID_VALIDO,
        nivelLectura: 0,
        comprensionScore: 0.5,
        confianza: 'bajo',
      }),
    ).toThrow();
  });

  it('rechaza comprensionScore > 1', () => {
    expect(() =>
      finalizarBaselineSchema.parse({
        studentId: UUID_VALIDO,
        nivelLectura: 2,
        comprensionScore: 1.5,
        confianza: 'alto',
      }),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// crearSesionLecturaSchema
// ─────────────────────────────────────────────

describe('crearSesionLecturaSchema', () => {
  it('acepta solo studentId', () => {
    const result = crearSesionLecturaSchema.parse({ studentId: UUID_VALIDO });
    expect(result.studentId).toBe(UUID_VALIDO);
  });

  it('acepta con todos los campos opcionales', () => {
    const result = crearSesionLecturaSchema.parse({
      studentId: UUID_VALIDO,
      textoId: 'historia-123',
      nivelTexto: 3,
      topicId: UUID_VALIDO,
    });
    expect(result.textoId).toBe('historia-123');
    expect(result.nivelTexto).toBe(3);
  });

  it('rechaza studentId invalido', () => {
    expect(() =>
      crearSesionLecturaSchema.parse({ studentId: 'no-uuid' }),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// registrarRespuestaComprensionSchema
// ─────────────────────────────────────────────

describe('registrarRespuestaComprensionSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO,
    studentId: UUID_VALIDO,
    preguntaId: 'q-literal-1',
    tipo: 'literal' as const,
    respuestaSeleccionada: 2,
    correcta: true,
    tiempoMs: 3500,
  };

  it('acepta datos validos', () => {
    const result = registrarRespuestaComprensionSchema.parse(datosValidos);
    expect(result.tipo).toBe('literal');
  });

  it('acepta todos los tipos de pregunta', () => {
    for (const tipo of ['literal', 'inferencia', 'vocabulario', 'resumen'] as const) {
      const result = registrarRespuestaComprensionSchema.parse({ ...datosValidos, tipo });
      expect(result.tipo).toBe(tipo);
    }
  });

  it('rechaza tipo invalido', () => {
    expect(() =>
      registrarRespuestaComprensionSchema.parse({ ...datosValidos, tipo: 'opinion' }),
    ).toThrow();
  });

  it('rechaza tiempoMs negativo', () => {
    expect(() =>
      registrarRespuestaComprensionSchema.parse({ ...datosValidos, tiempoMs: -100 }),
    ).toThrow();
  });
});
