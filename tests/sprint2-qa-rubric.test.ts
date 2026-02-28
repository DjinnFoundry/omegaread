/**
 * Tests para la rubrica QA de historias generadas.
 * Verifica: seguridad, longitud, estructura, tipos de preguntas.
 */
import { describe, it, expect } from 'vitest';
import {
  validarEstructura,
  evaluarHistoria,
  calcularMetadataHistoria,
  validarEstructuraHistoria,
  validarEstructuraPreguntas,
  evaluarHistoriaSinPreguntas,
  evaluarPreguntas,
  type StoryLLMOutput,
  type StoryOnlyLLMOutput,
  type QuestionsLLMOutput,
} from '@/lib/ai/qa-rubric';

// ─── Fixtures ───

function crearHistoriaValida(overrides: Partial<StoryLLMOutput> = {}): StoryLLMOutput {
  return {
    titulo: 'La aventura de Luna y el árbol brillante',
    contenido:
      'Luna era una gatita curiosa que vivía en un pueblo pequeño. ' +
      'Un día decidió explorar el bosque cercano. ' +
      'Encontró un río cristalino y vio peces de colores. ' +
      'Luna se quedó mirando el agua durante un buen rato. ' +
      'Cuando regresó a casa, su familia la estaba esperando con alegría.',
    vocabularioNuevo: ['cristalino', 'explorar'],
    preguntas: [
      {
        tipo: 'literal',
        pregunta: '¿Dónde vivía Luna?',
        opciones: ['En una ciudad', 'En un pueblo pequeño', 'En el bosque', 'En la playa'],
        respuestaCorrecta: 1,
        explicacion: 'El texto dice que Luna vivía en un pueblo pequeño.',
      },
      {
        tipo: 'inferencia',
        pregunta: '¿Por qué crees que la familia estaba esperando a Luna?',
        opciones: [
          'Porque estaban preocupados',
          'Porque tenían hambre',
          'Porque querían jugar',
          'Porque tenían sueño',
        ],
        respuestaCorrecta: 0,
        explicacion: 'Si Luna se fue al bosque, es probable que su familia se preocupara.',
      },
      {
        tipo: 'vocabulario',
        pregunta: '¿Qué significa "cristalino"?',
        opciones: ['Oscuro', 'Transparente y claro', 'Frío', 'Profundo'],
        respuestaCorrecta: 1,
        explicacion: 'Cristalino quiere decir que es muy claro, como el cristal.',
      },
      {
        tipo: 'resumen',
        pregunta: '¿De qué trata esta historia?',
        opciones: [
          'De una gatita que explora el bosque y regresa a casa',
          'De un río con peces de colores',
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
      contenido:
        'Marco caminaba por el parque cuando vio algo extrano detras de un arbol. ' +
        'Entonces se acerco y encontro una revista sobre sexo escondida entre las hojas secas del suelo.',
    });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('inseguro');
    expect(result.motivo).toContain('sexo');
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
    const palabras = ['sexo', 'sexual', 'desnudo'];
    for (const palabra of palabras) {
      const historia = crearHistoriaValida({
        contenido: `El cuento habla sobre ${palabra} en el bosque ` + 'y otras cosas divertidas para ninos. '.repeat(5),
      });
      const result = evaluarHistoria(historia, 1);
      expect(result.aprobada).toBe(false);
    }
  });

  it('rechaza apertura plana tipo texto escolar en niveles medios/altos', () => {
    const historia = crearHistoriaValida({
      contenido:
        'En este texto aprenderemos como funciona el viento en la ciudad. ' +
        'Despues veremos ejemplos de como se mueve el aire entre edificios. ' +
        'Al final sabremos por que los objetos vuelan cuando hay tormenta.',
    });
    const result = evaluarHistoria(historia, 3);
    expect(result.aprobada).toBe(false);
  });

  it('permite historias sin conectores narrativos explicitos', () => {
    const historia = crearHistoriaValida({
      contenido:
        'Los cohetes son maquinas. Los cohetes tienen motor. Los cohetes usan combustible. ' +
        'Los cohetes salen de la Tierra. Los cohetes llegan al espacio.',
    });
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(true);
  });

  it('rechaza opciones ambiguas por duplicado', () => {
    const historia = crearHistoriaValida();
    historia.preguntas[0].opciones = [
      'En una ciudad',
      'En una ciudad',
      'En el bosque',
      'En la playa',
    ];
    const result = evaluarHistoria(historia, 1);
    expect(result.aprobada).toBe(false);
    expect(result.motivo?.toLowerCase()).toContain('ambiguas');
  });

  it('rechaza titulo repetido contra historial reciente', () => {
    const historia = crearHistoriaValida({ titulo: 'La aventura de Luna y el árbol brillante' });
    const result = evaluarHistoria(historia, 1, {
      historiasAnteriores: ['La aventura de Luna y el árbol brillante', 'Otro título'],
    });
    expect(result.aprobada).toBe(false);
    expect(result.motivo?.toLowerCase()).toContain('repetido');
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

// ─────────────────────────────────────────────
// validarEstructuraHistoria: Flujo dividido
// ─────────────────────────────────────────────

describe('validarEstructuraHistoria (flujo dividido)', () => {
  it('acepta estructura valida sin preguntas', () => {
    const historia: StoryOnlyLLMOutput = {
      titulo: 'La aventura de Luna y el árbol brillante',
      contenido: 'Luna era una gatita curiosa que vivia en un pueblo pequeno. Exploro el bosque y encontro un rio cristalino.',
      vocabularioNuevo: ['cristalino', 'explorar'],
    };

    expect(validarEstructuraHistoria(historia)).toBe(true);
  });

  it('rechaza null', () => {
    expect(validarEstructuraHistoria(null)).toBe(false);
  });

  it('rechaza objeto sin titulo', () => {
    const historia: any = {
      contenido: 'Texto',
      vocabularioNuevo: [],
    };

    expect(validarEstructuraHistoria(historia)).toBe(false);
  });

  it('rechaza objeto sin contenido', () => {
    const historia: any = {
      titulo: 'Titulo',
      vocabularioNuevo: [],
    };

    expect(validarEstructuraHistoria(historia)).toBe(false);
  });

  it('rechaza objeto sin vocabularioNuevo como array', () => {
    const historia: any = {
      titulo: 'Titulo',
      contenido: 'Texto',
      vocabularioNuevo: 'no-es-array',
    };

    expect(validarEstructuraHistoria(historia)).toBe(false);
  });

  it('rechaza titulo vacio', () => {
    const historia: any = {
      titulo: '',
      contenido: 'Texto',
      vocabularioNuevo: [],
    };

    expect(validarEstructuraHistoria(historia)).toBe(false);
  });

  it('rechaza contenido vacio', () => {
    const historia: any = {
      titulo: 'Titulo',
      contenido: '',
      vocabularioNuevo: [],
    };

    expect(validarEstructuraHistoria(historia)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// validarEstructuraPreguntas: Flujo dividido
// ─────────────────────────────────────────────

describe('validarEstructuraPreguntas (flujo dividido)', () => {
  function crearPreguntaValida(overrides: any = {}) {
    return {
      tipo: 'literal',
      pregunta: 'Donde vivia Luna?',
      opciones: ['Opcion 1', 'Opcion 2', 'Opcion 3', 'Opcion 4'],
      respuestaCorrecta: 0,
      explicacion: 'Explicacion',
      ...overrides,
    };
  }

  it('acepta estructura valida con 4 preguntas', () => {
    const preguntas: QuestionsLLMOutput = {
      preguntas: [
        crearPreguntaValida({ tipo: 'literal' }),
        crearPreguntaValida({ tipo: 'inferencia' }),
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };

    expect(validarEstructuraPreguntas(preguntas)).toBe(true);
  });

  it('rechaza si preguntas no son exactamente 4', () => {
    const preguntasPocos: any = {
      preguntas: [crearPreguntaValida(), crearPreguntaValida()],
    };

    expect(validarEstructuraPreguntas(preguntasPocos)).toBe(false);

    const preguntasMany: any = {
      preguntas: Array.from({ length: 5 }).map(() => crearPreguntaValida()),
    };

    expect(validarEstructuraPreguntas(preguntasMany)).toBe(false);
  });

  it('rechaza si falta campo tipo en pregunta', () => {
    const preguntas: any = {
      preguntas: [
        { pregunta: 'P1', opciones: ['a', 'b', 'c', 'd'], respuestaCorrecta: 0, explicacion: 'E' },
        crearPreguntaValida(),
        crearPreguntaValida(),
        crearPreguntaValida(),
      ],
    };

    expect(validarEstructuraPreguntas(preguntas)).toBe(false);
  });

  it('rechaza si respuestaCorrecta esta fuera de rango', () => {
    const preguntas: any = {
      preguntas: [
        crearPreguntaValida({ respuestaCorrecta: 5 }),
        crearPreguntaValida(),
        crearPreguntaValida(),
        crearPreguntaValida(),
      ],
    };

    expect(validarEstructuraPreguntas(preguntas)).toBe(false);
  });

  it('rechaza opciones que no son 4', () => {
    const preguntas: any = {
      preguntas: [
        crearPreguntaValida({ opciones: ['a', 'b'] }),
        crearPreguntaValida(),
        crearPreguntaValida(),
        crearPreguntaValida(),
      ],
    };

    expect(validarEstructuraPreguntas(preguntas)).toBe(false);
  });

  it('rechaza null', () => {
    expect(validarEstructuraPreguntas(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// evaluarHistoriaSinPreguntas: Rubrica flujo dividido
// ─────────────────────────────────────────────

describe('evaluarHistoriaSinPreguntas (flujo dividido)', () => {
  function crearHistoriaValida(overrides: Partial<StoryOnlyLLMOutput> = {}): StoryOnlyLLMOutput {
    return {
      titulo: 'La aventura de Luna y el árbol brillante',
      contenido:
        'Luna era una gatita curiosa que vivia en un pueblo pequeno. ' +
        'Un dia decidio explorar el bosque cercano. ' +
        'Encontro un rio cristalino y vio peces de colores. ' +
        'Luna se quedo mirando el agua durante un buen rato. ' +
        'Cuando regreso a casa, su familia la estaba esperando con alegria.',
      vocabularioNuevo: ['cristalino', 'explorar'],
      ...overrides,
    };
  }

  it('aprueba historia valida sin preguntas', () => {
    const historia = crearHistoriaValida();
    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(true);
  });

  it('rechaza contenido con palabras prohibidas', () => {
    const historia = crearHistoriaValida({
      contenido:
        'Marco caminaba por el parque cuando vio algo extrano detras de un arbol. ' +
        'Entonces se acerco y encontro una revista sobre sexo escondida entre las hojas secas del suelo.',
    });

    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('inseguro');
  });

  it('rechaza contenido demasiado corto', () => {
    const historia = crearHistoriaValida({
      contenido: 'Hola mundo.',
    });

    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('corta');
  });

  it('rechaza contenido demasiado largo', () => {
    const historia = crearHistoriaValida({
      contenido: Array(200).fill('Esta es una oracion de ejemplo con varias palabras.').join(' '),
    });

    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('larga');
  });

  it('rechaza titulo muy corto', () => {
    const historia = crearHistoriaValida({
      titulo: 'ab',
    });

    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(false);
  });

  it('rechaza apertura plana tipo texto escolar en niveles medios/altos', () => {
    const historia = crearHistoriaValida({
      contenido: 'En este texto aprenderemos como funciona el viento. ' +
        'El viento es aire en movimiento. Sopla desde el norte y del sur. ' +
        'En las montanas hace mas viento. El viento mueve las hojas de los arboles. ' +
        'Cuando hay tormenta el viento es muy fuerte. A los ninos les encanta jugar con el viento.',
    });

    const result = evaluarHistoriaSinPreguntas(historia, 3);

    expect(result.aprobada).toBe(false);
  });

  it('permite historias sin conectores narrativos explicitos', () => {
    const historia = crearHistoriaValida({
      contenido: 'Los cohetes son maquinas. Los cohetes tienen motor. Los cohetes usan combustible. ' +
        'Los cohetes salen de la Tierra. Los cohetes llegan al espacio. ' +
        'Los astronautas viajas en cohetes. Los cohetes son muy veloces. ' +
        'Los cohetes pueden llevar satelites. Los cohetes son importantes para la ciencia.',
    });

    const result = evaluarHistoriaSinPreguntas(historia, 1);

    expect(result.aprobada).toBe(true);
  });
});

// ─────────────────────────────────────────────
// evaluarPreguntas: Rubrica flujo dividido
// ─────────────────────────────────────────────

describe('evaluarPreguntas (flujo dividido)', () => {
  function crearPreguntaValida(overrides: any = {}) {
    return {
      tipo: 'literal',
      pregunta: 'Donde vivia Luna?',
      opciones: ['Opcion 1', 'Opcion 2', 'Opcion 3', 'Opcion 4'],
      respuestaCorrecta: 0,
      explicacion: 'Explicacion',
      ...overrides,
    };
  }

  function crearPreguntasValidas(): QuestionsLLMOutput {
    return {
      preguntas: [
        crearPreguntaValida({ tipo: 'literal' }),
        crearPreguntaValida({ tipo: 'inferencia' }),
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };
  }

  it('aprueba preguntas estructuralmente validas', () => {
    const preguntas = crearPreguntasValidas();
    const result = evaluarPreguntas(preguntas);

    expect(result.aprobada).toBe(true);
  });

  it('rechaza si falta un tipo requerido', () => {
    const preguntas: QuestionsLLMOutput = {
      preguntas: [
        crearPreguntaValida({ tipo: 'literal' }),
        crearPreguntaValida({ tipo: 'literal' }), // duplicado, falta inferencia
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };

    const result = evaluarPreguntas(preguntas);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('inferencia');
  });

  it('rechaza opciones vacias', () => {
    const preguntas: QuestionsLLMOutput = {
      preguntas: [
        crearPreguntaValida({ opciones: ['Opcion 1', '', 'Opcion 3', 'Opcion 4'] }),
        crearPreguntaValida({ tipo: 'inferencia' }),
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };

    const result = evaluarPreguntas(preguntas);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('vacia');
  });

  it('rechaza respuestaCorrecta fuera de rango', () => {
    const preguntas: QuestionsLLMOutput = {
      preguntas: [
        crearPreguntaValida({ respuestaCorrecta: 5 }),
        crearPreguntaValida({ tipo: 'inferencia' }),
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };

    const result = evaluarPreguntas(preguntas);

    expect(result.aprobada).toBe(false);
    expect(result.motivo).toContain('invalido');
  });

  it('rechaza opciones duplicadas/ambiguas', () => {
    const preguntas: QuestionsLLMOutput = {
      preguntas: [
        crearPreguntaValida({ opciones: ['En el bosque', 'En el bosque', 'En la casa', 'En la ciudad'] }),
        crearPreguntaValida({ tipo: 'inferencia' }),
        crearPreguntaValida({ tipo: 'vocabulario' }),
        crearPreguntaValida({ tipo: 'resumen' }),
      ],
    };

    const result = evaluarPreguntas(preguntas);

    expect(result.aprobada).toBe(false);
    expect(result.motivo?.toLowerCase()).toContain('ambiguas');
  });
});
