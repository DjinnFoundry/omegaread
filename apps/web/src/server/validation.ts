/**
 * Esquemas de validación Zod para server actions.
 *
 * Valida todos los inputs en runtime antes de procesarlos.
 * TypeScript types ≠ runtime validation — Zod cierra ese gap.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────
// PRIMITIVOS COMUNES
// ─────────────────────────────────────────────

/** UUID v4 */
const uuid = z.string().uuid('ID inválido');

/** String no vacío con longitud máxima */
const nombreCorto = z.string().min(1, 'Campo obligatorio').max(100, 'Máximo 100 caracteres');

/** Tipo de actividad */
const tipoActividad = z.string().min(1).max(50);

/** Módulo */
const modulo = z.string().min(1).max(50);

// ─────────────────────────────────────────────
// SESSION ACTIONS
// ─────────────────────────────────────────────

/** Schema: iniciarSesion */
export const iniciarSesionSchema = z.object({
  studentId: uuid,
  tipoActividad,
  modulo,
});

/** Schema: guardarRespuestaIndividual */
export const guardarRespuestaSchema = z.object({
  sessionId: uuid,
  studentId: uuid,
  ejercicioId: z.string().min(1).max(200),
  tipoEjercicio: z.string().min(1).max(50),
  pregunta: z.string().min(1).max(500),
  respuesta: z.string().min(1).max(500),
  respuestaCorrecta: z.string().min(1).max(500),
  correcta: z.boolean(),
  tiempoRespuestaMs: z.number().int().nonnegative().optional(),
  intentoNumero: z.number().int().positive().optional(),
});

/** Schema: actualizarSesionEnCurso */
export const actualizarSesionSchema = z.object({
  sessionId: uuid,
  studentId: uuid,
  estrellasGanadas: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Schema: finalizarSesionDB */
export const finalizarSesionSchema = z.object({
  sessionId: uuid,
  duracionSegundos: z.number().int().nonnegative(),
  completada: z.boolean(),
  estrellasGanadas: z.number().int().nonnegative(),
  stickerGanado: z.string().max(10).optional(),
  studentId: uuid,
});

/** Schema: actualizarProgresoInmediato */
export const actualizarProgresoSchema = z.object({
  studentId: uuid,
  skillId: z.string().min(1).max(100),
  categoria: z.string().min(1).max(50),
  correcto: z.boolean(),
  calidad: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  tiempoRespuestaMs: z.number().int().nonnegative().optional(),
});

/** Schema: cargarProgresoEstudiante (solo studentId) */
export const cargarProgresoSchema = uuid;

// ─────────────────────────────────────────────
// STUDENT ACTIONS
// ─────────────────────────────────────────────

/** Schema: crearEstudiante */
export const crearEstudianteSchema = z.object({
  nombre: nombreCorto,
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha invalida (YYYY-MM-DD)'),
});
