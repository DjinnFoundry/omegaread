/**
 * Prompt templates para generacion de historias + preguntas.
 *
 * Variables de dificultad por nivel:
 * - Nivel 1 (5 anos): ~50-70 palabras, oraciones 5-8 palabras, vocabulario muy simple
 * - Nivel 2 (6-7 anos): ~80-110 palabras, oraciones 6-10 palabras, vocabulario simple
 * - Nivel 3 (7-8 anos): ~120-160 palabras, oraciones 8-14 palabras, vocabulario intermedio
 * - Nivel 4 (8-9 anos): ~160-220 palabras, oraciones 10-18 palabras, vocabulario avanzado
 */

export interface NivelConfig {
  palabrasMin: number;
  palabrasMax: number;
  oracionMin: number;
  oracionMax: number;
  complejidadLexica: string;
  densidadIdeas: string;
  tiempoEsperadoMs: number;
}

export const NIVELES_CONFIG: Record<number, NivelConfig> = {
  1: {
    palabrasMin: 50,
    palabrasMax: 70,
    oracionMin: 5,
    oracionMax: 8,
    complejidadLexica: 'Usa solo palabras que un nino de 5 anos entiende. Vocabulario muy basico y cotidiano.',
    densidadIdeas: 'Una idea simple por parrafo. Maximo 2-3 parrafos cortos.',
    tiempoEsperadoMs: 60_000,
  },
  2: {
    palabrasMin: 80,
    palabrasMax: 110,
    oracionMin: 6,
    oracionMax: 10,
    complejidadLexica: 'Vocabulario simple con 1-2 palabras nuevas que se entienden por contexto.',
    densidadIdeas: 'Una idea por parrafo con algun detalle descriptivo. 3-4 parrafos.',
    tiempoEsperadoMs: 90_000,
  },
  3: {
    palabrasMin: 120,
    palabrasMax: 160,
    oracionMin: 8,
    oracionMax: 14,
    complejidadLexica: 'Vocabulario intermedio. Incluye 2-3 palabras nuevas con contexto suficiente para inferir significado.',
    densidadIdeas: 'Dos ideas por parrafo, causa-efecto simple. 3-5 parrafos.',
    tiempoEsperadoMs: 120_000,
  },
  4: {
    palabrasMin: 160,
    palabrasMax: 220,
    oracionMin: 10,
    oracionMax: 18,
    complejidadLexica: 'Vocabulario variado con 3-4 palabras nuevas. Permite algunas subordinadas.',
    densidadIdeas: 'Ideas conectadas con relaciones causa-efecto y comparaciones. 4-6 parrafos.',
    tiempoEsperadoMs: 150_000,
  },
};

export function getNivelConfig(nivel: number): NivelConfig {
  const nivelEntero = Math.max(1, Math.min(4, Math.round(nivel)));
  return NIVELES_CONFIG[nivelEntero] ?? NIVELES_CONFIG[2];
}

export interface PromptInput {
  edadAnos: number;
  nivel: number;
  topicNombre: string;
  topicDescripcion: string;
  intereses: string[];
  personajesFavoritos?: string;
}

/**
 * Genera el prompt del sistema para el LLM.
 */
export function buildSystemPrompt(): string {
  return `Eres un autor de cuentos educativos para ninos hispanohablantes.
Tu trabajo es crear historias cortas que sean:
- Entretenidas y apropiadas para la edad indicada
- Escritas en espanol correcto (es-ES)
- Educativas sin ser aburridas
- Seguras: sin violencia, contenido sexual, lenguaje inapropiado, ni temas que asusten a un nino

Tambien generas preguntas de comprension lectora de 4 tipos:
1. LITERAL: pregunta sobre informacion explicita del texto
2. INFERENCIA: requiere leer entre lineas o deducir
3. VOCABULARIO: sobre el significado de una palabra en contexto
4. RESUMEN: sobre la idea principal del texto

IMPORTANTE:
- Responde SOLO con JSON valido, sin markdown ni texto extra
- Las opciones de cada pregunta deben tener exactamente 4 opciones
- La respuestaCorrecta es el indice (0-3) de la opcion correcta
- La explicacion debe ser breve y en lenguaje simple para el nino
- El vocabularioNuevo son palabras que el nino podria no conocer`;
}

/**
 * Genera el prompt del usuario con las variables especificas.
 */
export function buildUserPrompt(input: PromptInput): string {
  const config = getNivelConfig(input.nivel);

  const interesesExtra = input.intereses.length > 0
    ? `\nIntereses del nino: ${input.intereses.join(', ')}.`
    : '';

  const personajes = input.personajesFavoritos
    ? `\nPersonajes favoritos: ${input.personajesFavoritos}.`
    : '';

  return `Genera una historia y 4 preguntas de comprension para un nino.

PERFIL DEL NINO:
- Edad: ${input.edadAnos} anos
- Nivel de lectura: ${input.nivel} de 4
- Topic: ${input.topicNombre} (${input.topicDescripcion})${interesesExtra}${personajes}

REQUISITOS DE LA HISTORIA:
- Longitud: ${config.palabrasMin}-${config.palabrasMax} palabras
- Oraciones de ${config.oracionMin}-${config.oracionMax} palabras en promedio
- ${config.complejidadLexica}
- ${config.densidadIdeas}
- Titulo atractivo para un nino de ${input.edadAnos} anos

REQUISITOS DE PREGUNTAS:
Genera exactamente 4 preguntas, una de cada tipo: literal, inferencia, vocabulario, resumen.
Cada pregunta tiene 4 opciones y una explicacion.

FORMATO JSON OBLIGATORIO:
{
  "titulo": "string",
  "contenido": "string (la historia completa, parrafos separados por \\n\\n)",
  "vocabularioNuevo": ["palabra1", "palabra2"],
  "preguntas": [
    {
      "tipo": "literal",
      "pregunta": "string",
      "opciones": ["opcion1", "opcion2", "opcion3", "opcion4"],
      "respuestaCorrecta": 0,
      "explicacion": "string"
    },
    {
      "tipo": "inferencia",
      "pregunta": "string",
      "opciones": ["opcion1", "opcion2", "opcion3", "opcion4"],
      "respuestaCorrecta": 0,
      "explicacion": "string"
    },
    {
      "tipo": "vocabulario",
      "pregunta": "string",
      "opciones": ["opcion1", "opcion2", "opcion3", "opcion4"],
      "respuestaCorrecta": 0,
      "explicacion": "string"
    },
    {
      "tipo": "resumen",
      "pregunta": "string",
      "opciones": ["opcion1", "opcion2", "opcion3", "opcion4"],
      "respuestaCorrecta": 0,
      "explicacion": "string"
    }
  ]
}`;
}
