/**
 * Tests for question DTO mapper.
 * Verifies that answer shuffling works correctly and is deterministic.
 */
import { describe, it, expect } from 'vitest';
import { mapPreguntaToDTO } from '@/lib/questions/mapper';

const BASE_QUESTION = {
  id: 'q-test-123',
  tipo: 'literal',
  pregunta: 'Donde vivia Luna?',
  opciones: ['Opcion A', 'Opcion B', 'Opcion C', 'Opcion D'],
  respuestaCorrecta: 0,
  explicacion: 'Porque si.',
};

describe('mapPreguntaToDTO', () => {
  it('returns all required fields', () => {
    const dto = mapPreguntaToDTO(BASE_QUESTION);
    expect(dto).toHaveProperty('id', 'q-test-123');
    expect(dto).toHaveProperty('tipo', 'literal');
    expect(dto).toHaveProperty('pregunta', 'Donde vivia Luna?');
    expect(dto).toHaveProperty('explicacion', 'Porque si.');
    expect(dto.opciones).toHaveLength(4);
    expect(typeof dto.respuestaCorrecta).toBe('number');
  });

  it('preserves the correct answer after shuffling', () => {
    const dto = mapPreguntaToDTO(BASE_QUESTION);
    // The correct answer text should be at the new index
    expect(dto.opciones[dto.respuestaCorrecta]).toBe('Opcion A');
  });

  it('preserves correct answer with different initial positions', () => {
    for (let correctIdx = 0; correctIdx < 4; correctIdx++) {
      const q = { ...BASE_QUESTION, id: `q-pos-${correctIdx}`, respuestaCorrecta: correctIdx };
      const dto = mapPreguntaToDTO(q);
      expect(dto.opciones[dto.respuestaCorrecta]).toBe(q.opciones[correctIdx]);
    }
  });

  it('produces deterministic output for same question ID', () => {
    const dto1 = mapPreguntaToDTO(BASE_QUESTION);
    const dto2 = mapPreguntaToDTO(BASE_QUESTION);
    expect(dto1.opciones).toEqual(dto2.opciones);
    expect(dto1.respuestaCorrecta).toBe(dto2.respuestaCorrecta);
  });

  it('produces different shuffles for different question IDs', () => {
    const q1 = mapPreguntaToDTO({ ...BASE_QUESTION, id: 'q-alpha' });
    const q2 = mapPreguntaToDTO({ ...BASE_QUESTION, id: 'q-beta' });
    const q3 = mapPreguntaToDTO({ ...BASE_QUESTION, id: 'q-gamma' });

    // At least one should differ (extremely unlikely all 3 produce same shuffle)
    const allSame = (
      JSON.stringify(q1.opciones) === JSON.stringify(q2.opciones) &&
      JSON.stringify(q2.opciones) === JSON.stringify(q3.opciones)
    );
    expect(allSame).toBe(false);
  });

  it('all original options are present after shuffling', () => {
    const dto = mapPreguntaToDTO(BASE_QUESTION);
    expect(dto.opciones.sort()).toEqual([...BASE_QUESTION.opciones].sort());
  });

  it('respuestaCorrecta is within valid range 0-3', () => {
    // Test with many different IDs
    for (let i = 0; i < 20; i++) {
      const dto = mapPreguntaToDTO({ ...BASE_QUESTION, id: `q-range-${i}` });
      expect(dto.respuestaCorrecta).toBeGreaterThanOrEqual(0);
      expect(dto.respuestaCorrecta).toBeLessThanOrEqual(3);
    }
  });

  it('handles null explicacion', () => {
    const dto = mapPreguntaToDTO({ ...BASE_QUESTION, explicacion: null });
    expect(dto.explicacion).toBeNull();
  });

  it('distributes correct answer across positions', () => {
    // Generate many questions and check that correct answer position varies
    const positions = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const dto = mapPreguntaToDTO({ ...BASE_QUESTION, id: `q-dist-${i}` });
      positions.add(dto.respuestaCorrecta);
    }
    // Should hit at least 3 of the 4 positions
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });
});
