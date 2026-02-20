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

// ─────────────────────────────────────────────
// PROFILE ACTIONS (Sprint 1)
// ─────────────────────────────────────────────

const cursoValido = z.enum([
  'infantil-3',
  'infantil-4',
  'infantil-5',
  '1o-primaria',
  '2o-primaria',
  '3o-primaria',
  '4o-primaria',
]);

const rutinaLecturaValida = z.enum(['diaria', 'varias-por-semana', 'ocasional', 'rara-vez']);

const acompanamientoValido = z.enum(['siempre', 'a-veces', 'nunca']);

/** Schema: actualizarPerfilEstudiante */
export const actualizarPerfilSchema = z.object({
  studentId: uuid,
  curso: cursoValido,
  centroEscolar: z.string().max(200).optional(),
  rutinaLectura: rutinaLecturaValida,
  acompanamiento: acompanamientoValido,
  senalesDificultad: z.object({
    atencion: z.boolean().optional(),
    vocabulario: z.boolean().optional(),
    frustracion: z.boolean().optional(),
    otroDetalle: z.string().max(300).optional(),
  }),
  personajesFavoritos: z.string().max(300).optional(),
  temasEvitar: z.array(z.string().max(50)).max(10).optional(),
});

/** Schema: guardarIntereses (del nino) */
export const guardarInteresesSchema = z.object({
  studentId: uuid,
  intereses: z.array(z.string().max(50)).min(1, 'Selecciona al menos 1 interes').max(10),
});

// ─────────────────────────────────────────────
// BASELINE ACTIONS (Sprint 1)
// ─────────────────────────────────────────────

const tipoPreguntaValido = z.enum(['literal', 'inferencia', 'vocabulario', 'resumen']);

/** Schema: guardarRespuestaBaseline */
export const guardarRespuestaBaselineSchema = z.object({
  studentId: uuid,
  nivelTexto: z.number().int().min(1).max(4),
  textoId: z.string().min(1).max(50),
  totalPreguntas: z.number().int().min(1).max(10),
  aciertos: z.number().int().min(0).max(10),
  aciertosPorTipo: z.record(z.string(), z.number().int().min(0)),
  tiempoLecturaMs: z.number().int().nonnegative().optional(),
  respuestas: z.array(
    z.object({
      preguntaId: z.string().min(1),
      tipo: tipoPreguntaValido,
      respuesta: z.string(),
      correcta: z.boolean(),
      tiempoMs: z.number().int().nonnegative().optional(),
    })
  ),
});

/** Schema: finalizarBaseline */
export const finalizarBaselineSchema = z.object({
  studentId: uuid,
  nivelLectura: z.number().min(1).max(5),
  comprensionScore: z.number().min(0).max(1),
  confianza: z.enum(['alto', 'medio', 'bajo']),
});

// ─────────────────────────────────────────────
// READING SESSION ACTIONS (contrato Sprint 2)
// ─────────────────────────────────────────────

/** Schema: crearSesionLectura */
export const crearSesionLecturaSchema = z.object({
  studentId: uuid,
  textoId: z.string().min(1).max(100).optional(),
  nivelTexto: z.number().min(1).max(10).optional(),
  topicId: z.string().uuid().optional(),
});

/** Schema: registrarRespuestaComprension */
export const registrarRespuestaComprensionSchema = z.object({
  sessionId: uuid,
  studentId: uuid,
  preguntaId: z.string().min(1).max(100),
  tipo: tipoPreguntaValido,
  respuestaSeleccionada: z.number().int().min(0),
  correcta: z.boolean(),
  tiempoMs: z.number().int().nonnegative(),
});

// ─────────────────────────────────────────────
// STORY GENERATION ACTIONS (Sprint 2)
// ─────────────────────────────────────────────

/** Schema: generarHistoria */
export const generarHistoriaSchema = z.object({
  studentId: uuid,
  topicSlug: z.string().min(1).max(50).optional(),
});

/** Schema: finalizarSesionLectura */
export const finalizarSesionLecturaSchema = z.object({
  sessionId: uuid,
  studentId: uuid,
  tiempoLecturaMs: z.number().int().nonnegative(),
  respuestas: z.array(z.object({
    preguntaId: z.string().min(1).max(100),
    tipo: tipoPreguntaValido,
    respuestaSeleccionada: z.number().int().min(0).max(3),
    correcta: z.boolean(),
    tiempoMs: z.number().int().nonnegative(),
  })).min(1).max(4),
});
