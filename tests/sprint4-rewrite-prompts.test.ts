/**
 * Tests para prompts de reescritura y configuracion de niveles.
 * Sprint 4: Reescritura en sesion.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRewritePrompt,
  calcularNivelReescritura,
  getNivelConfig,
  NIVELES_CONFIG,
  type RewritePromptInput,
} from '@/lib/ai/prompts';

// ─── Fixtures ───

function crearRewriteInput(overrides: Partial<RewritePromptInput> = {}): RewritePromptInput {
  return {
    historiaOriginal: 'Luna era una gatita curiosa. Un dia fue al bosque. Encontro un rio y vio peces.',
    tituloOriginal: 'El viaje de Luna',
    nivelActual: 2,
    direccion: 'mas_facil',
    edadAnos: 7,
    topicNombre: 'Animales',
    ...overrides,
  };
}

// ─── Tests: calcularNivelReescritura ───

describe('calcularNivelReescritura', () => {
  it('baja un nivel cuando direccion es mas_facil', () => {
    expect(calcularNivelReescritura(3, 'mas_facil')).toBe(2);
    expect(calcularNivelReescritura(2, 'mas_facil')).toBe(1);
  });

  it('sube un nivel cuando direccion es mas_desafiante', () => {
    expect(calcularNivelReescritura(2, 'mas_desafiante')).toBe(3);
    expect(calcularNivelReescritura(3, 'mas_desafiante')).toBe(4);
  });

  it('no baja de nivel 1', () => {
    expect(calcularNivelReescritura(1, 'mas_facil')).toBe(1);
  });

  it('no sube de nivel 4', () => {
    expect(calcularNivelReescritura(4, 'mas_desafiante')).toBe(4);
  });

  it('maneja nivel 1 con mas_desafiante', () => {
    expect(calcularNivelReescritura(1, 'mas_desafiante')).toBe(2);
  });

  it('maneja nivel 4 con mas_facil', () => {
    expect(calcularNivelReescritura(4, 'mas_facil')).toBe(3);
  });
});

// ─── Tests: buildRewritePrompt ───

describe('buildRewritePrompt', () => {
  it('incluye la historia original', () => {
    const input = crearRewriteInput();
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('Luna era una gatita curiosa');
  });

  it('incluye el titulo original', () => {
    const input = crearRewriteInput();
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('El viaje de Luna');
  });

  it('incluye la edad del nino', () => {
    const input = crearRewriteInput({ edadAnos: 8 });
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('8 anos');
  });

  it('incluye el topic', () => {
    const input = crearRewriteInput({ topicNombre: 'Ciencia' });
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('Ciencia');
  });

  it('incluye instruccion SIMPLIFICAR para mas_facil', () => {
    const input = crearRewriteInput({ direccion: 'mas_facil' });
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('SIMPLIFICAR');
  });

  it('incluye instruccion AUMENTAR para mas_desafiante', () => {
    const input = crearRewriteInput({ direccion: 'mas_desafiante' });
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('AUMENTAR');
  });

  it('usa configuracion del nivel objetivo (mas_facil)', () => {
    const input = crearRewriteInput({ nivelActual: 3, direccion: 'mas_facil' });
    const prompt = buildRewritePrompt(input);
    const configNivel2 = getNivelConfig(2);
    expect(prompt).toContain(String(configNivel2.palabrasMin));
    expect(prompt).toContain(String(configNivel2.palabrasMax));
  });

  it('usa configuracion del nivel objetivo (mas_desafiante)', () => {
    const input = crearRewriteInput({ nivelActual: 2, direccion: 'mas_desafiante' });
    const prompt = buildRewritePrompt(input);
    const configNivel3 = getNivelConfig(3);
    expect(prompt).toContain(String(configNivel3.palabrasMin));
    expect(prompt).toContain(String(configNivel3.palabrasMax));
  });

  it('contiene instrucciones de mantener personajes y trama', () => {
    const input = crearRewriteInput();
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('MANTENER');
    expect(prompt).toContain('personajes');
    expect(prompt).toContain('trama');
  });

  it('incluye formato JSON obligatorio', () => {
    const input = crearRewriteInput();
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('FORMATO JSON OBLIGATORIO');
    expect(prompt).toContain('"titulo"');
    expect(prompt).toContain('"contenido"');
    expect(prompt).toContain('"preguntas"');
  });

  it('pide 4 tipos de preguntas obligatorios', () => {
    const input = crearRewriteInput();
    const prompt = buildRewritePrompt(input);
    expect(prompt).toContain('literal');
    expect(prompt).toContain('inferencia');
    expect(prompt).toContain('vocabulario');
    expect(prompt).toContain('resumen');
  });

  it('configuracion del nivel mas_facil tiene oraciones mas cortas', () => {
    const input = crearRewriteInput({ nivelActual: 3, direccion: 'mas_facil' });
    const prompt = buildRewritePrompt(input);
    const configNivel2 = NIVELES_CONFIG[2];
    expect(prompt).toContain(String(configNivel2.oracionMin));
    expect(prompt).toContain(String(configNivel2.oracionMax));
  });
});
