/**
 * User-facing error messages in Spanish.
 *
 * This is the ONLY place where error display strings should live.
 * Server actions return typed error codes; the UI layer maps them
 * to human-readable messages via getErrorMessage().
 */
import type { ActionErrorCode } from './errors';

export const ERROR_MESSAGES: Record<ActionErrorCode, string> = {
  // Auth
  AUTH_REQUIRED: 'Debes iniciar sesion para continuar.',
  AUTH_STUDENT_NOT_OWNED: 'No tienes permiso para acceder a este estudiante.',
  AUTH_INVALID_CREDENTIALS: 'Email o contrasena incorrectos.',
  AUTH_DUPLICATE_EMAIL: 'Ya existe una cuenta con este email.',
  AUTH_WEAK_PASSWORD: 'La contrasena debe tener al menos 6 caracteres.',
  AUTH_MISSING_FIELDS: 'Todos los campos son obligatorios.',

  // Story
  STORY_DAILY_LIMIT: 'Has alcanzado el limite de historias por hoy. Vuelve manana!',
  STORY_LLM_UNAVAILABLE: 'El servicio de generacion de historias no esta disponible en este momento.',
  STORY_GENERATION_FAILED: 'No se pudo generar la historia. Intenta de nuevo.',
  STORY_NOT_FOUND: 'Historia no encontrada.',
  STORY_CACHE_MISS: 'No se encontro una historia guardada.',
  STORY_QA_REJECTED: 'La historia generada no paso los controles de calidad. Intenta de nuevo.',
  STORY_SESSION_MISMATCH: 'La historia no corresponde a la sesion activa.',
  STORY_PENDING: 'La historia todavia se esta generando. Espera un momento.',

  // Session
  SESSION_NOT_FOUND: 'Sesion no encontrada.',
  SESSION_ALREADY_COMPLETED: 'La sesion ya fue finalizada.',
  SESSION_INVALID_STATE: 'La sesion no esta en un estado valido para esta accion.',
  SESSION_ALREADY_ADJUSTED: 'Ya se realizo un ajuste en esta sesion.',

  // Student
  STUDENT_NOT_FOUND: 'Estudiante no encontrado.',
  STUDENT_LIMIT_REACHED: 'Has alcanzado el limite de estudiantes permitidos.',
  STUDENT_INVALID_AGE: 'La edad debe estar entre 3 y 10 anos.',

  // Profile
  PROFILE_QUESTION_INVALID: 'Pregunta no valida.',
  PROFILE_ANSWER_INVALID: 'Respuesta no valida para esta pregunta.',

  // Validation
  VALIDATION_ERROR: 'Los datos enviados no son validos.',

  // Audio
  AUDIO_TOO_SHORT: 'Audio insuficiente para medir fluidez.',
  AUDIO_TOO_LARGE: 'Audio demasiado grande para analizar en una sola peticion.',
  AUDIO_ANALYSIS_FAILED: 'No se pudo analizar el audio.',
  AUDIO_SESSION_NOT_FOUND: 'Sesion o historia no encontrada para analisis de audio.',

  // Generic
  INTERNAL_ERROR: 'Ocurrio un error inesperado. Intenta de nuevo.',
  RATE_LIMITED: 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.',
};

/**
 * Get the user-facing message for an error code.
 * Accepts a plain string for runtime safety (e.g. codes from network responses).
 * Returns a generic fallback for unknown codes.
 */
export function getErrorMessage(code: string): string {
  if (code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as ActionErrorCode];
  }
  return 'Ocurrio un error inesperado. Intenta de nuevo.';
}
