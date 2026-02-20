/**
 * Schema de base de datos para OmegaRead
 * Modelo de datos para lectura adaptativa.
 *
 * Tablas: padres, estudiantes, sesiones, respuestas, logros, progreso de habilidades
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
  /** Intereses del nino (para personalizar historias) */
  intereses: jsonb('intereses').$type<string[]>().default([]),
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
  achievements: many(achievements),
  skillProgress: many(skillProgress),
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
    /** Tipo: lectura, comprension, etc. */
    tipoActividad: varchar('tipo_actividad', { length: 50 }).notNull(),
    /** Modulo: lectura-adaptativa, etc. */
    modulo: varchar('modulo', { length: 50 }).notNull(),
    duracionSegundos: integer('duracion_segundos'),
    completada: boolean('completada').notNull().default(false),
    estrellasGanadas: integer('estrellas_ganadas').notNull().default(0),
    stickerGanado: varchar('sticker_ganado', { length: 10 }),
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
  responses: many(responses),
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
    /** Tipo de ejercicio: comprension, vocabulario, inferencia, etc. */
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
