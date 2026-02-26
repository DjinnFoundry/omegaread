import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isActionError,
  isActionSuccess,
  type ActionResult,
  type ActionSuccess,
  type ActionError,
  type ActionErrorCode,
} from '../apps/web/src/lib/types/errors';
import {
  getErrorMessage,
  ERROR_MESSAGES,
} from '../apps/web/src/lib/types/error-messages';

// ─── ok() ───

describe('ok()', () => {
  it('creates correct success shape', () => {
    const result = ok({ userId: '123' });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ userId: '123' });
  });

  it('works with primitive data', () => {
    expect(ok(42).data).toBe(42);
    expect(ok('hello').data).toBe('hello');
    expect(ok(null).data).toBe(null);
    expect(ok(true).data).toBe(true);
  });

  it('works with array data', () => {
    const result = ok([1, 2, 3]);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it('works with void/undefined data', () => {
    const result = ok(undefined);
    expect(result.ok).toBe(true);
    expect(result.data).toBeUndefined();
  });
});

// ─── err() ───

describe('err()', () => {
  it('creates correct error shape with code only', () => {
    const result = err('AUTH_REQUIRED');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('AUTH_REQUIRED');
    expect(result.message).toBeUndefined();
  });

  it('creates correct error shape with code and message', () => {
    const result = err('STORY_GENERATION_FAILED', 'LLM returned 500');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('STORY_GENERATION_FAILED');
    expect(result.message).toBe('LLM returned 500');
  });

  it('all codes in ERROR_MESSAGES are valid ActionErrorCode values', () => {
    // Derive the list from ERROR_MESSAGES at runtime so we never have a stale hardcoded copy.
    const codesFromMessages = Object.keys(ERROR_MESSAGES) as ActionErrorCode[];
    expect(codesFromMessages.length).toBeGreaterThan(0);

    for (const code of codesFromMessages) {
      const result = err(code);
      expect(result.ok).toBe(false);
      expect(result.code).toBe(code);
    }
  });
});

// ─── isActionError() ───

describe('isActionError()', () => {
  it('returns true for error results', () => {
    const result: ActionResult = err('SESSION_NOT_FOUND');
    expect(isActionError(result)).toBe(true);
  });

  it('returns false for success results', () => {
    const result: ActionResult = ok({ id: '1' });
    expect(isActionError(result)).toBe(false);
  });

  it('narrows type so .code is accessible', () => {
    const result: ActionResult<{ id: string }> = err('AUTH_REQUIRED');
    if (isActionError(result)) {
      // TypeScript should allow accessing .code here
      expect(result.code).toBe('AUTH_REQUIRED');
    }
  });
});

// ─── isActionSuccess() ───

describe('isActionSuccess()', () => {
  it('returns true for success results', () => {
    const result: ActionResult<number> = ok(42);
    expect(isActionSuccess(result)).toBe(true);
  });

  it('returns false for error results', () => {
    const result: ActionResult<number> = err('INTERNAL_ERROR');
    expect(isActionSuccess(result)).toBe(false);
  });

  it('narrows type so .data is accessible', () => {
    const result: ActionResult<{ name: string }> = ok({ name: 'test' });
    if (isActionSuccess(result)) {
      expect(result.data.name).toBe('test');
    }
  });
});

// ─── getErrorMessage() ───

describe('getErrorMessage()', () => {
  it('returns Spanish messages for all defined codes', () => {
    const allCodes = Object.keys(ERROR_MESSAGES) as ActionErrorCode[];
    expect(allCodes.length).toBeGreaterThan(0);

    for (const code of allCodes) {
      const msg = getErrorMessage(code);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('returns fallback for truly unknown codes (no type cast needed)', () => {
    // getErrorMessage accepts string, so no type assertion required
    const msg = getErrorMessage('TOTALLY_UNKNOWN');
    expect(msg).toBe('Ocurrio un error inesperado. Intenta de nuevo.');
  });

  it('returns specific messages for common error codes', () => {
    expect(getErrorMessage('AUTH_REQUIRED')).toBe(
      'Debes iniciar sesion para continuar.',
    );
    expect(getErrorMessage('SESSION_NOT_FOUND')).toBe(
      'Sesion no encontrada.',
    );
    expect(getErrorMessage('STUDENT_NOT_FOUND')).toBe(
      'Estudiante no encontrado.',
    );
    expect(getErrorMessage('STORY_DAILY_LIMIT')).toBe(
      'Has alcanzado el limite de historias por hoy. Vuelve manana!',
    );
    expect(getErrorMessage('AUDIO_TOO_SHORT')).toBe(
      'Audio insuficiente para medir fluidez.',
    );
  });

  it('every ActionErrorCode has a corresponding entry in ERROR_MESSAGES', () => {
    // Derive the codes from ERROR_MESSAGES (the Record<ActionErrorCode, string> type
    // guarantees at compile time that all union members are present).
    // At runtime we verify the mapping is non-empty and each value is a string.
    const codes = Object.keys(ERROR_MESSAGES) as ActionErrorCode[];
    expect(codes.length).toBeGreaterThan(0);

    for (const code of codes) {
      expect(ERROR_MESSAGES).toHaveProperty(code);
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      // Verify getErrorMessage returns the same value (no fallback triggered)
      expect(getErrorMessage(code)).toBe(ERROR_MESSAGES[code]);
    }
  });
});

// ─── Discriminated union ergonomics ───

describe('ActionResult discriminated union', () => {
  it('works in a switch-like pattern', () => {
    function handleResult(result: ActionResult<string>): string {
      if (result.ok) {
        return `Success: ${result.data}`;
      }
      return `Error: ${result.code}`;
    }

    expect(handleResult(ok('hello'))).toBe('Success: hello');
    expect(handleResult(err('AUTH_REQUIRED'))).toBe('Error: AUTH_REQUIRED');
  });

  it('supports generic data types', () => {
    interface UserData {
      id: string;
      name: string;
    }

    const success: ActionResult<UserData> = ok({ id: '1', name: 'Juan' });
    const failure: ActionResult<UserData> = err('STUDENT_NOT_FOUND');

    if (isActionSuccess(success)) {
      expect(success.data.name).toBe('Juan');
    }
    if (isActionError(failure)) {
      expect(failure.code).toBe('STUDENT_NOT_FOUND');
    }
  });
});
