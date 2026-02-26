import { describe, it, expect } from 'vitest';
import {
  parseSessionMetadata,
  mergeSessionMetadata,
  type SessionMetadata,
} from '../apps/web/src/lib/types/session-metadata';

describe('parseSessionMetadata', () => {
  it('returns empty object for null', () => {
    expect(parseSessionMetadata(null)).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(parseSessionMetadata(undefined)).toEqual({});
  });

  it('returns empty object for non-object primitives', () => {
    expect(parseSessionMetadata(42)).toEqual({});
    expect(parseSessionMetadata(true)).toEqual({});
  });

  it('returns empty object for string input', () => {
    expect(parseSessionMetadata('string')).toEqual({});
    expect(parseSessionMetadata('{"topicSlug":"test"}')).toEqual({});
  });

  it('returns empty object for arrays', () => {
    expect(parseSessionMetadata([1, 2, 3])).toEqual({});
    expect(parseSessionMetadata([])).toEqual({});
  });

  it('returns empty object for empty object', () => {
    expect(parseSessionMetadata({})).toEqual({});
  });

  it('parses valid metadata with all fields', () => {
    const raw = {
      textoId: 'story-abc',
      topicSlug: 'como-funciona-corazon',
      nivelTexto: 2.4,
      comprensionScore: 0.85,
      totalPreguntas: 4,
      aciertos: 3,
      lecturaCompletada: true,
      lecturaCompletadaEn: '2026-02-20T10:00:00Z',
      tiempoLecturaMs: 45000,
      fuenteWpm: 'audio' as const,
      funMode: true,
      fromCache: false,
      audioAnalisis: {
        wpmUtil: 72,
        precisionLectura: 0.88,
        coberturaTexto: 0.75,
        pauseRatio: 0.2,
        qualityScore: 0.82,
        confiable: true,
        motivoNoConfiable: null,
        motor: 'gpt-4o-mini-transcribe',
        tiempoVozActivaMs: 35000,
        totalPalabrasTranscritas: 42,
        totalPalabrasAlineadas: 38,
      },
    };

    const meta = parseSessionMetadata(raw);
    expect(meta.textoId).toBe('story-abc');
    expect(meta.topicSlug).toBe('como-funciona-corazon');
    expect(meta.nivelTexto).toBe(2.4);
    expect(meta.comprensionScore).toBe(0.85);
    expect(meta.totalPreguntas).toBe(4);
    expect(meta.aciertos).toBe(3);
    expect(meta.lecturaCompletada).toBe(true);
    expect(meta.tiempoLecturaMs).toBe(45000);
    expect(meta.fuenteWpm).toBe('audio');
    expect(meta.funMode).toBe(true);
    expect(meta.fromCache).toBe(false);
    expect(meta.audioAnalisis?.wpmUtil).toBe(72);
    expect(meta.audioAnalisis?.confiable).toBe(true);
  });

  it('handles partial metadata correctly', () => {
    const raw = { comprensionScore: 0.5, nivelTexto: 3 };
    const meta = parseSessionMetadata(raw);
    expect(meta.comprensionScore).toBe(0.5);
    expect(meta.nivelTexto).toBe(3);
    expect(meta.topicSlug).toBeUndefined();
    expect(meta.lecturaCompletada).toBeUndefined();
  });
});

describe('mergeSessionMetadata', () => {
  it('merges updates into empty existing metadata', () => {
    const result = mergeSessionMetadata(null, {
      comprensionScore: 0.9,
      topicSlug: 'ecosistemas',
    });
    expect(result.comprensionScore).toBe(0.9);
    expect(result.topicSlug).toBe('ecosistemas');
  });

  it('preserves existing fields while adding new ones', () => {
    const existing = {
      topicSlug: 'como-funciona-corazon',
      nivelTexto: 2,
      funMode: true,
    };
    const result = mergeSessionMetadata(existing, {
      comprensionScore: 0.75,
      lecturaCompletada: true,
    });
    expect(result.topicSlug).toBe('como-funciona-corazon');
    expect(result.nivelTexto).toBe(2);
    expect(result.funMode).toBe(true);
    expect(result.comprensionScore).toBe(0.75);
    expect(result.lecturaCompletada).toBe(true);
  });

  it('overwrites existing fields with updates', () => {
    const existing = {
      comprensionScore: 0.5,
      lecturaCompletada: false,
    };
    const result = mergeSessionMetadata(existing, {
      comprensionScore: 0.85,
      lecturaCompletada: true,
    });
    expect(result.comprensionScore).toBe(0.85);
    expect(result.lecturaCompletada).toBe(true);
  });

  it('handles undefined existing as empty object', () => {
    const result = mergeSessionMetadata(undefined, { topicSlug: 'test' });
    expect(result.topicSlug).toBe('test');
  });

  it('handles non-object existing as empty object', () => {
    const result = mergeSessionMetadata(42, { nivelTexto: 3 });
    expect(result.nivelTexto).toBe(3);
  });

  it('handles array existing as empty object', () => {
    const result = mergeSessionMetadata([1, 2, 3], { nivelTexto: 3 });
    expect(result.nivelTexto).toBe(3);
  });

  it('empty updates returns clone of existing', () => {
    const existing = { topicSlug: 'test', nivelTexto: 2 };
    const result = mergeSessionMetadata(existing, {});
    expect(result).toEqual(existing);
    // Should be a new object, not the same reference
    expect(result).not.toBe(existing);
  });

  it('replaces audioAnalisis entirely on shallow merge (no deep merge)', () => {
    const existing = {
      topicSlug: 'test',
      audioAnalisis: {
        wpmUtil: 60,
        precisionLectura: 0.8,
        coberturaTexto: 0.7,
        pauseRatio: 0.15,
        qualityScore: 0.75,
        confiable: true,
        motivoNoConfiable: null,
        motor: 'gpt-4o-mini-transcribe',
        tiempoVozActivaMs: 20000,
        totalPalabrasTranscritas: 30,
        totalPalabrasAlineadas: 25,
      },
    };
    const newAudioAnalisis = {
      wpmUtil: 90,
      precisionLectura: 0.95,
      coberturaTexto: 0.9,
      pauseRatio: 0.1,
      qualityScore: 0.92,
      confiable: true,
      motivoNoConfiable: null,
      motor: 'gpt-4o-mini-transcribe',
      tiempoVozActivaMs: 25000,
      totalPalabrasTranscritas: 50,
      totalPalabrasAlineadas: 48,
    };
    const result = mergeSessionMetadata(existing, { audioAnalisis: newAudioAnalisis });
    // Shallow merge: audioAnalisis is replaced entirely, not deeply merged
    expect(result.audioAnalisis?.wpmUtil).toBe(90);
    expect(result.audioAnalisis?.totalPalabrasAlineadas).toBe(48);
    // topicSlug preserved
    expect(result.topicSlug).toBe('test');
  });
});

describe('SessionMetadata type narrowing', () => {
  it('provides typed access to optional fields', () => {
    const meta: SessionMetadata = {
      comprensionScore: 0.8,
      nivelTexto: 2,
      audioAnalisis: {
        wpmUtil: 60,
        precisionLectura: 0.9,
        coberturaTexto: 0.7,
        pauseRatio: 0.15,
        qualityScore: 0.85,
        confiable: true,
        motivoNoConfiable: null,
        motor: 'gpt-4o-mini-transcribe',
        tiempoVozActivaMs: 30000,
        totalPalabrasTranscritas: 50,
        totalPalabrasAlineadas: 45,
      },
    };

    // These should compile and work without casts
    const score: number | undefined = meta.comprensionScore;
    const nivel: number | undefined = meta.nivelTexto;
    const wpm: number | undefined = meta.audioAnalisis?.wpmUtil;

    expect(score).toBe(0.8);
    expect(nivel).toBe(2);
    expect(wpm).toBe(60);
  });

  it('allows using parseSessionMetadata output without casts', () => {
    const raw: unknown = { comprensionScore: 0.75, topicSlug: 'test' };
    const meta = parseSessionMetadata(raw);

    // This should compile without `as any` or `as number`
    if (typeof meta.comprensionScore === 'number') {
      const doubled = meta.comprensionScore * 2;
      expect(doubled).toBe(1.5);
    }

    if (meta.topicSlug) {
      const upper = meta.topicSlug.toUpperCase();
      expect(upper).toBe('TEST');
    }
  });
});
