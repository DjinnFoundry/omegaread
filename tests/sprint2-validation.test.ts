/**
 * Tests para schemas de validacion de Sprint 2.
 */
import { describe, it, expect } from 'vitest';
import {
  generarHistoriaSchema,
  finalizarSesionLecturaSchema,
} from '@/server/validation';

describe('generarHistoriaSchema', () => {
  it('acepta studentId valido sin topicSlug', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('acepta studentId con topicSlug', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: '550e8400-e29b-41d4-a716-446655440000',
      topicSlug: 'animales',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza studentId invalido', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: 'no-es-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza topicSlug vacio', () => {
    const result = generarHistoriaSchema.safeParse({
      studentId: '550e8400-e29b-41d4-a716-446655440000',
      topicSlug: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('finalizarSesionLecturaSchema', () => {
  const datosValidos = {
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    studentId: '550e8400-e29b-41d4-a716-446655440001',
    tiempoLecturaMs: 45000,
    respuestas: [
      {
        preguntaId: 'q1',
        tipo: 'literal' as const,
        respuestaSeleccionada: 1,
        correcta: true,
        tiempoMs: 5000,
      },
      {
        preguntaId: 'q2',
        tipo: 'inferencia' as const,
        respuestaSeleccionada: 0,
        correcta: false,
        tiempoMs: 8000,
      },
    ],
  };

  it('acepta datos validos', () => {
    const result = finalizarSesionLecturaSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta 4 respuestas', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 0, correcta: true, tiempoMs: 1000 },
        { preguntaId: 'q2', tipo: 'inferencia', respuestaSeleccionada: 1, correcta: true, tiempoMs: 2000 },
        { preguntaId: 'q3', tipo: 'vocabulario', respuestaSeleccionada: 2, correcta: false, tiempoMs: 3000 },
        { preguntaId: 'q4', tipo: 'resumen', respuestaSeleccionada: 3, correcta: true, tiempoMs: 4000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza respuestas vacias', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sessionId invalido', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      sessionId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tiempoLecturaMs negativo', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      tiempoLecturaMs: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza respuestaSeleccionada > 3', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        { preguntaId: 'q1', tipo: 'literal', respuestaSeleccionada: 5, correcta: false, tiempoMs: 1000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rechaza tipo de pregunta invalido', () => {
    const result = finalizarSesionLecturaSchema.safeParse({
      ...datosValidos,
      respuestas: [
        { preguntaId: 'q1', tipo: 'inventado', respuestaSeleccionada: 0, correcta: true, tiempoMs: 1000 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
