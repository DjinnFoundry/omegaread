/**
 * Tests para templates de prompts y configuracion por nivel.
 */
import { describe, it, expect } from 'vitest';
import {
  NIVELES_CONFIG,
  getNivelConfig,
  buildSystemPrompt,
  buildUserPrompt,
  type PromptInput,
} from '@/lib/ai/prompts';

describe('NIVELES_CONFIG', () => {
  it('tiene configuracion para subniveles clave', () => {
    expect(NIVELES_CONFIG[1.0]).toBeDefined();
    expect(NIVELES_CONFIG[2.0]).toBeDefined();
    expect(NIVELES_CONFIG[3.0]).toBeDefined();
    expect(NIVELES_CONFIG[4.8]).toBeDefined();
  });

  it('cada nivel tiene palabrasMin < palabrasMax', () => {
    for (const nivel of [1.0, 2.0, 3.0, 4.8]) {
      const config = NIVELES_CONFIG[nivel];
      expect(config.palabrasMin).toBeLessThan(config.palabrasMax);
    }
  });

  it('longitud crece con el nivel', () => {
    const niveles = [1.0, 1.8, 2.8, 3.8, 4.8];
    for (let i = 0; i < niveles.length - 1; i++) {
      expect(NIVELES_CONFIG[niveles[i]].palabrasMax)
        .toBeLessThanOrEqual(NIVELES_CONFIG[niveles[i + 1]].palabrasMin * 1.5);
    }
  });

  it('tiempo esperado crece con el nivel', () => {
    const niveles = [1.0, 1.8, 2.8, 3.8, 4.8];
    for (let i = 0; i < niveles.length - 1; i++) {
      expect(NIVELES_CONFIG[niveles[i]].tiempoEsperadoMs)
        .toBeLessThanOrEqual(NIVELES_CONFIG[niveles[i + 1]].tiempoEsperadoMs);
    }
  });

  it('todos tienen complejidad lexica definida', () => {
    for (const nivel of [1.0, 2.0, 3.0, 4.8]) {
      expect(NIVELES_CONFIG[nivel].complejidadLexica.length).toBeGreaterThan(10);
    }
  });

  it('cada nivel tiene dialogoPorcentaje entre 0 y 50', () => {
    for (const key of Object.keys(NIVELES_CONFIG)) {
      const config = NIVELES_CONFIG[Number(key)];
      expect(config.dialogoPorcentaje).toBeGreaterThanOrEqual(0);
      expect(config.dialogoPorcentaje).toBeLessThanOrEqual(50);
    }
  });

  it('cada nivel tiene estiloNarrativo no vacio', () => {
    for (const key of Object.keys(NIVELES_CONFIG)) {
      const config = NIVELES_CONFIG[Number(key)];
      expect(config.estiloNarrativo.length).toBeGreaterThan(20);
    }
  });

  it('cada nivel tiene al menos 2 tecnicasEngagement', () => {
    for (const key of Object.keys(NIVELES_CONFIG)) {
      const config = NIVELES_CONFIG[Number(key)];
      expect(config.tecnicasEngagement.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('cada nivel tiene al menos 2 aperturasSugeridas', () => {
    for (const key of Object.keys(NIVELES_CONFIG)) {
      const config = NIVELES_CONFIG[Number(key)];
      expect(config.aperturasSugeridas.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('dialogoPorcentaje crece entre bandas', () => {
    expect(NIVELES_CONFIG[1.0].dialogoPorcentaje)
      .toBeLessThanOrEqual(NIVELES_CONFIG[4.8].dialogoPorcentaje);
  });
});

describe('getNivelConfig', () => {
  it('devuelve config exacta para subniveles', () => {
    expect(getNivelConfig(1.0)).toBe(NIVELES_CONFIG[1.0]);
    expect(getNivelConfig(4.8)).toBe(NIVELES_CONFIG[4.8]);
  });

  it('redondea al 0.2 mas cercano', () => {
    expect(getNivelConfig(1.49)).toBe(NIVELES_CONFIG[1.4]);
    expect(getNivelConfig(2.31)).toBe(NIVELES_CONFIG[2.4]);
    expect(getNivelConfig(3.74)).toBe(NIVELES_CONFIG[3.8]);
  });

  it('clampea por debajo a nivel 1.0', () => {
    expect(getNivelConfig(0)).toBe(NIVELES_CONFIG[1.0]);
    expect(getNivelConfig(-1)).toBe(NIVELES_CONFIG[1.0]);
  });

  it('clampea por arriba a nivel 4.8', () => {
    expect(getNivelConfig(5)).toBe(NIVELES_CONFIG[4.8]);
    expect(getNivelConfig(10)).toBe(NIVELES_CONFIG[4.8]);
  });
});

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('menciona espanol', () => {
    expect(prompt.toLowerCase()).toContain('espanol');
  });

  it('menciona seguridad', () => {
    expect(prompt.toLowerCase()).toContain('segur');
  });

  it('menciona los 4 tipos de pregunta', () => {
    expect(prompt).toContain('LITERAL');
    expect(prompt).toContain('INFERENCIA');
    expect(prompt).toContain('VOCABULARIO');
    expect(prompt).toContain('RESUMEN');
  });

  it('menciona formato JSON', () => {
    expect(prompt).toContain('JSON');
  });

  it('define identidad como cuentacuentos', () => {
    expect(prompt.toLowerCase()).toContain('cuentacuentos');
  });

  it('incluye seccion de anti-patrones', () => {
    expect(prompt).toContain('ANTI-PATRONES');
  });

  it('incluye principio mostrar nunca decir', () => {
    expect(prompt).toContain('MOSTRAR, NUNCA DECIR');
  });

  it('menciona dialogo como principio', () => {
    expect(prompt).toContain('DIALOGO ES REY');
  });

  it('menciona humor como obligatorio', () => {
    expect(prompt).toContain('HUMOR OBLIGATORIO');
  });

  it('menciona personaje primero', () => {
    expect(prompt).toContain('PERSONAJE PRIMERO');
  });

  it('menciona educacion por descubrimiento', () => {
    expect(prompt).toContain('EDUCACION POR DESCUBRIMIENTO');
  });

  it('incluye primera frase como hook obligatorio', () => {
    expect(prompt).toContain('PRIMERA FRASE = HOOK');
    expect(prompt).toContain('SHOCK');
  });
});

describe('buildUserPrompt', () => {
  const baseInput: PromptInput = {
    edadAnos: 7,
    nivel: 2,
    topicNombre: 'Animales',
    topicDescripcion: 'Historias sobre animales',
    modo: 'educativo',
    intereses: ['deportes', 'ciencia'],
  };

  it('incluye edad del nino', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('7 anos');
  });

  it('incluye nivel de lectura', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt.toLowerCase()).toContain('nivel de lectura 2');
  });

  it('incluye topic', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('Animales');
  });

  it('incluye limites de palabras del nivel', () => {
    const prompt = buildUserPrompt(baseInput);
    const config = getNivelConfig(2);
    expect(prompt).toContain(String(config.palabrasMin));
    expect(prompt).toContain(String(config.palabrasMax));
  });

  it('incluye intereses si hay', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('deportes');
    expect(prompt).toContain('ciencia');
  });

  it('no incluye personajes si no hay', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).not.toContain('Personajes favoritos');
  });

  it('incluye personajes si hay', () => {
    const prompt = buildUserPrompt({ ...baseInput, personajesFavoritos: 'Spider-Man' });
    expect(prompt).toContain('Spider-Man');
  });

  it('incluye formato JSON obligatorio', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('JSON:');
    expect(prompt).toContain('"titulo"');
    expect(prompt).toContain('"contenido"');
    expect(prompt).toContain('"preguntas"');
  });

  it('incluye contexto de tech tree cuando se provee', () => {
    const prompt = buildUserPrompt({
      ...baseInput,
      techTreeContext: {
        skillSlug: 'cohetes-3-empuje',
        skillNombre: 'Empuje de cohetes',
        skillNivel: 2,
        objetivoSesion: 'Entender que el cohete sube por accion y reaccion',
        estrategia: 'balanced',
        prerequisitosDominados: ['Partes del cohete'],
        prerequisitosPendientes: ['Etapas del cohete'],
      },
    });

    expect(prompt).toContain('RUTA DEL TECH TREE');
    expect(prompt).toContain('cohetes-3-empuje');
    expect(prompt).toContain('accion y reaccion');
    expect(prompt).toContain('Partes del cohete');
  });

  it('incluye feedback de reintento cuando aplica', () => {
    const prompt = buildUserPrompt(baseInput, {
      retryHint: 'Historia muy corta',
      intento: 2,
    });
    expect(prompt).toContain('REINTENTO #2');
    expect(prompt).toContain('Historia muy corta');
  });

  it('incluye estilo narrativo del nivel', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('ESTILO NARRATIVO');
  });

  it('incluye tecnicas de engagement', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('TECNICAS DE ENGAGEMENT');
  });

  it('incluye porcentaje minimo de dialogo', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('Dialogo minimo');
    expect(prompt).toContain('% del texto debe ser dialogo directo');
  });

  it('incluye hooks de apertura', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain('HOOK DE APERTURA');
  });

  it('NO incluye texto de ejemplo estatico', () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).not.toContain('Ejemplo de texto de este nivel');
    expect(prompt).not.toContain('imita estilo y complejidad');
  });
});
