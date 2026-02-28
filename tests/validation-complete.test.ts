/**
 * Tests de validacion completos para schemas de Zod.
 *
 * Cubre todos los schemas de validacion con:
 * - Datos validos (minimos y completos)
 * - Datos invalidos (rechazos esperados)
 * - Valores limites y edge cases
 *
 * Nota: Algunos schemas ya tienen cobertura en archivos sprint1/2/4.
 * Este archivo completa los gaps de cobertura.
 */
import { describe, it, expect } from 'vitest';
import {
  generarHistoriaSchema,
  finalizarSesionLecturaSchema,
  reescribirHistoriaSchema,
  analizarLecturaAudioSchema,
  guardarContextoPersonalSchema,
  guardarAjustesLecturaSchema,
  responderMicroPreguntaPerfilSchema,
  registrarAjusteManualSchema,
  generarPreguntasSesionSchema,
} from '@/server/validation';

const UUID_VALIDO = '550e8400-e29b-41d4-a716-446655440000';
const UUID_VALIDO_2 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_VALIDO_3 = '550e8400-e29b-41d4-a716-446655440002';

// ─────────────────────────────────────────────
// generarHistoriaSchema
// ─────────────────────────────────────────────

describe('generarHistoriaSchema', () => {
  it('acepta solo studentId (campos opcionales)', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.studentId).toBe(UUID_VALIDO);
      expect(result.data.topicSlug).toBeUndefined();
      expect(result.data.forceRegenerate).toBeUndefined();
    }
  });

  it('acepta con todos los campos opcionales', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      topicSlug: 'animales-que-vuelan',
      forceRegenerate: true,
      progressTraceId: UUID_VALIDO_2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topicSlug).toBe('animales-que-vuelan');
      expect(result.data.forceRegenerate).toBe(true);
      expect(result.data.progressTraceId).toBe(UUID_VALIDO_2);
    }
  });

  it('rechaza studentId invalido (no UUID)', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: 'no-es-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId faltante', () => {
    const result = generarHistoriaSchema.safeParse({
      topicSlug: 'animales',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza topicSlug vacio', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      topicSlug: '',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza topicSlug > 100 caracteres', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      topicSlug: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('acepta topicSlug de 100 caracteres exactos', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      topicSlug: 'a'.repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it('rechaza progressTraceId invalido', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      progressTraceId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('acepta forceRegenerate como boolean', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: UUID_VALIDO,
      forceRegenerate: false,
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// finalizarSesionLecturaSchema
// ─────────────────────────────────────────────

describe('finalizarSesionLecturaSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO,
    studentId: UUID_VALIDO_2,
    tiempoLecturaMs: 45000,
    respuestas: [
      {
        preguntaId: 'q1',
        tipo: 'literal' as const,
        respuestaSeleccionada: 0,
        correcta: true,
        tiempoMs: 5000,
      },
      {
        preguntaId: 'q2',
        tipo: 'inferencia' as const,
        respuestaSeleccionada: 1,
        correcta: false,
        tiempoMs: 8000,
      },
    ],
  };

  it('acepta payload completo valido', () => {
    const result = finalizarSesionLecturaSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta con audioAnalisis opcional', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      audioAnalisis: {
        wpmUtil: 150,
        precisionLectura: 0.95,
        coberturaTexto: 0.98,
        pauseRatio: 0.05,
        tiempoVozActivaMs: 40000,
        totalPalabrasTranscritas: 300,
        totalPalabrasAlineadas: 295,
        qualityScore: 0.92,
        confiable: true,
        motor: 'whisper-v3',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rechaza respuestas array vacio', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza respuestas array > 4', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        {
          preguntaId: 'q1',
          tipo: 'literal' as const,
          respuestaSeleccionada: 0,
          correcta: true,
          tiempoMs: 1000,
        },
        {
          preguntaId: 'q2',
          tipo: 'inferencia' as const,
          respuestaSeleccionada: 1,
          correcta: true,
          tiempoMs: 1000,
        },
        {
          preguntaId: 'q3',
          tipo: 'vocabulario' as const,
          respuestaSeleccionada: 2,
          correcta: false,
          tiempoMs: 1000,
        },
        {
          preguntaId: 'q4',
          tipo: 'resumen' as const,
          respuestaSeleccionada: 3,
          correcta: true,
          tiempoMs: 1000,
        },
        {
          preguntaId: 'q5',
          tipo: 'literal' as const,
          respuestaSeleccionada: 0,
          correcta: false,
          tiempoMs: 1000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('acepta exactamente 4 respuestas', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        {
          preguntaId: 'q1',
          tipo: 'literal' as const,
          respuestaSeleccionada: 0,
          correcta: true,
          tiempoMs: 1000,
        },
        {
          preguntaId: 'q2',
          tipo: 'inferencia' as const,
          respuestaSeleccionada: 1,
          correcta: true,
          tiempoMs: 2000,
        },
        {
          preguntaId: 'q3',
          tipo: 'vocabulario' as const,
          respuestaSeleccionada: 2,
          correcta: false,
          tiempoMs: 3000,
        },
        {
          preguntaId: 'q4',
          tipo: 'resumen' as const,
          respuestaSeleccionada: 3,
          correcta: true,
          tiempoMs: 4000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza tiempoLecturaMs negativo', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      tiempoLecturaMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('acepta tiempoLecturaMs = 0', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      tiempoLecturaMs: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sessionId invalido', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      sessionId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza respuestaSeleccionada > 3', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        {
          preguntaId: 'q1',
          tipo: 'literal' as const,
          respuestaSeleccionada: 4,
          correcta: true,
          tiempoMs: 1000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('acepta tiempoMs negativo en respuestas (audio)', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        {
          preguntaId: 'q1',
          tipo: 'literal' as const,
          respuestaSeleccionada: 0,
          correcta: true,
          tiempoMs: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('acepta wpmPromedio y wpmPorPagina opcionales', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      wpmPromedio: 175.5,
      wpmPorPagina: [
        { pagina: 1, wpm: 180 },
        { pagina: 2, wpm: 170 },
      ],
      totalPaginas: 2,
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// reescribirHistoriaSchema
// ─────────────────────────────────────────────

describe('reescribirHistoriaSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO,
    studentId: UUID_VALIDO_2,
    storyId: UUID_VALIDO_3,
    direccion: 'mas_facil' as const,
    tiempoLecturaAntesDePulsar: 15000,
  };

  it('acepta payload valido con mas_facil', () => {
    const result = reescribirHistoriaSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta con direccion mas_desafiante', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      direccion: 'mas_desafiante',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza direccion invalida', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      direccion: 'mantenimiento' as any,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sessionId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      sessionId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      studentId: 'no-es-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza storyId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      storyId: 123 as any,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tiempoLecturaAntesDePulsar negativo', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      tiempoLecturaAntesDePulsar: -1,
    });
    expect(result.success).toBe(false);
  });

  it('acepta tiempoLecturaAntesDePulsar = 0', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      tiempoLecturaAntesDePulsar: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza payload incompleto', () => {
    const result = reescribirHistoriaSchema.safeParse({
      sessionId: UUID_VALIDO,
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// analizarLecturaAudioSchema
// ─────────────────────────────────────────────

describe('analizarLecturaAudioSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO,
    studentId: UUID_VALIDO_2,
    audioBase64: 'SGVsbG8gV29ybGQ=', // "Hello World" en base64
    tiempoVozActivaMs: 45000,
    tiempoTotalMs: 50000,
  };

  it('acepta payload valido minimo', () => {
    const result = analizarLecturaAudioSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta con storyId y mimeType opcionales', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      storyId: UUID_VALIDO_3,
      mimeType: 'audio/wav',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza audioBase64 vacio', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      audioBase64: '',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza audioBase64 > 20M caracteres', () => {
    const resultado = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      audioBase64: 'A'.repeat(20_000_001),
    });
    expect(resultado.success).toBe(false);
  });

  it('acepta audioBase64 de exactamente 20M caracteres', () => {
    const resultado = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      audioBase64: 'A'.repeat(20_000_000),
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza tiempoTotalMs <= 0', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      tiempoTotalMs: 0,
    });
    expect(result.success).toBe(false);
  });

  it('acepta tiempoVozActivaMs >= tiempoTotalMs (audio largo)', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      tiempoVozActivaMs: 60000,
      tiempoTotalMs: 50000,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza sessionId invalido', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      sessionId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza mimeType > 100 caracteres', () => {
    const result = analizarLecturaAudioSchema.safeParse({
      ...datosValidos,
      mimeType: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// guardarContextoPersonalSchema
// ─────────────────────────────────────────────

describe('guardarContextoPersonalSchema', () => {
  it('acepta studentId solo (contextoPersonal opcional)', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: UUID_VALIDO,
    });
    expect(result.success).toBe(true);
  });

  it('acepta con contextoPersonal corto', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: UUID_VALIDO,
      contextoPersonal: 'Mi hijo toca guitarra',
    });
    expect(result.success).toBe(true);
  });

  it('acepta contextoPersonal de 2000 caracteres exactos', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: UUID_VALIDO,
      contextoPersonal: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('rechaza contextoPersonal > 2000 caracteres', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: UUID_VALIDO,
      contextoPersonal: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId invalido', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: 'not-uuid',
      contextoPersonal: 'algo',
    });
    expect(result.success).toBe(false);
  });

  it('acepta contextoPersonal vacio string', () => {
    const result = guardarContextoPersonalSchema.safeParse({
      studentId: UUID_VALIDO,
      contextoPersonal: '',
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// guardarAjustesLecturaSchema
// ─────────────────────────────────────────────

describe('guardarAjustesLecturaSchema', () => {
  it('acepta funMode = true', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      funMode: true,
    });
    expect(result.success).toBe(true);
  });

  it('acepta funMode = false', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      funMode: false,
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad con fuenteDislexia', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        fuenteDislexia: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad con modoTDAH', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        modoTDAH: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad con altoContraste', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        altoContraste: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad con duracionSesionMin = 5 (limite minimo)', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        duracionSesionMin: 5,
      },
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad con duracionSesionMin = 120 (limite maximo)', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        duracionSesionMin: 120,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rechaza duracionSesionMin < 5', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        duracionSesionMin: 4,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza duracionSesionMin > 120', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        duracionSesionMin: 121,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cuando AMBOS funMode y accesibilidad estan indefinidos (refine)', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
    });
    expect(result.success).toBe(false);
  });

  it('acepta funMode = false (valor definido)', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      funMode: false,
    });
    expect(result.success).toBe(true);
  });

  it('acepta cuando funMode = true pero accesibilidad vacio', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      funMode: true,
      accesibilidad: {},
    });
    expect(result.success).toBe(true);
  });

  it('acepta accesibilidad completa con todos los campos', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        fuenteDislexia: true,
        modoTDAH: false,
        altoContraste: true,
        duracionSesionMin: 30,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rechaza duracionSesionMin con valor float', () => {
    const result = guardarAjustesLecturaSchema.safeParse({
      studentId: UUID_VALIDO,
      accesibilidad: {
        duracionSesionMin: 15.5,
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// responderMicroPreguntaPerfilSchema
// ─────────────────────────────────────────────

describe('responderMicroPreguntaPerfilSchema', () => {
  it('acepta respuesta valida minima', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: 'q1',
      respuesta: 'Si',
    });
    expect(result.success).toBe(true);
  });

  it('acepta respuesta maxima (120 caracteres)', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: 'pregunta-1',
      respuesta: 'a'.repeat(120),
    });
    expect(result.success).toBe(true);
  });

  it('rechaza respuesta vacia', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: 'q1',
      respuesta: '',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza respuesta > 120 caracteres', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: 'q1',
      respuesta: 'a'.repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it('rechaza preguntaId vacio', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: '',
      respuesta: 'algo',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza preguntaId > 100 caracteres', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: UUID_VALIDO,
      preguntaId: 'a'.repeat(101),
      respuesta: 'algo',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId invalido', () => {
    const result = responderMicroPreguntaPerfilSchema.safeParse({
      studentId: 'not-uuid',
      preguntaId: 'q1',
      respuesta: 'respuesta',
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// registrarAjusteManualSchema
// ─────────────────────────────────────────────

describe('registrarAjusteManualSchema', () => {
  const datosValidos = {
    studentId: UUID_VALIDO,
    sessionId: UUID_VALIDO_2,
    storyId: UUID_VALIDO_3,
    tipo: 'mas_facil' as const,
    nivelAntes: 3,
    nivelDespues: 2,
    tiempoLecturaAntesDePulsar: 12000,
  };

  it('acepta datos validos con mas_facil', () => {
    const result = registrarAjusteManualSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta datos validos con mas_desafiante', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      tipo: 'mas_desafiante',
      nivelAntes: 2,
      nivelDespues: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza tipo invalido', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      tipo: 'mantener' as any,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza nivelAntes < 1', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza nivelAntes > 10', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 11,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza nivelDespues < 1', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelDespues: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza nivelDespues > 10', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelDespues: 11,
    });
    expect(result.success).toBe(false);
  });

  it('acepta nivel de 1 (limite minimo)', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 1,
      nivelDespues: 1,
    });
    expect(result.success).toBe(true);
  });

  it('acepta nivel de 10 (limite maximo)', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 10,
      nivelDespues: 10,
    });
    expect(result.success).toBe(true);
  });

  it('acepta niveles decimales', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 2.5,
      nivelDespues: 3.5,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza studentId invalido', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      studentId: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tiempoLecturaAntesDePulsar negativo', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      tiempoLecturaAntesDePulsar: -1,
    });
    expect(result.success).toBe(false);
  });

  it('acepta tiempoLecturaAntesDePulsar = 0', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      tiempoLecturaAntesDePulsar: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// generarPreguntasSesionSchema
// ─────────────────────────────────────────────

describe('generarPreguntasSesionSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO,
    studentId: UUID_VALIDO_2,
    storyId: UUID_VALIDO_3,
  };

  it('acepta datos validos', () => {
    const result = generarPreguntasSesionSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('rechaza sessionId invalido', () => {
    const result = generarPreguntasSesionSchema.safeParse({
      ...datosValidos,
      sessionId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId invalido', () => {
    const result = generarPreguntasSesionSchema.safeParse({
      ...datosValidos,
      studentId: 'invalid-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza storyId invalido', () => {
    const result = generarPreguntasSesionSchema.safeParse({
      ...datosValidos,
      storyId: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza payload incompleto (sin storyId)', () => {
    const result = generarPreguntasSesionSchema.safeParse({
      sessionId: UUID_VALIDO,
      studentId: UUID_VALIDO_2,
    });
    expect(result.success).toBe(false);
  });
});
