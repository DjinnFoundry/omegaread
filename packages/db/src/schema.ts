/**
 * Schema de base de datos para OmegaRead (SQLite / Cloudflare D1)
 * Modelo de datos para lectura adaptativa.
 *
 * Tablas: padres, estudiantes, topics, sesiones, respuestas,
 *         logros, progreso de habilidades, baseline, ajustes de dificultad
 */
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// Helper: UUID default via crypto.randomUUID()
const uuidPk = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const uuidCol = (name: string) =>
  text(name).$defaultFn(() => crypto.randomUUID());

// Helper: timestamp as integer (unix seconds)
const createdAt = (name = 'creado_en') =>
  integer(name, { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

// ─────────────────────────────────────────────
// PADRES (autenticacion y gestion)
// ─────────────────────────────────────────────

export const parents = sqliteTable('parents', {
  id: uuidPk(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nombre: text('nombre').notNull(),
  idioma: text('idioma').notNull().default('es-ES'),
  config: text('config', { mode: 'json' }).$type<ParentConfig>().default({}),
  creadoEn: createdAt(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const parentsRelations = relations(parents, ({ many }) => ({
  students: many(students),
}));

// ─────────────────────────────────────────────
// ESTUDIANTES (los ninos)
// ─────────────────────────────────────────────

export const students = sqliteTable('students', {
  id: uuidPk(),
  parentId: text('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  fechaNacimiento: integer('fecha_nacimiento', { mode: 'timestamp' }).notNull(),
  idioma: text('idioma').notNull().default('es-ES'),
  dialecto: text('dialecto').notNull().default('es-ES'),
  curso: text('curso'),
  centroEscolar: text('centro_escolar'),
  rutinaLectura: text('rutina_lectura'),
  acompanamiento: text('acompanamiento'),
  senalesDificultad: text('senales_dificultad', { mode: 'json' })
    .$type<SenalesDificultad>()
    .default({}),
  intereses: text('intereses', { mode: 'json' }).$type<string[]>().default([]),
  temasEvitar: text('temas_evitar', { mode: 'json' })
    .$type<string[]>()
    .default([]),
  personajesFavoritos: text('personajes_favoritos'),
  contextoPersonal: text('contexto_personal'),
  nivelLectura: real('nivel_lectura'),
  comprensionScore: real('comprension_score'),
  baselineConfianza: text('baseline_confianza'),
  baselineCompletado: integer('baseline_completado', { mode: 'boolean' })
    .notNull()
    .default(false),
  perfilCompleto: integer('perfil_completo', { mode: 'boolean' })
    .notNull()
    .default(false),
  eloGlobal: real('elo_global').notNull().default(1000),
  eloLiteral: real('elo_literal').notNull().default(1000),
  eloInferencia: real('elo_inferencia').notNull().default(1000),
  eloVocabulario: real('elo_vocabulario').notNull().default(1000),
  eloResumen: real('elo_resumen').notNull().default(1000),
  eloRd: real('elo_rd').notNull().default(350),
  accesibilidad: text('accesibilidad', { mode: 'json' })
    .$type<AccesibilidadConfig>()
    .default({}),
  creadoEn: createdAt(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const studentsRelations = relations(students, ({ one, many }) => ({
  parent: one(parents, {
    fields: [students.parentId],
    references: [parents.id],
  }),
  sessions: many(sessions),
  generatedStories: many(generatedStories),
  achievements: many(achievements),
  skillProgress: many(skillProgress),
  baselineAssessments: many(baselineAssessments),
  manualAdjustments: many(manualAdjustments),
  eloSnapshots: many(eloSnapshots),
}));

// ─────────────────────────────────────────────
// TOPICS (taxonomia de intereses)
// ─────────────────────────────────────────────

export const topics = sqliteTable(
  'topics',
  {
    id: uuidPk(),
    slug: text('slug').notNull().unique(),
    nombre: text('nombre').notNull(),
    emoji: text('emoji').notNull(),
    descripcion: text('descripcion').notNull(),
    categoria: text('categoria').notNull().default('general'),
    edadMinima: integer('edad_minima').notNull().default(5),
    edadMaxima: integer('edad_maxima').notNull().default(9),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
    orden: integer('orden').notNull().default(0),
    creadoEn: createdAt(),
  },
  (table) => [
    index('topics_slug_idx').on(table.slug),
    index('topics_activo_idx').on(table.activo),
    index('topics_categoria_idx').on(table.categoria),
  ],
);

// ─────────────────────────────────────────────
// BASELINE ASSESSMENTS (test de nivel inicial)
// ─────────────────────────────────────────────

export const baselineAssessments = sqliteTable(
  'baseline_assessments',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    nivelTexto: integer('nivel_texto').notNull(),
    textoId: text('texto_id').notNull(),
    totalPreguntas: integer('total_preguntas').notNull(),
    aciertos: integer('aciertos').notNull(),
    aciertosPorTipo: text('aciertos_por_tipo', { mode: 'json' })
      .$type<Record<string, number>>()
      .default({}),
    tiempoLecturaMs: integer('tiempo_lectura_ms'),
    respuestas: text('respuestas', { mode: 'json' })
      .$type<BaselineRespuesta[]>()
      .default([]),
    creadoEn: createdAt(),
  },
  (table) => [index('baseline_student_idx').on(table.studentId)],
);

export const baselineAssessmentsRelations = relations(
  baselineAssessments,
  ({ one }) => ({
    student: one(students, {
      fields: [baselineAssessments.studentId],
      references: [students.id],
    }),
  }),
);

// ─────────────────────────────────────────────
// AJUSTES DE DIFICULTAD (trazabilidad)
// ─────────────────────────────────────────────

export const difficultyAdjustments = sqliteTable(
  'difficulty_adjustments',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    nivelAnterior: real('nivel_anterior').notNull(),
    nivelNuevo: real('nivel_nuevo').notNull(),
    direccion: text('direccion').notNull(),
    razon: text('razon').notNull(),
    evidencia: text('evidencia', { mode: 'json' })
      .$type<DifficultyEvidence>()
      .default({}),
    creadoEn: createdAt(),
  },
  (table) => [
    index('difficulty_student_idx').on(table.studentId),
    index('difficulty_session_idx').on(table.sessionId),
  ],
);

export const difficultyAdjustmentsRelations = relations(
  difficultyAdjustments,
  ({ one }) => ({
    student: one(students, {
      fields: [difficultyAdjustments.studentId],
      references: [students.id],
    }),
    session: one(sessions, {
      fields: [difficultyAdjustments.sessionId],
      references: [sessions.id],
    }),
  }),
);

// ─────────────────────────────────────────────
// AJUSTES MANUALES (Sprint 4: reescritura en sesion)
// ─────────────────────────────────────────────

export const manualAdjustments = sqliteTable(
  'manual_adjustments',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    storyId: text('story_id')
      .notNull()
      .references(() => generatedStories.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    nivelAntes: real('nivel_antes').notNull(),
    nivelDespues: real('nivel_despues').notNull(),
    tiempoLecturaAntesDePulsar: integer('tiempo_lectura_antes_ms').notNull(),
    rewrittenStoryId: text('rewritten_story_id').references(
      () => generatedStories.id,
      { onDelete: 'set null' },
    ),
    creadoEn: createdAt(),
  },
  (table) => [
    index('manual_adj_student_idx').on(table.studentId),
    index('manual_adj_session_idx').on(table.sessionId),
  ],
);

export const manualAdjustmentsRelations = relations(
  manualAdjustments,
  ({ one }) => ({
    student: one(students, {
      fields: [manualAdjustments.studentId],
      references: [students.id],
    }),
    session: one(sessions, {
      fields: [manualAdjustments.sessionId],
      references: [sessions.id],
    }),
    story: one(generatedStories, {
      fields: [manualAdjustments.storyId],
      references: [generatedStories.id],
    }),
  }),
);

// ─────────────────────────────────────────────
// HISTORIAS GENERADAS (LLM)
// ─────────────────────────────────────────────

export const generatedStories = sqliteTable(
  'generated_stories',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    topicSlug: text('topic_slug').notNull(),
    titulo: text('titulo').notNull(),
    contenido: text('contenido').notNull(),
    nivel: real('nivel').notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<StoryMetadata>()
      .notNull(),
    modeloGeneracion: text('modelo_generacion').notNull(),
    promptVersion: text('prompt_version').notNull().default('v1'),
    aprobadaQA: integer('aprobada_qa', { mode: 'boolean' })
      .notNull()
      .default(false),
    motivoRechazo: text('motivo_rechazo'),
    reutilizable: integer('reutilizable', { mode: 'boolean' })
      .notNull()
      .default(true),
    creadoEn: createdAt(),
  },
  (table) => [
    index('stories_student_idx').on(table.studentId),
    index('stories_topic_idx').on(table.topicSlug),
    index('stories_cache_idx').on(
      table.studentId,
      table.topicSlug,
      table.nivel,
      table.reutilizable,
    ),
  ],
);

export const generatedStoriesRelations = relations(
  generatedStories,
  ({ one, many }) => ({
    student: one(students, {
      fields: [generatedStories.studentId],
      references: [students.id],
    }),
    questions: many(storyQuestions),
  }),
);

// ─────────────────────────────────────────────
// PREGUNTAS DE HISTORIA (generadas con la historia)
// ─────────────────────────────────────────────

export const storyQuestions = sqliteTable(
  'story_questions',
  {
    id: uuidPk(),
    storyId: text('story_id')
      .notNull()
      .references(() => generatedStories.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    pregunta: text('pregunta').notNull(),
    opciones: text('opciones', { mode: 'json' }).$type<string[]>().notNull(),
    respuestaCorrecta: integer('respuesta_correcta').notNull(),
    explicacion: text('explicacion').notNull(),
    dificultad: integer('dificultad').notNull().default(3),
    orden: integer('orden').notNull().default(0),
    creadoEn: createdAt(),
  },
  (table) => [index('questions_story_idx').on(table.storyId)],
);

export const storyQuestionsRelations = relations(storyQuestions, ({ one }) => ({
  story: one(generatedStories, {
    fields: [storyQuestions.storyId],
    references: [generatedStories.id],
  }),
}));

// ─────────────────────────────────────────────
// SESIONES (cada vez que el nino lee)
// ─────────────────────────────────────────────

export const sessions = sqliteTable(
  'sessions',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    tipoActividad: text('tipo_actividad').notNull(),
    modulo: text('modulo').notNull(),
    duracionSegundos: integer('duracion_segundos'),
    completada: integer('completada', { mode: 'boolean' })
      .notNull()
      .default(false),
    estrellasGanadas: integer('estrellas_ganadas').notNull().default(0),
    stickerGanado: text('sticker_ganado'),
    storyId: text('story_id').references(() => generatedStories.id, {
      onDelete: 'set null',
    }),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({}),
    wpmPromedio: real('wpm_promedio'),
    wpmPorPagina: text('wpm_por_pagina', { mode: 'json' }).$type<
      Array<{ pagina: number; wpm: number }>
    >(),
    totalPaginas: integer('total_paginas'),
    iniciadaEn: integer('iniciada_en', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    finalizadaEn: integer('finalizada_en', { mode: 'timestamp' }),
  },
  (table) => [
    index('sessions_student_idx').on(table.studentId),
    index('sessions_fecha_idx').on(table.iniciadaEn),
  ],
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  student: one(students, {
    fields: [sessions.studentId],
    references: [students.id],
  }),
  story: one(generatedStories, {
    fields: [sessions.storyId],
    references: [generatedStories.id],
  }),
  responses: many(responses),
  difficultyAdjustments: many(difficultyAdjustments),
  manualAdjustments: many(manualAdjustments),
}));

// ─────────────────────────────────────────────
// RESPUESTAS (cada interaccion dentro de sesion)
// ─────────────────────────────────────────────

export const responses = sqliteTable(
  'responses',
  {
    id: uuidPk(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    ejercicioId: text('ejercicio_id').notNull(),
    tipoEjercicio: text('tipo_ejercicio').notNull(),
    pregunta: text('pregunta').notNull(),
    respuesta: text('respuesta').notNull(),
    respuestaCorrecta: text('respuesta_correcta').notNull(),
    correcta: integer('correcta', { mode: 'boolean' }).notNull(),
    tiempoRespuestaMs: integer('tiempo_respuesta_ms'),
    intentoNumero: integer('intento_numero').notNull().default(1),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({}),
    creadaEn: createdAt('creada_en'),
  },
  (table) => [index('responses_session_idx').on(table.sessionId)],
);

export const responsesRelations = relations(responses, ({ one }) => ({
  session: one(sessions, {
    fields: [responses.sessionId],
    references: [sessions.id],
  }),
}));

// ─────────────────────────────────────────────
// LOGROS (stickers, medallas, etc.)
// ─────────────────────────────────────────────

export const achievements = sqliteTable(
  'achievements',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    logroId: text('logro_id').notNull(),
    nombre: text('nombre').notNull(),
    icono: text('icono'),
    descripcion: text('descripcion'),
    coleccion: text('coleccion'),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({}),
    ganadoEn: integer('ganado_en', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('achievements_student_idx').on(table.studentId)],
);

export const achievementsRelations = relations(achievements, ({ one }) => ({
  student: one(students, {
    fields: [achievements.studentId],
    references: [students.id],
  }),
}));

// ─────────────────────────────────────────────
// PROGRESO DE HABILIDADES
// ─────────────────────────────────────────────

export const skillProgress = sqliteTable(
  'skill_progress',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    categoria: text('categoria').notNull(),
    nivelMastery: real('nivel_mastery').notNull().default(0),
    totalIntentos: integer('total_intentos').notNull().default(0),
    totalAciertos: integer('total_aciertos').notNull().default(0),
    dominada: integer('dominada', { mode: 'boolean' }).notNull().default(false),
    ultimaPractica: integer('ultima_practica', { mode: 'timestamp' }),
    proximaRevision: integer('proxima_revision', { mode: 'timestamp' }),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default({}),
    creadoEn: createdAt(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('skill_student_idx').on(table.studentId),
    index('skill_id_idx').on(table.studentId, table.skillId),
  ],
);

export const skillProgressRelations = relations(skillProgress, ({ one }) => ({
  student: one(students, {
    fields: [skillProgress.studentId],
    references: [students.id],
  }),
}));

// ─────────────────────────────────────────────
// ELO SNAPSHOTS (evolucion por sesion)
// ─────────────────────────────────────────────

export const eloSnapshots = sqliteTable(
  'elo_snapshots',
  {
    id: uuidPk(),
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    eloGlobal: real('elo_global').notNull(),
    eloLiteral: real('elo_literal').notNull(),
    eloInferencia: real('elo_inferencia').notNull(),
    eloVocabulario: real('elo_vocabulario').notNull(),
    eloResumen: real('elo_resumen').notNull(),
    rdGlobal: real('rd_global').notNull().default(350),
    wpmPromedio: real('wpm_promedio'),
    creadoEn: createdAt(),
  },
  (table) => [
    index('elo_snapshots_student_idx').on(table.studentId),
    index('elo_snapshots_created_idx').on(table.creadoEn),
  ],
);

export const eloSnapshotsRelations = relations(eloSnapshots, ({ one }) => ({
  student: one(students, {
    fields: [eloSnapshots.studentId],
    references: [students.id],
  }),
  session: one(sessions, {
    fields: [eloSnapshots.sessionId],
    references: [sessions.id],
  }),
}));

// ─────────────────────────────────────────────
// TIPOS auxiliares
// ─────────────────────────────────────────────

export type ParentConfig = {
  notificaciones?: boolean;
  horaInicio?: string;
  horaFin?: string;
  minutosMaxDia?: number;
};

export type AccesibilidadConfig = {
  fuenteDislexia?: boolean;
  modoTDAH?: boolean;
  altoContraste?: boolean;
  duracionSesionMin?: number;
};

export type SenalesDificultad = {
  atencion?: boolean;
  vocabulario?: boolean;
  frustracion?: boolean;
  otroDetalle?: string;
};

export type BaselineRespuesta = {
  preguntaId: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  respuesta: string;
  correcta: boolean;
  tiempoMs?: number;
};

export type DifficultyEvidence = {
  comprensionScore?: number;
  ritmoNormalizado?: number;
  estabilidad?: number;
  sessionScore?: number;
  totalPreguntas?: number;
  totalAciertos?: number;
  ajusteManual?: 'mas_facil' | 'mas_desafiante' | null;
  modificadorManual?: number;
};

export type StoryMetadata = {
  longitudPalabras: number;
  longitudOracionMedia: number;
  vocabularioNuevo: string[];
  edadObjetivo: number;
  tiempoEsperadoMs: number;
};
