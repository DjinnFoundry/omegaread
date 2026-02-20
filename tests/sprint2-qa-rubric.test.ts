/**
 * Tests para la rubrica QA de historias generadas.
 * Verifica: seguridad, longitud, estructura, tipos de preguntas.
 */
import { describe, it, expect } from 'vitest';
import {
  validarEstructura,
  evaluarHistoria,
  calcularMetadataHistoria,
  type StoryLLMOutput,
} from '@/lib/ai/qa-rubric';

// ─── Fixtures ───

function crearHistoriaValida(overrides: Partial<StoryLLMOutput> = {}): StoryLLMOutput {
  return {
    titulo: 'El viaje de Luna',
    contenido:
      'Luna era una gatita curiosa que vivia en un pueblo pequeno. ' +
      'Un dia decidio explorar el bosque cercano. ' +
      'Encontro un rio cristalino y vio peces de colores. ' +
      'Luna se quedo mirando el agua durante un buen rato. ' +
      'Cuando regreso a casa, su familia la estaba esperando con alegria.',
    vocabularioNuevo: ['cristalino', 'explorar'],
    preguntas: [
      {
        tipo: 'literal',
        pregunta: 'Donde vivia Luna?',
        opciones: ['En una ciudad', 'En un pueblo pequeno', 'En el bosque', 'En la playa'],
        respuestaCorrecta: 1,
        explicacion: 'El texto dice que Luna vivia en un pueblo pequeno.',
      },
      {
        tipo: 'inferencia',
        pregunta: 'Por que crees que la familia estaba esperando a Luna?',
        opciones: [
          'Porque estaban preocupados',
          'Porque tenian hambre',
          'Porque querian jugar',
          'Porque tenian sueno',
        ],
        respuestaCorrecta: 0,
        explicacion: 'Si Luna se fue al bosque, es probable que su familia se preocupara.',
      },
      {
        tipo: 'vocabulario',
        pregunta: 'Que significa "cristalino"?',
        opciones: ['Oscuro', 'Transparente y claro', 'Frio', 'Profundo'],
        respuestaCorrecta: 1,
        explicacion: 'Cristalino quiere decir que es muy claro, como el cristal.',
      },
      {
        tipo: 'resumen',
        pregunta: 'De que trata esta historia?',
        opciones: [
          'De una gatita que explora el bosque y regresa a casa',
          'De un rio con peces de colores',
          'De una familia que busca a su gato',
          'De un pueblo donde viven muchos gatos',
        ],
        respuestaCorrecta: 0,
        explicacion: 'La historia cuenta la aventura de Luna explorando el bosque.',
      },
    ],
    ...overrides,
  };
}

// ─── Tests: validarEstructura ───

describe('validarEstructura', () => {
  it('acepta estructura valida completa', () => {
    expect(validarEstructura(crearHistoriaValida())).toBe(true);
  });

  it('rechaza null', () => {
    expect(validarEstructura(null)).toBe(false);
  });

  it('rechaza objeto sin titulo', () => {
    const data = crearHistoriaValida();
    (data as Record<string, unknown>).titulo = '';
    expect(validarEstructura(data)).toBe(false);
  });

  it('rechaza si preguntas no son 4', () => {
    const data = crearHistoriaValida();
    data.preguntas = data.preguntas.slice(0, 2);
    expect(validarEstructura(data)).toBe(false);
  });

  it('rechaza si opciones no son 4', () => {
    const data = crearHistoriaValida();
    data.preguntas[0].opciones = ['a', 'b'];
    expect(validarEstructura(data)).toBe(false);
  });

  it('rechaza si respuestaCorrecta fuera de rango', () => {
    const data = crearHistoriaValida();
    data.preguntas[0].respuestaCorrecta = 5;
    expect(validarEstructura(data)).toBe(false);
  });

  it('rechaza si falta vocabularioNuevo como array', () => {
    const data = crearHistoriaValida() as Record<string, unknown>;
    data.vocabularioNuevo = 'string';
    expect(validarEstructura(data)).toBe(false);
  });
});

// ─── Tests: evaluarHistoria ───

describe('evaluarHistoria', () => {
  it('aprueba historia valida para nivel 1', () => {
    const historia = crearHistoriaValida();
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(true);
  });

  it('rechaza contenido con palabras prohibidas', () => {
    const historia = crearHistoriaValida({
      contenido: 'El nino encontro una pistola en el bosque.',
    });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('inseguro');
    expect(result.motivo).toContain('pistola');
  });

  it('rechaza contenido demasiado corto', () => {
    const historia = crearHistoriaValida({
      contenido: 'Hola mundo.',
    });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('corta');
  });

  it('rechaza contenido demasiado largo para el nivel', () => {
    const historia = crearHistoriaValida({
      contenido: Array(200).fill('Esta es una oracion de ejemplo con varias palabras.').join(' '),
    });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('larga');
  });

  it('rechaza si falta un tipo de pregunta', () => {
    const historia = crearHistoriaValida();
    historia.preguntas[0].tipo = 'inferencia'; // duplica inferencia, falta literal
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('literal');
  });

  it('rechaza titulo demasiado corto', () => {
    const historia = crearHistoriaValida({ titulo: 'ab' });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('Titulo');
  });

  it('verifica multiples palabras prohibidas', () => {
    const palabras = ['muerte', 'droga', 'sexo', 'odio', 'demonio'];
    for (const palabra of palabras) {
      const historia = crearHistoriaValida({
        contenido: `El cuento habla sobre ${palabra} en el bosque ` + 'y otras cosas divertidas para ninos. '.repeat(5),
      });
      const result = evaluarHistoria(historia, 1);
      expect(result.aprobada).toBe(false);
    }
  });
});

// ─── Tests: calcularMetadataHistoria ───

describe('calcularMetadataHistoria', () => {
  it('calcula palabras correctamente', () => {
    const meta = calcularMetadataHistoria('Hola mundo esto son cuatro palabras mas.', 6, 1);
    expect(meta.longitudPalabras).toBe(7);
  });

  it('calcula longitud media de oracion', () => {
    const meta = calcularMetadataHistoria('Primera oracion corta. Segunda oracion un poco mas larga aqui.', 7, 2);
    expect(meta.longitudOracionMedia).toBeGreaterThan(0);
  });

  it('incluye edad objetivo', () => {
    const meta = calcularMetadataHistoria('Texto de prueba.', 8, 3);
    expect(meta.edadObjetivo).toBe(8);
  });

  it('incluye tiempo esperado segun nivel', () => {
    const meta1 = calcularMetadataHistoria('Texto.', 5, 1);
    const meta4 = calcularMetadataHistoria('Texto.', 9, 4);
    expect(meta1.tiempoEsperadoMs).toBeLessThan(meta4.tiempoEsperadoMs);
  });
});
