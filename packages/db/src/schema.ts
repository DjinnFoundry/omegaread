/**
 * Schema de base de datos para OmegaAnywhere
 * Modelo de datos base — Ola 1
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
// PADRES (autenticación y gestión)
// ─────────────────────────────────────────────

export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es-ES'),
  /** Configuración: notificaciones, horarios, etc. */
  config: jsonb('config').$type<ParentConfig>().default({}),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const parentsRelations = relations(parents, ({ many }) => ({
  students: many(students),
}));

// ─────────────────────────────────────────────
// ESTUDIANTES (los niños)
// ─────────────────────────────────────────────

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  /** Fecha de nacimiento para calcular edad */
  fechaNacimiento: timestamp('fecha_nacimiento', { mode: 'date' }).notNull(),
  idioma: varchar('idioma', { length: 10 }).notNull().default('es-ES'),
  /** Dialecto: es-ES, es-MX, es-AR, es-CO, es-neutro */
  dialecto: varchar('dialecto', { length: 10 }).notNull().default('es-ES'),
  /** Nombre de la mascota elegida */
  mascotaNombre: varchar('mascota_nombre', { length: 50 }),
  /** Tipo de mascota: gato, perro, buho, dragon */
  mascotaTipo: varchar('mascota_tipo', { length: 20 }).default('gato'),
  /** Color de la mascota */
  mascotaColor: varchar('mascota_color', { length: 7 }).default('#FF6B6B'),
  /** Intereses del niño (array de strings) */
  intereses: jsonb('intereses').$type<string[]>().default([]),
  /** Nivel detectado por diagnóstico invisible */
  nivelDiagnostico: jsonb('nivel_diagnostico').$type<DiagnosticoNivel | null>().default(null),
  /** Diagnóstico completado? */
  diagnosticoCompletado: boolean('diagnostico_completado').notNull().default(false),
  /** Configuración de accesibilidad */
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
// SESIONES (cada vez que el niño juega)
// ─────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    /** Tipo: vocales, diagnostico, silabas, numeros, etc. */
    tipoActividad: varchar('tipo_actividad', { length: 50 }).notNull(),
    /** Módulo: pre-lectura, lectura, pre-mates, etc. */
    modulo: varchar('modulo', { length: 50 }).notNull(),
    /** Duración en segundos */
    duracionSegundos: integer('duracion_segundos'),
    /** ¿Se completó la sesión? */
    completada: boolean('completada').notNull().default(false),
    /** Estrellas ganadas en esta sesión */
    estrellasGanadas: integer('estrellas_ganadas').notNull().default(0),
    /** Sticker ganado (emoji) */
    stickerGanado: varchar('sticker_ganado', { length: 10 }),
    /** Metadata adicional (resultados, config, etc.) */
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
// RESPUESTAS (cada interacción dentro de sesión)
// ─────────────────────────────────────────────

export const responses = pgTable(
  'responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    /** Identificador del ejercicio/pregunta */
    ejercicioId: varchar('ejercicio_id', { length: 100 }).notNull(),
    /** Tipo de ejercicio: reconocer_vocal, sonido_vocal, completar_vocal, etc. */
    tipoEjercicio: varchar('tipo_ejercicio', { length: 50 }).notNull(),
    /** Lo que se preguntó (ej: "busca la A") */
    pregunta: text('pregunta').notNull(),
    /** Lo que respondió el niño */
    respuesta: text('respuesta').notNull(),
    /** Respuesta esperada */
    respuestaCorrecta: text('respuesta_correcta').notNull(),
    /** ¿Fue correcta? */
    correcta: boolean('correcta').notNull(),
    /** Tiempo de respuesta en milisegundos */
    tiempoRespuestaMs: integer('tiempo_respuesta_ms'),
    /** Intento número (1 = primer intento) */
    intentoNumero: integer('intento_numero').notNull().default(1),
    /** Metadata adicional */
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
    /** Tipo: sticker, estrella_especial, zona_desbloqueada */
    tipo: varchar('tipo', { length: 50 }).notNull(),
    /** Identificador del logro (ej: sticker-delfin, zona-numeros) */
    logroId: varchar('logro_id', { length: 100 }).notNull(),
    /** Nombre visible */
    nombre: varchar('nombre', { length: 100 }).notNull(),
    /** Emoji o icono */
    icono: varchar('icono', { length: 10 }),
    /** Descripción corta */
    descripcion: text('descripcion'),
    /** Colección a la que pertenece (ej: animales-mar, dinosaurios) */
    coleccion: varchar('coleccion', { length: 50 }),
    /** Metadata adicional */
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
    /** Identificador de la habilidad (ej: vocal-a, vocal-e, silaba-ma) */
    skillId: varchar('skill_id', { length: 100 }).notNull(),
    /** Categoría: vocales, consonantes, silabas, numeros, etc. */
    categoria: varchar('categoria', { length: 50 }).notNull(),
    /** Nivel de mastery (0.0 - 1.0) */
    nivelMastery: real('nivel_mastery').notNull().default(0),
    /** Total de intentos */
    totalIntentos: integer('total_intentos').notNull().default(0),
    /** Total de aciertos */
    totalAciertos: integer('total_aciertos').notNull().default(0),
    /** ¿Está dominada? (mastery ≥ 0.9) */
    dominada: boolean('dominada').notNull().default(false),
    /** Última práctica */
    ultimaPractica: timestamp('ultima_practica', { withTimezone: true }),
    /** Próxima revisión programada (spaced repetition) */
    proximaRevision: timestamp('proxima_revision', { withTimezone: true }),
    /** Metadata: historial de mastery, tiempos, etc. */
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
  /** Notificaciones habilitadas */
  notificaciones?: boolean;
  /** Hora inicio permitida (HH:mm) */
  horaInicio?: string;
  /** Hora fin permitida (HH:mm) */
  horaFin?: string;
  /** Minutos máximos por día por hijo */
  minutosMaxDia?: number;
};

export type DiagnosticoNivel = {
  /** Letras reconocidas */
  letrasReconocidas: string[];
  /** Cuenta hasta este número de forma estable */
  cuentaHasta: number;
  /** Nivel de conciencia fonológica (0-4) */
  concienciaFonologica: number;
  /** Fecha del diagnóstico */
  fecha: string;
};

export type AccesibilidadConfig = {
  /** Fuente OpenDyslexic */
  fuenteDislexia?: boolean;
  /** Modo TDAH (sesiones más cortas, menos estímulos) */
  modoTDAH?: boolean;
  /** Alto contraste */
  altoContraste?: boolean;
  /** Duración máxima de sesión en minutos (override) */
  duracionSesionMin?: number;
};
