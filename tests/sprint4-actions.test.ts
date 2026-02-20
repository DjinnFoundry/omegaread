/**
 * Tests para server actions y exports de Sprint 4.
 * Verifica que las funciones existen y estan exportadas correctamente.
 * Sprint 4: Reescritura en sesion + ajuste manual.
 */
import { describe, it, expect } from 'vitest';
import {
  generarHistoria,
  finalizarSesionLectura,
  reescribirHistoria,
} from '@/server/actions/story-actions';
import { rewriteStory } from '@/lib/ai/story-generator';
import {
  buildRewritePrompt,
  calcularNivelReescritura,
} from '@/lib/ai/prompts';

describe('Sprint 4: story-actions exports', () => {
  it('reescribirHistoria esta exportada como funcion', () => {
    expect(typeof reescribirHistoria).toBe('function');
  });

  it('generarHistoria sigue exportada (backwards compat)', () => {
    expect(typeof generarHistoria).toBe('function');
  });

  it('finalizarSesionLectura sigue exportada (backwards compat)', () => {
    expect(typeof finalizarSesionLectura).toBe('function');
  });
});

describe('Sprint 4: story-generator exports', () => {
  it('rewriteStory esta exportada como funcion', () => {
    expect(typeof rewriteStory).toBe('function');
  });
});

describe('Sprint 4: prompts exports', () => {
  it('buildRewritePrompt esta exportada como funcion', () => {
    expect(typeof buildRewritePrompt).toBe('function');
  });

  it('calcularNivelReescritura esta exportada como funcion', () => {
    expect(typeof calcularNivelReescritura).toBe('function');
  });
});
