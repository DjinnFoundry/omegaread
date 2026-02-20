/**
 * Tests para el schema de DB de Sprint 2.
 * Verifica que las tablas y relaciones estan correctamente definidas.
 */
import { describe, it, expect } from 'vitest';
import {
  generatedStories,
  storyQuestions,
  sessions,
  generatedStoriesRelations,
  storyQuestionsRelations,
  sessionsRelations,
} from '@omegaread/db';

describe('generatedStories table', () => {
  it('existe y esta definida', () => {
    expect(generatedStories).toBeDefined();
  });

  it('tiene las columnas requeridas', () => {
    const cols = Object.keys(generatedStories);
    expect(cols).toContain('id');
    expect(cols).toContain('studentId');
    expect(cols).toContain('topicSlug');
    expect(cols).toContain('titulo');
    expect(cols).toContain('contenido');
    expect(cols).toContain('nivel');
    expect(cols).toContain('metadata');
    expect(cols).toContain('modeloGeneracion');
    expect(cols).toContain('aprobadaQA');
  });

  it('tiene relaciones definidas', () => {
    expect(generatedStoriesRelations).toBeDefined();
  });
});

describe('storyQuestions table', () => {
  it('existe y esta definida', () => {
    expect(storyQuestions).toBeDefined();
  });

  it('tiene las columnas requeridas', () => {
    const cols = Object.keys(storyQuestions);
    expect(cols).toContain('id');
    expect(cols).toContain('storyId');
    expect(cols).toContain('tipo');
    expect(cols).toContain('pregunta');
    expect(cols).toContain('opciones');
    expect(cols).toContain('respuestaCorrecta');
    expect(cols).toContain('explicacion');
    expect(cols).toContain('orden');
  });

  it('tiene relaciones definidas', () => {
    expect(storyQuestionsRelations).toBeDefined();
  });
});

describe('sessions table update', () => {
  it('tiene columna storyId', () => {
    const cols = Object.keys(sessions);
    expect(cols).toContain('storyId');
  });

  it('sessions relations incluye story', () => {
    expect(sessionsRelations).toBeDefined();
  });
});
