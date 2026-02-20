/**
 * Schema de base de datos para OmegaRead
 * Modelo de datos para lectura adaptativa.
 *
 * Tablas: padres, estudiantes, topics, sesiones, respuestas,
 *         logros, progreso de habilidades, baseline, ajustes de dificultad
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  uuid,
  jsonb,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// PADRES (autenticacion y gestion)
// ─────────────────────────────────────────────

export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es-ES'),
  config: jsonb('config').$type<ParentConfig>().default({}),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const parentsRelations = relations(parents, ({ many }) => ({
  students: many(students),
}));

// ─────────────────────────────────────────────
// ESTUDIANTES (los ninos)
// ─────────────────────────────────────────────

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  fechaNacimiento: timestamp('fecha_nacimiento', { mode: 'date' }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es-ES'),
  dialecto: varchar('dialecto', { length: 10 }).notNull().default('es-ES'),
  /** Curso escolar: "1o Primaria", "2o Primaria", etc. */
  curso: varchar('curso', { length: 30 }),
  /** Centro escolar (opcional) */
  centroEscolar: varchar('centro_escolar', { length: 200 }),
  /** Rutina de lectura: diaria, varias-por-semana, ocasional, rara-vez */
  rutinaLectura: varchar('rutina_lectura', { length: 30 }),
  /** Acompanamiento en casa: siempre, a-veces, nunca */
  acompanamiento: varchar('acompanamiento', { length: 20 }),
  /** Senales de dificultad reportadas por el padre */
  senalesDificultad: jsonb('senales_dificultad').$type<SenalesDificultad>().default({}),
  /** Intereses del nino (IDs de topics) */
  intereses: jsonb('intereses').$type<string[]>().default([]),
  /** Topics que el nino quiere evitar */
  temasEvitar: jsonb('temas_evitar').$type<string[]>().default([]),
  /** Personajes favoritos (texto libre del padre) */
  personajesFavoritos: text('personajes_favoritos'),
  /** Nivel de lectura actual (numerico, 1-10) */
  nivelLectura: real('nivel_lectura'),
  /** Score de comprension del baseline (0-1) */
  comprensionScore: real('comprension_score'),
  /** Confianza del baseline: alto, medio, bajo */
  baselineConfianza: varchar('baseline_confianza', { length: 10 }),
  /** Si completo el test de baseline */
  baselineCompletado: boolean('baseline_completado').notNull().default(false),
  /** Si el padre completo el perfil con contexto e intereses */
  perfilCompleto: boolean('perfil_completo').notNull().default(false),
  /** Configuracion de accesibilidad */
  accesibilidad: jsonb('accesibilidad').$type<AccesibilidadConfig>().default({}),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
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
}));

// ─────────────────────────────────────────────
// TOPICS (taxonomia de intereses)
// ─────────────────────────────────────────────

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    emoji: varchar('emoji', { length: 10 }).notNull(),
    descripcion: text('descripcion').notNull(),
    edadMinima: integer('edad_minima').notNull().default(5),
    edadMaxima: integer('edad_maxima').notNull().default(9),
    activo: boolean('activo').notNull().default(true),
    orden: integer('orden').notNull().default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('topics_slug_idx').on(table.slug),
    index('topics_activo_idx').on(table.activo),
  ]
);

// ─────────────────────────────────────────────
// BASELINE ASSESSMENTS (test de nivel inicial)
// ─────────────────────────────────────────────

export const baselineAssessments = pgTable(
  'baseline_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    /** Nivel del texto presentado (1=facil, 4=dificil) */
    nivelTexto: integer('nivel_texto').notNull(),
    /** Identificador del texto usado */
    textoId: varchar('texto_id', { length: 50 }).notNull(),
    totalPreguntas: integer('total_preguntas').notNull(),
    aciertos: integer('aciertos').notNull(),
    /** Aciertos por tipo de pregunta */
    aciertosPorTipo: jsonb('aciertos_por_tipo').$type<Record<string, number>>().default({}),
    /** Tiempo que tardo en leer el texto (ms) */
    tiempoLecturaMs: integer('tiempo_lectura_ms'),
    /** Respuestas detalladas */
    respuestas: jsonb('respuestas').$type<BaselineRespuesta[]>().default([]),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('baseline_student_idx').on(table.studentId),
  ]
);

export const baselineAssessmentsRelations = relations(baselineAssessments, ({ one }) => ({
  student: one(students, {
    fields: [baselineAssessments.studentId],
    references: [students.id],
  }),
}));

// ─────────────────────────────────────────────
// AJUSTES DE DIFICULTAD (trazabilidad)
// ─────────────────────────────────────────────

export const difficultyAdjustments = pgTable(
  'difficulty_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'set null' }),
    /** Nivel anterior */
    nivelAnterior: real('nivel_anterior').notNull(),
    /** Nivel nuevo */
    nivelNuevo: real('nivel_nuevo').notNull(),
    /** Direccion: subir, bajar, mantener */
    direccion: varchar('direccion', { length: 10 }).notNull(),
    /** Razon legible del ajuste */
    razon: text('razon').notNull(),
    /** Datos que sustentaron la decision */
    evidencia: jsonb('evidencia').$type<DifficultyEvidence>().default({}),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('difficulty_student_idx').on(table.studentId),
    index('difficulty_session_idx').on(table.sessionId),
  ]
);

export const difficultyAdjustmentsRelations = relations(difficultyAdjustments, ({ one }) => ({
  student: one(students, {
    fields: [difficultyAdjustments.studentId],
    references: [students.id],
  }),
  session: one(sessions, {
    fields: [difficultyAdjustments.sessionId],
    references: [sessions.id],
  }),
}));

// ─────────────────────────────────────────────
// HISTORIAS GENERADAS (LLM)
// ─────────────────────────────────────────────

export const generatedStories = pgTable(
  'generated_stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    topicSlug: varchar('topic_slug', { length: 50 }).notNull(),
    titulo: varchar('titulo', { length: 200 }).notNull(),
    contenido: text('contenido').notNull(),
    nivel: real('nivel').notNull(),
    metadata: jsonb('metadata').$type<StoryMetadata>().notNull(),
    modeloGeneracion: varchar('modelo_generacion', { length: 50 }).notNull(),
    promptVersion: varchar('prompt_version', { length: 20 }).notNull().default('v1'),
    aprobadaQA: boolean('aprobada_qa').notNull().default(false),
    motivoRechazo: text('motivo_rechazo'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stories_student_idx').on(table.studentId),
    index('stories_topic_idx').on(table.topicSlug),
  ]
);

export const generatedStoriesRelations = relations(generatedStories, ({ one, many }) => ({
  student: one(students, {
    fields: [generatedStories.studentId],
    references: [students.id],
  }),
  questions: many(storyQuestions),
}));

// ─────────────────────────────────────────────
// PREGUNTAS DE HISTORIA (generadas con la historia)
// ─────────────────────────────────────────────

export const storyQuestions = pgTable(
  'story_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => generatedStories.id, { onDelete: 'cascade' }),
    tipo: varchar('tipo', { length: 20 }).notNull(),
    pregunta: text('pregunta').notNull(),
    opciones: jsonb('opciones').$type<string[]>().notNull(),
    respuestaCorrecta: integer('respuesta_correcta').notNull(),
    explicacion: text('explicacion').notNull(),
    orden: integer('orden').notNull().default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('questions_story_idx').on(table.storyId),
  ]
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

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    /** Tipo: lectura, comprension, baseline, etc. */
    tipoActividad: varchar('tipo_actividad', { length: 50 }).notNull(),
    /** Modulo: lectura-adaptativa, baseline, etc. */
    modulo: varchar('modulo', { length: 50 }).notNull(),
    duracionSegundos: integer('duracion_segundos'),
    completada: boolean('completada').notNull().default(false),
    estrellasGanadas: integer('estrellas_ganadas').notNull().default(0),
    stickerGanado: varchar('sticker_ganado', { length: 10 }),
    /** ID de historia generada (Sprint 2) */
    storyId: uuid('story_id')
      .references(() => generatedStories.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    iniciadaEn: timestamp('iniciada_en', { withTimezone: true }).notNull().defaultNow(),
    finalizadaEn: timestamp('finalizada_en', { withTimezone: true }),
  },
  (table) => [
    index('sessions_student_idx').on(table.studentId),
    index('sessions_fecha_idx').on(table.iniciadaEn),
  ]
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
}));

// ─────────────────────────────────────────────
// RESPUESTAS (cada interaccion dentro de sesion)
// ─────────────────────────────────────────────

export const responses = pgTable(
  'responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    ejercicioId: varchar('ejercicio_id', { length: 100 }).notNull(),
    /** Tipo de ejercicio: literal, inferencia, vocabulario, resumen */
    tipoEjercicio: varchar('tipo_ejercicio', { length: 50 }).notNull(),
    pregunta: text('pregunta').notNull(),
    respuesta: text('respuesta').notNull(),
    respuestaCorrecta: text('respuesta_correcta').notNull(),
    correcta: boolean('correcta').notNull(),
    tiempoRespuestaMs: integer('tiempo_respuesta_ms'),
    intentoNumero: integer('intento_numero').notNull().default(1),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('responses_session_idx').on(table.sessionId),
  ]
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

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    tipo: varchar('tipo', { length: 50 }).notNull(),
    logroId: varchar('logro_id', { length: 100 }).notNull(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    icono: varchar('icono', { length: 10 }),
    descripcion: text('descripcion'),
    coleccion: varchar('coleccion', { length: 50 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    ganadoEn: timestamp('ganado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('achievements_student_idx').on(table.studentId),
  ]
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

export const skillProgress = pgTable(
  'skill_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    /** Identificador de la habilidad (ej: topic-animales, comprension-inferencia) */
    skillId: varchar('skill_id', { length: 100 }).notNull(),
    /** Categoria: comprension, vocabulario, fluidez, etc. */
    categoria: varchar('categoria', { length: 50 }).notNull(),
    nivelMastery: real('nivel_mastery').notNull().default(0),
    totalIntentos: integer('total_intentos').notNull().default(0),
    totalAciertos: integer('total_aciertos').notNull().default(0),
    dominada: boolean('dominada').notNull().default(false),
    ultimaPractica: timestamp('ultima_practica', { withTimezone: true }),
    proximaRevision: timestamp('proxima_revision', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('skill_student_idx').on(table.studentId),
    index('skill_id_idx').on(table.studentId, table.skillId),
  ]
);

export const skillProgressRelations = relations(skillProgress, ({ one }) => ({
  student: one(students, {
    fields: [skillProgress.studentId],
    references: [students.id],
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
};

export type StoryMetadata = {
  longitudPalabras: number;
  longitudOracionMedia: number;
  vocabularioNuevo: string[];
  edadObjetivo: number;
  tiempoEsperadoMs: number;
};
