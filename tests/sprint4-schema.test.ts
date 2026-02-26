/**
 * Tests para el schema de DB de Sprint 4.
 * Verifica que manualAdjustments y tipos actualizados existen.
 */
import { describe, it, expect } from 'vitest';
import {
  manualAdjustments,
  difficultyAdjustments,
  sessions,
  students,
  generatedStories,
} from '@zetaread/db';
import type { DifficultyEvidence } from '@zetaread/db';

describe('manualAdjustments table', () => {
  it('tabla esta exportada', () => {
    expect(manualAdjustments).toBeDefined();
  });

  it('tiene columna studentId', () => {
    expect(manualAdjustments.studentId).toBeDefined();
  });

  it('tiene columna sessionId', () => {
    expect(manualAdjustments.sessionId).toBeDefined();
  });

  it('tiene columna storyId', () => {
    expect(manualAdjustments.storyId).toBeDefined();
  });

  it('tiene columna tipo', () => {
    expect(manualAdjustments.tipo).toBeDefined();
  });

  it('tiene columna nivelAntes', () => {
    expect(manualAdjustments.nivelAntes).toBeDefined();
  });

  it('tiene columna nivelDespues', () => {
    expect(manualAdjustments.nivelDespues).toBeDefined();
  });

  it('tiene columna tiempoLecturaAntesDePulsar', () => {
    expect(manualAdjustments.tiempoLecturaAntesDePulsar).toBeDefined();
  });

  it('tiene columna rewrittenStoryId', () => {
    expect(manualAdjustments.rewrittenStoryId).toBeDefined();
  });
});

describe('DifficultyEvidence type', () => {
  it('acepta campos de ajuste manual', () => {
    const evidencia: DifficultyEvidence = {
      comprensionScore: 0.75,
      ritmoNormalizado: 0.9,
      estabilidad: 0.8,
      sessionScore: 0.82,
      ajusteManual: 'mas_facil',
      modificadorManual: -0.10,
    };
    expect(evidencia.ajusteManual).toBe('mas_facil');
    expect(evidencia.modificadorManual).toBe(-0.10);
  });

  it('acepta evidencia sin ajuste manual (backwards compat)', () => {
    const evidencia: DifficultyEvidence = {
      comprensionScore: 0.85,
      ritmoNormalizado: 0.9,
      estabilidad: 0.7,
      sessionScore: 0.85,
    };
    expect(evidencia.ajusteManual).toBeUndefined();
    expect(evidencia.modificadorManual).toBeUndefined();
  });

  it('acepta ajusteManual null', () => {
    const evidencia: DifficultyEvidence = {
      ajusteManual: null,
    };
    expect(evidencia.ajusteManual).toBeNull();
  });
});

describe('tablas existentes siguen intactas', () => {
  it('difficultyAdjustments sigue exportada', () => {
    expect(difficultyAdjustments).toBeDefined();
    expect(difficultyAdjustments.evidencia).toBeDefined();
  });

  it('sessions sigue exportada con storyId', () => {
    expect(sessions).toBeDefined();
    expect(sessions.storyId).toBeDefined();
  });

  it('students sigue exportada', () => {
    expect(students).toBeDefined();
    expect(students.nivelLectura).toBeDefined();
  });

  it('generatedStories sigue exportada', () => {
    expect(generatedStories).toBeDefined();
    expect(generatedStories.contenido).toBeDefined();
  });
});
