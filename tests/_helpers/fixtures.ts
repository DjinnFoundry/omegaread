/**
 * Test fixtures and factories.
 * Provides deterministic test data for all test suites.
 */

export const UUID_TEST = '00000000-0000-4000-8000-000000000001';
export const UUID_PARENT = '00000000-0000-4000-8000-000000000010';
export const UUID_STUDENT = '00000000-0000-4000-8000-000000000020';
export const UUID_SESSION = '00000000-0000-4000-8000-000000000030';
export const UUID_STORY = '00000000-0000-4000-8000-000000000040';

export function createMockParent(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_PARENT,
    email: 'padre@test.com',
    passwordHash: '$2a$12$hashedpassword',
    nombre: 'Padre Test',
    idioma: 'es-ES',
    config: {},
    creadoEn: new Date('2026-01-01'),
    actualizadoEn: new Date('2026-01-01'),
    students: [],
    ...overrides,
  };
}

export function createMockStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_STUDENT,
    parentId: UUID_PARENT,
    nombre: 'Nino Test',
    fechaNacimiento: new Date('2019-06-15'),
    idioma: 'es-ES',
    dialecto: 'es-ES',
    curso: '1o-primaria',
    centroEscolar: null,
    rutinaLectura: 'diaria',
    acompanamiento: 'a-veces',
    senalesDificultad: {},
    intereses: ['espacio', 'animales'],
    temasEvitar: [],
    personajesFavoritos: null,
    contextoPersonal: null,
    nivelLectura: 2,
    comprensionScore: 0.75,
    baselineConfianza: 'medio',
    baselineCompletado: true,
    perfilCompleto: true,
    eloGlobal: 1000,
    eloLiteral: 1000,
    eloInferencia: 1000,
    eloVocabulario: 1000,
    eloResumen: 1000,
    eloRd: 350,
    accesibilidad: {},
    creadoEn: new Date('2026-01-01'),
    actualizadoEn: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_SESSION,
    studentId: UUID_STUDENT,
    tipoActividad: 'lectura',
    modulo: 'lectura-adaptativa',
    duracionSegundos: 300,
    completada: false,
    estrellasGanadas: 0,
    stickerGanado: null,
    storyId: UUID_STORY,
    metadata: {},
    wpmPromedio: null,
    wpmPorPagina: null,
    totalPaginas: null,
    iniciadaEn: new Date('2026-01-15T10:00:00Z'),
    finalizadaEn: null,
    ...overrides,
  };
}

export function createMockResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_TEST,
    sessionId: UUID_SESSION,
    ejercicioId: 'q-1',
    tipoEjercicio: 'literal',
    pregunta: 'Donde vivia Luna?',
    respuesta: '1',
    respuestaCorrecta: '1',
    correcta: true,
    tiempoRespuestaMs: 5000,
    intentoNumero: 1,
    metadata: {},
    creadaEn: new Date('2026-01-15T10:05:00Z'),
    ...overrides,
  };
}

export function createMockStory(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_STORY,
    studentId: UUID_STUDENT,
    topicSlug: 'sistema-solar',
    titulo: 'El viaje de Luna',
    contenido: 'Luna era una gatita curiosa. Un dia decidio explorar el bosque.',
    nivel: 2,
    metadata: {
      longitudPalabras: 50,
      longitudOracionMedia: 10,
      vocabularioNuevo: ['cristalino'],
      edadObjetivo: 6,
      tiempoEsperadoMs: 60000,
    },
    modeloGeneracion: 'glm-5',
    promptVersion: 'v3-split',
    aprobadaQA: true,
    motivoRechazo: null,
    reutilizable: true,
    creadoEn: new Date('2026-01-15T09:55:00Z'),
    questions: [],
    ...overrides,
  };
}

export function createMockEloRatings(overrides: Record<string, unknown> = {}) {
  return {
    global: 1000,
    literal: 1000,
    inferencia: 1000,
    vocabulario: 1000,
    resumen: 1000,
    rd: 350,
    ...overrides,
  };
}

export function createMockStoryLLMOutput() {
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
        pregunta: 'Por que crees que la familia estaba esperando?',
        opciones: ['Estaban preocupados', 'Tenian hambre', 'Querian jugar', 'Tenian sueno'],
        respuestaCorrecta: 0,
        explicacion: 'Si Luna se fue al bosque, su familia se preocupo.',
      },
      {
        tipo: 'vocabulario',
        pregunta: 'Que significa cristalino?',
        opciones: ['Oscuro', 'Transparente y claro', 'Frio', 'Profundo'],
        respuestaCorrecta: 1,
        explicacion: 'Cristalino quiere decir muy claro.',
      },
      {
        tipo: 'resumen',
        pregunta: 'De que trata esta historia?',
        opciones: [
          'Una gatita explora el bosque y regresa',
          'Un rio con peces de colores',
          'Una familia que busca a su gato',
          'Un pueblo con muchos gatos',
        ],
        respuestaCorrecta: 0,
        explicacion: 'La historia cuenta la aventura de Luna.',
      },
    ],
  };
}
