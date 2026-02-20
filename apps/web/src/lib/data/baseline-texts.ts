/**
 * Textos y preguntas para el test de baseline de lectura.
 *
 * 4 textos de dificultad creciente (nivel 1-4).
 * Cada texto tiene 3-4 preguntas de comprension:
 *   - literal (informacion explicita)
 *   - inferencia (leer entre lineas)
 *   - vocabulario (palabra en contexto)
 *   - resumen (idea principal, solo en nivel 3-4)
 *
 * Contenido neutral (no personalizado) y apropiado para 5-9 anos.
 */

import type { ComprehensionQuestion, TipoPregunta } from '../types/reading';

export interface BaselineText {
  id: string;
  nivel: number;
  titulo: string;
  contenido: string;
  /** Palabras aproximadas */
  palabras: number;
  /** Tiempo esperado de lectura en ms (referencia para ritmo) */
  tiempoEsperadoMs: number;
  preguntas: ComprehensionQuestion[];
}

export const BASELINE_TEXTS: BaselineText[] = [
  // ─────────────────────────────────────────
  // NIVEL 1: Muy facil (5-6 anos, ~50 palabras)
  // ─────────────────────────────────────────
  {
    id: 'baseline-n1',
    nivel: 1,
    titulo: 'El gato de la abuela',
    contenido:
      'La abuela tiene un gato naranja. Se llama Sol. ' +
      'A Sol le gusta dormir en la ventana. Cuando sale el sol de verdad, ' +
      'Sol abre los ojos y estira las patas. Luego va a la cocina ' +
      'porque tiene hambre. La abuela le da su comida favorita: pescado.',
    palabras: 48,
    tiempoEsperadoMs: 60000, // 1 minuto
    preguntas: [
      {
        id: 'n1-literal',
        tipo: 'literal' as TipoPregunta,
        pregunta: 'Como se llama el gato de la abuela?',
        opciones: ['Sol', 'Luna', 'Naranja', 'Pescado'],
        respuestaCorrecta: 0,
      },
      {
        id: 'n1-inferencia',
        tipo: 'inferencia' as TipoPregunta,
        pregunta: 'Por que crees que el gato va a la cocina?',
        opciones: [
          'Porque quiere jugar',
          'Porque tiene frio',
          'Porque tiene hambre',
          'Porque busca a la abuela',
        ],
        respuestaCorrecta: 2,
      },
      {
        id: 'n1-vocabulario',
        tipo: 'vocabulario' as TipoPregunta,
        pregunta: 'Que significa "estira las patas"?',
        opciones: [
          'Que corre muy rapido',
          'Que tiene las patas largas',
          'Que esta enfermo',
          'Que se levanta y se despereza',
        ],
        respuestaCorrecta: 3,
      },
    ],
  },

  // ─────────────────────────────────────────
  // NIVEL 2: Facil (6-7 anos, ~80 palabras)
  // ─────────────────────────────────────────
  {
    id: 'baseline-n2',
    nivel: 2,
    titulo: 'La caja misteriosa',
    contenido:
      'Marcos encontro una caja de madera debajo del arbol grande del parque. ' +
      'La caja tenia un candado pequeno pero estaba abierto. Dentro habia ' +
      'un cuaderno con dibujos de pajaros de muchos colores. Cada pagina ' +
      'tenia el nombre del pajaro y donde vivia. Marcos no sabia quien ' +
      'habia dejado la caja alli. Decidio llevarla a casa para cuidar el ' +
      'cuaderno y buscar al dueno. Al dia siguiente, puso un cartel en el ' +
      'parque que decia: "Encontre tu cuaderno de pajaros".',
    palabras: 82,
    tiempoEsperadoMs: 90000, // 1.5 minutos
    preguntas: [
      {
        id: 'n2-literal',
        tipo: 'literal' as TipoPregunta,
        pregunta: 'Que habia dentro de la caja?',
        opciones: [
          'Un pajaro de colores',
          'Un cuaderno con dibujos de pajaros',
          'Un candado roto',
          'Una carta para Marcos',
        ],
        respuestaCorrecta: 1,
      },
      {
        id: 'n2-inferencia',
        tipo: 'inferencia' as TipoPregunta,
        pregunta: 'Por que puso Marcos un cartel en el parque?',
        opciones: [
          'Porque queria encontrar al dueno del cuaderno',
          'Porque queria vender la caja',
          'Porque le gustaban los pajaros',
          'Porque queria hacer amigos',
        ],
        respuestaCorrecta: 0,
      },
      {
        id: 'n2-vocabulario',
        tipo: 'vocabulario' as TipoPregunta,
        pregunta: 'Que es un "candado"?',
        opciones: [
          'Un tipo de caja',
          'Un dibujo en el cuaderno',
          'Un cierre con llave que protege algo',
          'Un arbol del parque',
        ],
        respuestaCorrecta: 2,
      },
    ],
  },

  // ─────────────────────────────────────────
  // NIVEL 3: Medio (7-8 anos, ~120 palabras)
  // ─────────────────────────────────────────
  {
    id: 'baseline-n3',
    nivel: 3,
    titulo: 'El viaje de las tortugas',
    contenido:
      'Cada ano, miles de tortugas marinas viajan cientos de kilometros por el oceano ' +
      'para llegar a la misma playa donde nacieron. Alli ponen sus huevos en la arena. ' +
      'Las tortugas cavan un agujero profundo con sus aletas traseras, depositan los ' +
      'huevos y los cubren con cuidado. Despues de unas semanas, las crias rompen el ' +
      'cascaron y salen de noche. Las pequenas tortugas se guian por la luz de la luna ' +
      'para encontrar el camino hacia el mar. Este viaje es peligroso porque hay ' +
      'cangrejos y aves que quieren atraparlas. Solo unas pocas de cada cien llegan ' +
      'al agua. Los cientificos estudian estas tortugas para protegerlas, porque cada ' +
      'vez hay menos en el mundo.',
    palabras: 118,
    tiempoEsperadoMs: 120000, // 2 minutos
    preguntas: [
      {
        id: 'n3-literal',
        tipo: 'literal' as TipoPregunta,
        pregunta: 'A donde viajan las tortugas para poner sus huevos?',
        opciones: [
          'A cualquier playa cercana',
          'A una isla desierta',
          'Al fondo del oceano',
          'A la misma playa donde nacieron',
        ],
        respuestaCorrecta: 3,
      },
      {
        id: 'n3-inferencia',
        tipo: 'inferencia' as TipoPregunta,
        pregunta: 'Por que salen las crias de noche y no de dia?',
        opciones: [
          'Porque les gusta la oscuridad',
          'Porque de noche hace menos calor y hay menos depredadores',
          'Porque la luna las ayuda a ver mejor',
          'Porque las tortugas adultas las despiertan de noche',
        ],
        respuestaCorrecta: 1,
      },
      {
        id: 'n3-vocabulario',
        tipo: 'vocabulario' as TipoPregunta,
        pregunta: 'Que significa "depositan los huevos"?',
        opciones: [
          'Que los colocan con cuidado en un lugar',
          'Que los rompen',
          'Que los llevan al mar',
          'Que los esconden de otros animales',
        ],
        respuestaCorrecta: 0,
      },
      {
        id: 'n3-resumen',
        tipo: 'resumen' as TipoPregunta,
        pregunta: 'Cual es la idea principal de este texto?',
        opciones: [
          'Los cangrejos y las aves se comen a las tortugas',
          'Los cientificos estudian animales en la playa',
          'Las tortugas hacen un viaje largo y peligroso para tener crias',
          'La luna ilumina las playas por la noche',
        ],
        respuestaCorrecta: 2,
      },
    ],
  },

  // ─────────────────────────────────────────
  // NIVEL 4: Medio-alto (8-9 anos, ~160 palabras)
  // ─────────────────────────────────────────
  {
    id: 'baseline-n4',
    nivel: 4,
    titulo: 'La biblioteca invisible',
    contenido:
      'En la ciudad de Alejandria, hace mas de dos mil anos, existio la biblioteca mas ' +
      'grande del mundo antiguo. Guardaba miles de rollos de papiro con textos sobre ' +
      'matematicas, astronomia, medicina y poesia. Personas de muchos paises viajaban ' +
      'hasta alli solo para leer y aprender. Los estudiosos que trabajaban en la ' +
      'biblioteca copiaban libros a mano, porque todavia no existia la imprenta. ' +
      'Nadie sabe exactamente como desaparecio la biblioteca. Algunos historiadores ' +
      'creen que hubo un incendio, otros piensan que fue destruida poco a poco durante ' +
      'siglos. Lo que si sabemos es que se perdieron conocimientos que tardaron mucho ' +
      'tiempo en recuperarse. Hoy en dia tenemos bibliotecas digitales que guardan ' +
      'millones de libros en computadoras. A diferencia de la antigua biblioteca, ' +
      'estas no pueden quemarse. Pero necesitan electricidad y servidores para ' +
      'funcionar, asi que tienen sus propios riesgos.',
    palabras: 142,
    tiempoEsperadoMs: 150000, // 2.5 minutos
    preguntas: [
      {
        id: 'n4-literal',
        tipo: 'literal' as TipoPregunta,
        pregunta: 'Por que los estudiosos copiaban libros a mano?',
        opciones: [
          'Porque les gustaba dibujar',
          'Porque no sabian leer bien',
          'Porque los libros eran muy pequenos',
          'Porque todavia no existia la imprenta',
        ],
        respuestaCorrecta: 3,
      },
      {
        id: 'n4-inferencia',
        tipo: 'inferencia' as TipoPregunta,
        pregunta: 'Que quiere decir el autor cuando dice que las bibliotecas digitales "tienen sus propios riesgos"?',
        opciones: [
          'Que dependen de la tecnologia y podrian fallar sin electricidad',
          'Que los libros digitales son dificiles de leer',
          'Que alguien podria incendiar los servidores',
          'Que las computadoras son muy caras',
        ],
        respuestaCorrecta: 0,
      },
      {
        id: 'n4-vocabulario',
        tipo: 'vocabulario' as TipoPregunta,
        pregunta: 'Que son "rollos de papiro"?',
        opciones: [
          'Tubos de metal para guardar monedas',
          'Hojas enrolladas de un material antiguo para escribir',
          'Juegos de la antigua Alejandria',
          'Mapas del mundo antiguo',
        ],
        respuestaCorrecta: 1,
      },
      {
        id: 'n4-resumen',
        tipo: 'resumen' as TipoPregunta,
        pregunta: 'Cual es la idea principal del texto?',
        opciones: [
          'Alejandria era una ciudad muy bonita',
          'Los incendios son el peor enemigo de las bibliotecas',
          'Guardar el conocimiento siempre ha sido importante y cada epoca tiene sus desafios',
          'Las bibliotecas digitales son mejores que las antiguas',
        ],
        respuestaCorrecta: 2,
      },
    ],
  },
];
