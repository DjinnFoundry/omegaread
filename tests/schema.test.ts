/**
 * Tests de validez de schema.ts.
 *
 * Verifica que todas las tablas y tipos esperados estan exportados.
 * Este test previene regresiones donde tablas se eliminen accidentalmente
 * o relaciones se rompan.
 */
import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// Exports de tablas
// ─────────────────────────────────────────────

describe('Schema: Table exports', () => {
  it('exporta tabla parents', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents).toBeDefined();
  });

  it('exporta tabla students', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students).toBeDefined();
  });

  it('exporta tabla topics', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.topics).toBeDefined();
  });

  it('exporta tabla sessions', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions).toBeDefined();
  });

  it('exporta tabla responses', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.responses).toBeDefined();
  });

  it('exporta tabla achievements', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.achievements).toBeDefined();
  });

  it('exporta tabla skillProgress', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress).toBeDefined();
  });

  it('exporta tabla generatedStories', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories).toBeDefined();
  });

  it('exporta tabla storyQuestions', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions).toBeDefined();
  });

  it('exporta tabla baselineAssessments', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments).toBeDefined();
  });

  it('exporta tabla difficultyAdjustments', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.difficultyAdjustments).toBeDefined();
  });

  it('exporta tabla manualAdjustments', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments).toBeDefined();
  });

  it('exporta tabla eloSnapshots', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Exports de relaciones
// ─────────────────────────────────────────────

describe('Schema: Relation exports', () => {
  it('exporta parentsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parentsRelations).toBeDefined();
  });

  it('exporta studentsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.studentsRelations).toBeDefined();
  });

  it('exporta baselineAssessmentsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessmentsRelations).toBeDefined();
  });

  it('exporta difficultyAdjustmentsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.difficultyAdjustmentsRelations).toBeDefined();
  });

  it('exporta manualAdjustmentsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustmentsRelations).toBeDefined();
  });

  it('exporta generatedStoriesRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStoriesRelations).toBeDefined();
  });

  it('exporta storyQuestionsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestionsRelations).toBeDefined();
  });

  it('exporta sessionsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessionsRelations).toBeDefined();
  });

  it('exporta responsesRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.responsesRelations).toBeDefined();
  });

  it('exporta achievementsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.achievementsRelations).toBeDefined();
  });

  it('exporta skillProgressRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgressRelations).toBeDefined();
  });

  it('exporta eloSnapshotsRelations', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshotsRelations).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// NOTE: Type exports cannot be tested at runtime
// ─────────────────────────────────────────────
// TypeScript types are compile-time constructs and are erased during transpilation.
// To verify type exports, use TypeScript compiler checks or IDE inspection.
// These tests have been removed as they cannot validate type existence at runtime.

// ─────────────────────────────────────────────
// Validez de columnas en tablas principales
// ─────────────────────────────────────────────

describe('Schema: Parents table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.id).toBeDefined();
  });

  it('tiene columna email', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.email).toBeDefined();
  });

  it('tiene columna passwordHash', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.passwordHash).toBeDefined();
  });

  it('tiene columna nombre', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.nombre).toBeDefined();
  });

  it('tiene columna config (JSON)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.config).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.creadoEn).toBeDefined();
  });

  it('tiene columna actualizadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.parents.actualizadoEn).toBeDefined();
  });
});

describe('Schema: Students table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.id).toBeDefined();
  });

  it('tiene columna parentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.parentId).toBeDefined();
  });

  it('tiene columna nombre', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.nombre).toBeDefined();
  });

  it('tiene columna fechaNacimiento', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.fechaNacimiento).toBeDefined();
  });

  it('tiene columnas de ELO (eloGlobal, eloLiteral, etc)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.eloGlobal).toBeDefined();
    expect(schema.students.eloLiteral).toBeDefined();
    expect(schema.students.eloInferencia).toBeDefined();
    expect(schema.students.eloVocabulario).toBeDefined();
    expect(schema.students.eloResumen).toBeDefined();
    expect(schema.students.eloRd).toBeDefined();
  });

  it('tiene columnas de baseline', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.nivelLectura).toBeDefined();
    expect(schema.students.comprensionScore).toBeDefined();
    expect(schema.students.baselineConfianza).toBeDefined();
    expect(schema.students.baselineCompletado).toBeDefined();
  });

  it('tiene columna accesibilidad (JSON)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.accesibilidad).toBeDefined();
  });

  it('tiene columna intereses (JSON array)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.intereses).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.creadoEn).toBeDefined();
  });

  it('tiene columna actualizadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.students.actualizadoEn).toBeDefined();
  });
});

describe('Schema: Sessions table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.studentId).toBeDefined();
  });

  it('tiene columna tipoActividad', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.tipoActividad).toBeDefined();
  });

  it('tiene columna modulo', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.modulo).toBeDefined();
  });

  it('tiene columnas de lecturas (wpmPromedio, wpmPorPagina)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.wpmPromedio).toBeDefined();
    expect(schema.sessions.wpmPorPagina).toBeDefined();
    expect(schema.sessions.totalPaginas).toBeDefined();
  });

  it('tiene columna completada', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.completada).toBeDefined();
  });

  it('tiene columna storyId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.storyId).toBeDefined();
  });

  it('tiene columna iniciadaEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.iniciadaEn).toBeDefined();
  });

  it('tiene columna finalizadaEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.sessions.finalizadaEn).toBeDefined();
  });
});

describe('Schema: GeneratedStories table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.studentId).toBeDefined();
  });

  it('tiene columna topicSlug', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.topicSlug).toBeDefined();
  });

  it('tiene columna titulo', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.titulo).toBeDefined();
  });

  it('tiene columna contenido', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.contenido).toBeDefined();
  });

  it('tiene columna nivel', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.nivel).toBeDefined();
  });

  it('tiene columna metadata (JSON)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.metadata).toBeDefined();
  });

  it('tiene columna aprobadaQA', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.aprobadaQA).toBeDefined();
  });

  it('tiene columna reutilizable', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.reutilizable).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.generatedStories.creadoEn).toBeDefined();
  });
});

describe('Schema: StoryQuestions table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.id).toBeDefined();
  });

  it('tiene columna storyId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.storyId).toBeDefined();
  });

  it('tiene columna tipo', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.tipo).toBeDefined();
  });

  it('tiene columna pregunta', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.pregunta).toBeDefined();
  });

  it('tiene columna opciones (JSON array)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.opciones).toBeDefined();
  });

  it('tiene columna respuestaCorrecta', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.respuestaCorrecta).toBeDefined();
  });

  it('tiene columna explicacion', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.storyQuestions.explicacion).toBeDefined();
  });
});

describe('Schema: BaselineAssessments table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments.studentId).toBeDefined();
  });

  it('tiene columna nivelTexto', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments.nivelTexto).toBeDefined();
  });

  it('tiene columna respuestas (JSON array)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments.respuestas).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.baselineAssessments.creadoEn).toBeDefined();
  });
});

describe('Schema: SkillProgress table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.studentId).toBeDefined();
  });

  it('tiene columna skillId', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.skillId).toBeDefined();
  });

  it('tiene columna categoria', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.categoria).toBeDefined();
  });

  it('tiene columna nivelMastery', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.nivelMastery).toBeDefined();
  });

  it('tiene columna dominada', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.dominada).toBeDefined();
  });

  it('tiene columna ultimaPractica', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.ultimaPractica).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.creadoEn).toBeDefined();
  });

  it('tiene columna actualizadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.skillProgress.actualizadoEn).toBeDefined();
  });
});

describe('Schema: ManualAdjustments table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.studentId).toBeDefined();
  });

  it('tiene columna sessionId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.sessionId).toBeDefined();
  });

  it('tiene columna storyId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.storyId).toBeDefined();
  });

  it('tiene columna tipo', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.tipo).toBeDefined();
  });

  it('tiene columnas de nivel (nivelAntes, nivelDespues)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.nivelAntes).toBeDefined();
    expect(schema.manualAdjustments.nivelDespues).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.manualAdjustments.creadoEn).toBeDefined();
  });
});

describe('Schema: EloSnapshots table columns', () => {
  it('tiene columna id', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots.id).toBeDefined();
  });

  it('tiene columna studentId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots.studentId).toBeDefined();
  });

  it('tiene columna sessionId (FK)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots.sessionId).toBeDefined();
  });

  it('tiene columnas de ELO (eloGlobal, eloLiteral, etc)', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots.eloGlobal).toBeDefined();
    expect(schema.eloSnapshots.eloLiteral).toBeDefined();
    expect(schema.eloSnapshots.eloInferencia).toBeDefined();
    expect(schema.eloSnapshots.eloVocabulario).toBeDefined();
    expect(schema.eloSnapshots.eloResumen).toBeDefined();
    expect(schema.eloSnapshots.rdGlobal).toBeDefined();
  });

  it('tiene columna creadoEn', async () => {
    const schema = await import('@omegaread/db/schema');
    expect(schema.eloSnapshots.creadoEn).toBeDefined();
  });
});
