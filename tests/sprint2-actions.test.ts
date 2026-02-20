/**
 * Tests para server actions de Sprint 2.
 * Verifica que las funciones existen y estan exportadas correctamente.
 * (Integration tests requerirían DB y API key, se testean por estructura.)
 */
import { describe, it, expect } from 'vitest';
import { generarHistoria, finalizarSesionLectura } from '@/server/actions/story-actions';
import { hasOpenAIKey, OpenAIKeyMissingError } from '@/lib/ai/openai';
import { generateStory } from '@/lib/ai/story-generator';

describe('story-actions exports', () => {
  it('generarHistoria esta exportada como funcion', () => {
    expect(typeof generarHistoria).toBe('function');
  });

  it('finalizarSesionLectura esta exportada como funcion', () => {
    expect(typeof finalizarSesionLectura).toBe('function');
  });
});

describe('openai module', () => {
  it('hasOpenAIKey devuelve boolean', () => {
    const result = hasOpenAIKey();
    expect(typeof result).toBe('boolean');
  });

  it('OpenAIKeyMissingError es un Error', () => {
    const err = new OpenAIKeyMissingError();
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe('OpenAIKeyMissingError');
    expect(err.message).toContain('OPENAI_API_KEY');
  });
});

describe('story-generator exports', () => {
  it('generateStory esta exportada como funcion', () => {
    expect(typeof generateStory).toBe('function');
  });
});
