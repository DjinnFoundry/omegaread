/**
 * Discriminated union of typed error codes for server actions.
 *
 * Convention:
 * - Error codes are SCREAMING_SNAKE_CASE
 * - Grouped by domain (AUTH_, STORY_, SESSION_, etc.)
 * - User-facing messages belong in the UI layer (see error-messages.ts), not here
 *
 * Migration guide for existing action files:
 * 1. Import { ok, err, type ActionResult } from '@/lib/types/errors'
 * 2. Replace `return { ok: false, error: '...' }` with `return err('CODE')`
 * 3. Replace `return { ok: true, ... }` with `return ok({ ... })`
 * 4. Update the return type to `Promise<ActionResult<YourDataType>>`
 * 5. Callers use `isActionError(result)` to narrow the type
 *
 * Legacy code migration mapping:
 *
 * Current ad-hoc codes -> Typed ActionErrorCode:
 * - 'NO_API_KEY'         -> 'STORY_LLM_UNAVAILABLE'
 * - 'RATE_LIMIT'         -> 'STORY_DAILY_LIMIT'
 * - 'GENERATION_FAILED'  -> 'STORY_GENERATION_FAILED' (story) or 'AUDIO_ANALYSIS_FAILED' (audio)
 * - 'QA_REJECTED'        -> 'STORY_QA_REJECTED'
 * - 'Progreso aun no disponible' -> 'STORY_PENDING'
 *
 * TODO: Migrate server actions to use err() with typed codes.
 */

// ─── Error codes ───

export type ActionErrorCode =
  // Auth errors
  | 'AUTH_REQUIRED'
  | 'AUTH_STUDENT_NOT_OWNED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_DUPLICATE_EMAIL'
  | 'AUTH_WEAK_PASSWORD'
  | 'AUTH_MISSING_FIELDS'

  // Story errors
  | 'STORY_DAILY_LIMIT'
  | 'STORY_LLM_UNAVAILABLE'
  | 'STORY_GENERATION_FAILED'
  | 'STORY_NOT_FOUND'
  | 'STORY_CACHE_MISS'
  | 'STORY_QA_REJECTED'
  | 'STORY_SESSION_MISMATCH'
  | 'STORY_PENDING'

  // Session errors
  | 'SESSION_NOT_FOUND'
  | 'SESSION_ALREADY_COMPLETED'
  | 'SESSION_INVALID_STATE'
  | 'SESSION_ALREADY_ADJUSTED'

  // Student errors
  | 'STUDENT_NOT_FOUND'
  | 'STUDENT_LIMIT_REACHED'
  | 'STUDENT_INVALID_AGE'

  // Profile errors
  | 'PROFILE_QUESTION_INVALID'
  | 'PROFILE_ANSWER_INVALID'

  // Validation
  | 'VALIDATION_ERROR'

  // Audio
  | 'AUDIO_TOO_SHORT'
  | 'AUDIO_TOO_LARGE'
  | 'AUDIO_ANALYSIS_FAILED'
  | 'AUDIO_SESSION_NOT_FOUND'

  // Generic
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED';

// ─── Result types ───

export interface ActionSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ActionError {
  ok: false;
  code: ActionErrorCode;
  message?: string; // Optional debug context (not for UI display)
}

export type ActionResult<T = unknown> = ActionSuccess<T> | ActionError;

// ─── Factory helpers ───

/** Create a success result */
export function ok<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

/** Create an error result */
export function err(code: ActionErrorCode, message?: string): ActionError {
  return { ok: false, code, message };
}

// ─── Type guards ───

/** Narrow an ActionResult to ActionError */
export function isActionError(result: ActionResult): result is ActionError {
  return !result.ok;
}

/** Narrow an ActionResult to ActionSuccess */
export function isActionSuccess<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.ok;
}
