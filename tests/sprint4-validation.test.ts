/**
 * Tests para schemas de validacion de Sprint 4.
 * Reescritura en sesion + ajuste manual.
 */
import { describe, it, expect } from 'vitest';
import {
  reescribirHistoriaSchema,
  registrarAjusteManualSchema,
} from '@/server/validation';

const UUID_VALIDO_1 = '550e8400-e29b-41d4-a716-446655440000';
const UUID_VALIDO_2 = '550e8400-e29b-41d4-a716-446655440001';
const UUID_VALIDO_3 = '550e8400-e29b-41d4-a716-446655440002';

// ─── Tests: reescribirHistoriaSchema ───

describe('reescribirHistoriaSchema', () => {
  const datosValidos = {
    sessionId: UUID_VALIDO_1,
    studentId: UUID_VALIDO_2,
    storyId: UUID_VALIDO_3,
    direccion: 'mas_facil' as const,
    tiempoLecturaAntesDePulsar: 15000,
  };

  it('acepta datos validos con mas_facil', () => {
    const result = reescribirHistoriaSchema.safeParse(datosValidos);
    expect(result.success).toBe(true);
  });

  it('acepta datos validos con mas_desafiante', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      direccion: 'mas_desafiante',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza direccion invalida', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      direccion: 'medio',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza sessionId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      sessionId: 'no-es-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza studentId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      studentId: 'invalido',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza storyId invalido', () => {
    const result = reescribirHistoriaSchema.safeParse({
      ...datosValidos,
      storyId: 123,
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

  it('rechaza sin campos obligatorios', () => {
    const result = reescribirHistoriaSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── Tests: registrarAjusteManualSchema ───

describe('registrarAjusteManualSchema', () => {
  const datosValidos = {
    studentId: UUID_VALIDO_1,
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
      tipo: 'mantener',
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

  it('rechaza nivelDespues > 10', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelDespues: 11,
    });
    expect(result.success).toBe(false);
  });

  it('acepta niveles decimales', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      nivelAntes: 2.5,
      nivelDespues: 1.5,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza studentId invalido', () => {
    const result = registrarAjusteManualSchema.safeParse({
      ...datosValidos,
      studentId: 'no-uuid',
    });
    expect(result.success).toBe(false);
  });
});
