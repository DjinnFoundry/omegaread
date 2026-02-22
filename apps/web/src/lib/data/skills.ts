/**
 * Skill Tree para OmegaRead.
 *
 * Cada skill pertenece a un dominio y tiene un nivel (1, 2, 3).
 * - Nivel 1: siempre desbloqueado, sin prerequisitos.
 * - Nivel 2: requiere 2 skills de nivel 1 del mismo dominio.
 * - Nivel 3: requiere 2 skills de nivel 2, edad minima 7.
 *
 * El campo `conceptoNucleo` es el mas importante: va directamente al prompt
 * del LLM para generar la historia. Debe explicar en 1-2 frases lo que
 * el nino debe aprender.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DominioSlug =
  | 'naturaleza-vida'
  | 'como-funcionan'
  | 'tiempo-personas'
  | 'universo'
  | 'cuerpo-mente';

export interface DominioInfo {
  slug: DominioSlug;
  nombre: string;
  emoji: string;
  orden: number;
  nombreNiveles: [string, string, string]; // names for levels 1, 2, 3
}

export interface SkillDef {
  slug: string;
  nombre: string;
  emoji: string;
  dominio: DominioSlug;
  nivel: 1 | 2 | 3;
  conceptoNucleo: string;
  prerequisitos: string[]; // skill slugs required (empty for level 1)
  edadMinima: number;
  edadMaxima: number;
  orden: number;
}

// ---------------------------------------------------------------------------
// Dominios
// ---------------------------------------------------------------------------

export const DOMINIOS: DominioInfo[] = [
  {
    slug: 'naturaleza-vida',
    nombre: 'Naturaleza y Vida',
    emoji: '🌿',
    orden: 1,
    nombreNiveles: ['Explorador', 'Naturalista', 'Biologo'],
  },
  {
    slug: 'como-funcionan',
    nombre: 'Como Funcionan las Cosas',
    emoji: '🔧',
    orden: 2,
    nombreNiveles: ['Aprendiz', 'Constructor', 'Ingeniero'],
  },
  {
    slug: 'tiempo-personas',
    nombre: 'Tiempo, Personas y Lugares',
    emoji: '🗺️',
    orden: 3,
    nombreNiveles: ['Viajero', 'Cronista', 'Historiador'],
  },
  {
    slug: 'universo',
    nombre: 'El Universo',
    emoji: '🚀',
    orden: 4,
    nombreNiveles: ['Astronomo Novato', 'Explorador Espacial', 'Cosmologo'],
  },
  {
    slug: 'cuerpo-mente',
    nombre: 'Cuerpo y Mente',
    emoji: '🧠',
    orden: 5,
    nombreNiveles: ['Explorador Interior', 'Conocedor', 'Cientifico'],
  },
];

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

let _orden = 0;
function o() {
  return ++_orden;
}

export const SKILLS: SkillDef[] = [
  // =========================================================================
  // NATURALEZA Y VIDA 🌿
  // =========================================================================

  // --- Nivel 1 (siempre desbloqueado) ---
  {
    slug: 'animales-que-vuelan',
    nombre: 'Animales que vuelan',
    emoji: '🦅',
    dominio: 'naturaleza-vida',
    nivel: 1,
    conceptoNucleo:
      'Las aves vuelan gracias a sus alas, que son curvas por arriba y planas por abajo. El aire pasa mas rapido por arriba, creando una fuerza que las empuja hacia el cielo.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'plantas-que-crecen',
    nombre: 'Plantas que crecen',
    emoji: '🌱',
    dominio: 'naturaleza-vida',
    nivel: 1,
    conceptoNucleo:
      'Las plantas fabrican su propia comida usando la luz del sol, el agua y el aire. Sus raices absorben agua, sus hojas capturan la luz, y asi crecen sin parar.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'el-agua-cambia',
    nombre: 'El agua cambia',
    emoji: '💧',
    dominio: 'naturaleza-vida',
    nivel: 1,
    conceptoNucleo:
      'El agua puede ser liquida, solida (hielo) o gas (vapor). Cambia de forma segun la temperatura: el calor la evapora, el frio la congela.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'animales-en-invierno',
    nombre: 'Animales en invierno',
    emoji: '🐻',
    dominio: 'naturaleza-vida',
    nivel: 1,
    conceptoNucleo:
      'Algunos animales hibernan en invierno (duermen meses sin comer). Otros migran a lugares calidos. Cada especie tiene su estrategia para sobrevivir al frio.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 2 (requiere 2 skills nivel 1) ---
  {
    slug: 'cadenas-alimentarias',
    nombre: 'Cadenas alimentarias',
    emoji: '🔗',
    dominio: 'naturaleza-vida',
    nivel: 2,
    conceptoNucleo:
      'Todos los seres vivos estan conectados por cadenas alimentarias. Las plantas producen comida, los herbivoros comen plantas, y los carnivoros cazan herbivoros.',
    prerequisitos: ['animales-que-vuelan', 'plantas-que-crecen'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'ecosistemas',
    nombre: 'Ecosistemas',
    emoji: '🌳',
    dominio: 'naturaleza-vida',
    nivel: 2,
    conceptoNucleo:
      'Un ecosistema es una comunidad de seres vivos que dependen unos de otros. El bosque, el oceano y el desierto son ecosistemas diferentes con reglas distintas.',
    prerequisitos: ['animales-en-invierno', 'el-agua-cambia'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'reproduccion-seres-vivos',
    nombre: 'Reproduccion de seres vivos',
    emoji: '🥚',
    dominio: 'naturaleza-vida',
    nivel: 2,
    conceptoNucleo:
      'Los seres vivos se reproducen para que su especie continue. Las plantas usan semillas, los insectos ponen huevos, los mamiferos tienen crias.',
    prerequisitos: ['plantas-que-crecen', 'animales-que-vuelan'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 3 (requiere 2 skills nivel 2, edad minima 7) ---
  {
    slug: 'evolucion-accesible',
    nombre: 'Evolucion accesible',
    emoji: '🧬',
    dominio: 'naturaleza-vida',
    nivel: 3,
    conceptoNucleo:
      'Los animales cambian muy lentamente a lo largo de miles de anos. Los que mejor se adaptan al entorno sobreviven y tienen crias parecidas a ellos.',
    prerequisitos: ['cadenas-alimentarias', 'ecosistemas'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'biodiversidad',
    nombre: 'Biodiversidad',
    emoji: '🌍',
    dominio: 'naturaleza-vida',
    nivel: 3,
    conceptoNucleo:
      'En la Tierra hay millones de especies diferentes. Cada una cumple un papel importante. Cuando desaparece una especie, todo el ecosistema se ve afectado.',
    prerequisitos: ['ecosistemas', 'reproduccion-seres-vivos'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },

  // =========================================================================
  // COMO FUNCIONAN LAS COSAS 🔧
  // =========================================================================

  // --- Nivel 1 ---
  {
    slug: 'fuerzas-empujar-jalar',
    nombre: 'Fuerzas: empujar y jalar',
    emoji: '💪',
    dominio: 'como-funcionan',
    nivel: 1,
    conceptoNucleo:
      'Todo se mueve porque algo lo empuja o lo jala. Para mover algo pesado necesitas mas fuerza. Las fuerzas pueden hacer que las cosas aceleren, frenen o cambien de direccion.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'por-que-flotan',
    nombre: 'Por que flotan las cosas',
    emoji: '🚢',
    dominio: 'como-funcionan',
    nivel: 1,
    conceptoNucleo:
      'Las cosas flotan cuando pesan menos que el agua que desplazan. Un barco de metal flota porque tiene mucho aire dentro, asi desplaza mucha agua pero pesa poco.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'luz-y-sombras',
    nombre: 'Luz y sombras',
    emoji: '🔦',
    dominio: 'como-funcionan',
    nivel: 1,
    conceptoNucleo:
      'La luz viaja en linea recta. Cuando un objeto bloquea la luz, se forma una sombra detras. Las sombras cambian de tamano segun lo cerca que estes de la luz.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'el-calor-viaja',
    nombre: 'El calor viaja',
    emoji: '♨️',
    dominio: 'como-funcionan',
    nivel: 1,
    conceptoNucleo:
      'El calor siempre viaja de lo caliente a lo frio. Por eso una cuchara de metal en sopa caliente se calienta, pero una de madera no tanto: el metal conduce mejor el calor.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 2 ---
  {
    slug: 'maquinas-simples',
    nombre: 'Maquinas simples',
    emoji: '🔩',
    dominio: 'como-funcionan',
    nivel: 2,
    conceptoNucleo:
      'Las palancas, poleas y ruedas son maquinas simples que multiplican tu fuerza. Un sube-y-baja es una palanca: poca fuerza en un lado levanta mucho peso en el otro.',
    prerequisitos: ['fuerzas-empujar-jalar', 'por-que-flotan'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'como-vuelan-cosas',
    nombre: 'Como vuelan las cosas',
    emoji: '✈️',
    dominio: 'como-funcionan',
    nivel: 2,
    conceptoNucleo:
      'Los aviones vuelan gracias a la forma de sus alas. El aire pasa mas rapido por arriba que por abajo, creando una fuerza hacia arriba llamada sustentacion.',
    prerequisitos: ['por-que-flotan', 'fuerzas-empujar-jalar'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'circuitos-electricos',
    nombre: 'Circuitos electricos',
    emoji: '⚡',
    dominio: 'como-funcionan',
    nivel: 2,
    conceptoNucleo:
      'La electricidad necesita un camino cerrado (circuito) para fluir. Si el circuito se rompe, la corriente se detiene y la luz se apaga.',
    prerequisitos: ['el-calor-viaja', 'luz-y-sombras'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 3 ---
  {
    slug: 'estructuras-puentes',
    nombre: 'Estructuras y puentes',
    emoji: '🌉',
    dominio: 'como-funcionan',
    nivel: 3,
    conceptoNucleo:
      'Los puentes y edificios se mantienen en pie gracias a como distribuyen el peso. Un arco reparte la fuerza hacia los lados, por eso los puentes de arco son tan resistentes.',
    prerequisitos: ['maquinas-simples', 'como-vuelan-cosas'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'como-piensan-ordenadores',
    nombre: 'Como piensan los ordenadores',
    emoji: '💻',
    dominio: 'como-funcionan',
    nivel: 3,
    conceptoNucleo:
      'Los ordenadores solo entienden dos cosas: encendido y apagado (1 y 0). Combinando millones de estos interruptores muy rapido, pueden hacer calculos, mostrar imagenes y reproducir musica.',
    prerequisitos: ['circuitos-electricos', 'maquinas-simples'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },

  // =========================================================================
  // TIEMPO, PERSONAS Y LUGARES 🗺️
  // =========================================================================

  // --- Nivel 1 ---
  {
    slug: 'que-son-mapas',
    nombre: 'Que son los mapas',
    emoji: '🗺️',
    dominio: 'tiempo-personas',
    nivel: 1,
    conceptoNucleo:
      'Un mapa es un dibujo de un lugar visto desde arriba. Los mapas usan simbolos para representar rios, montanas, caminos y ciudades. Gracias a ellos podemos encontrar cualquier lugar.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'ninos-otros-paises',
    nombre: 'Ninos de otros paises',
    emoji: '🌏',
    dominio: 'tiempo-personas',
    nivel: 1,
    conceptoNucleo:
      'Los ninos de otros paises viven de formas muy diferentes. Algunos van al colegio en canoa, otros viven sin electricidad, y todos juegan a cosas distintas pero divertidas.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'prehistoria-accesible',
    nombre: 'La prehistoria',
    emoji: '🦴',
    dominio: 'tiempo-personas',
    nivel: 1,
    conceptoNucleo:
      'Hace miles de anos, los humanos vivian en cuevas, cazaban animales y hacian herramientas de piedra. No tenian libros ni colegios: aprendian observando a los mayores.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'grandes-exploradores',
    nombre: 'Grandes exploradores',
    emoji: '⛵',
    dominio: 'tiempo-personas',
    nivel: 1,
    conceptoNucleo:
      'Personas valientes como Zheng He, Leif Erikson y Maria Sibylla Merian viajaron a lugares desconocidos. Descubrieron tierras, animales y plantas que nadie habia visto.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 2 ---
  {
    slug: 'civilizaciones-antiguas',
    nombre: 'Civilizaciones antiguas',
    emoji: '🏛️',
    dominio: 'tiempo-personas',
    nivel: 2,
    conceptoNucleo:
      'Los egipcios, griegos y mayas construyeron ciudades increibles hace miles de anos. Inventaron la escritura, las matematicas y edificios que siguen en pie hoy.',
    prerequisitos: ['prehistoria-accesible', 'que-son-mapas'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'inventos-que-cambiaron',
    nombre: 'Inventos que cambiaron el mundo',
    emoji: '💡',
    dominio: 'tiempo-personas',
    nivel: 2,
    conceptoNucleo:
      'La rueda, la imprenta y la brujula cambiaron el mundo. Cada invento resolvio un problema y abrio la puerta a miles de inventos mas.',
    prerequisitos: ['grandes-exploradores', 'prehistoria-accesible'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'como-se-transmiten-tradiciones',
    nombre: 'Como se transmiten las tradiciones',
    emoji: '🎭',
    dominio: 'tiempo-personas',
    nivel: 2,
    conceptoNucleo:
      'Las tradiciones se pasan de padres a hijos: canciones, fiestas, recetas de cocina. Cada cultura conserva lo que es importante para ella.',
    prerequisitos: ['ninos-otros-paises', 'grandes-exploradores'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 3 ---
  {
    slug: 'revolucion-industrial',
    nombre: 'La revolucion industrial',
    emoji: '🏭',
    dominio: 'tiempo-personas',
    nivel: 3,
    conceptoNucleo:
      'Hace 200 anos, las maquinas de vapor cambiaron todo. La gente dejo el campo y fue a las fabricas. Se podia hacer mucho mas rapido, pero el trabajo era muy duro.',
    prerequisitos: ['inventos-que-cambiaron', 'civilizaciones-antiguas'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'arqueologia',
    nombre: 'Arqueologia',
    emoji: '🔍',
    dominio: 'tiempo-personas',
    nivel: 3,
    conceptoNucleo:
      'Los arqueologos descubren como vivian las personas del pasado estudiando lo que dejaron: vasijas, herramientas, huesos, y edificios enterrados bajo la tierra.',
    prerequisitos: ['civilizaciones-antiguas', 'como-se-transmiten-tradiciones'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },

  // =========================================================================
  // EL UNIVERSO 🚀
  // =========================================================================

  // --- Nivel 1 ---
  {
    slug: 'el-sol',
    nombre: 'El sol',
    emoji: '☀️',
    dominio: 'universo',
    nivel: 1,
    conceptoNucleo:
      'El sol es una estrella enorme hecha de gas muy caliente. Esta tan lejos que su luz tarda 8 minutos en llegar a la Tierra. Sin el sol, no habria vida en nuestro planeta.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'la-luna',
    nombre: 'La luna',
    emoji: '🌙',
    dominio: 'universo',
    nivel: 1,
    conceptoNucleo:
      'La luna gira alrededor de la Tierra. No tiene luz propia: brilla porque refleja la luz del sol. Por eso cambia de forma cada noche: vemos la parte que el sol ilumina.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'las-estrellas',
    nombre: 'Las estrellas',
    emoji: '⭐',
    dominio: 'universo',
    nivel: 1,
    conceptoNucleo:
      'Las estrellas son como soles muy lejanos. Algunas son mas grandes y calientes que nuestro sol, otras mas pequenas y frias. Cuando miras el cielo de noche, ves miles de ellas.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'sistema-solar',
    nombre: 'El sistema solar',
    emoji: '🪐',
    dominio: 'universo',
    nivel: 1,
    conceptoNucleo:
      'Nuestro sistema solar tiene 8 planetas que giran alrededor del sol. La Tierra es el tercero. Cada planeta es diferente: Marte es rojo, Jupiter es gigante, Saturno tiene anillos.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 2 ---
  {
    slug: 'la-gravedad',
    nombre: 'La gravedad',
    emoji: '🍎',
    dominio: 'universo',
    nivel: 2,
    conceptoNucleo:
      'La gravedad es una fuerza que atrae las cosas entre si. La Tierra nos atrae hacia abajo (por eso no flotamos). El sol atrae a los planetas y los mantiene girando a su alrededor.',
    prerequisitos: ['el-sol', 'la-luna'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'planetas-detalle',
    nombre: 'Los planetas en detalle',
    emoji: '🔭',
    dominio: 'universo',
    nivel: 2,
    conceptoNucleo:
      'Cada planeta del sistema solar es un mundo unico. Venus es tan caliente que derretiria plomo. Neptuno tiene vientos mas rapidos que cualquier huracan de la Tierra.',
    prerequisitos: ['sistema-solar', 'las-estrellas'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'cometas-asteroides',
    nombre: 'Cometas y asteroides',
    emoji: '☄️',
    dominio: 'universo',
    nivel: 2,
    conceptoNucleo:
      'Los cometas son bolas de hielo y roca que viajan por el espacio. Cuando se acercan al sol, el hielo se derrite y forma una cola brillante que puede verse desde la Tierra.',
    prerequisitos: ['sistema-solar', 'el-sol'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 3 ---
  {
    slug: 'galaxias',
    nombre: 'Las galaxias',
    emoji: '🌌',
    dominio: 'universo',
    nivel: 3,
    conceptoNucleo:
      'Una galaxia es un grupo de miles de millones de estrellas. Nuestra galaxia se llama Via Lactea. Hay tantas galaxias en el universo que no podemos contarlas todas.',
    prerequisitos: ['las-estrellas', 'planetas-detalle'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'agujeros-negros',
    nombre: 'Agujeros negros',
    emoji: '🕳️',
    dominio: 'universo',
    nivel: 3,
    conceptoNucleo:
      'Un agujero negro se forma cuando una estrella gigante muere y se aplasta sobre si misma. Su gravedad es tan fuerte que ni siquiera la luz puede escapar de el.',
    prerequisitos: ['la-gravedad', 'galaxias'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },

  // =========================================================================
  // CUERPO Y MENTE 🧠
  // =========================================================================

  // --- Nivel 1 ---
  {
    slug: 'el-corazon',
    nombre: 'El corazon',
    emoji: '❤️',
    dominio: 'cuerpo-mente',
    nivel: 1,
    conceptoNucleo:
      'Tu corazon es un musculo que bombea sangre sin parar, unas 100.000 veces al dia. La sangre lleva oxigeno y nutrientes a todas las partes de tu cuerpo.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'los-sentidos',
    nombre: 'Los cinco sentidos',
    emoji: '👁️',
    dominio: 'cuerpo-mente',
    nivel: 1,
    conceptoNucleo:
      'Tienes 5 sentidos: vista, oido, olfato, gusto y tacto. Cada uno usa una parte diferente del cuerpo para enviar informacion al cerebro sobre lo que te rodea.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'por-que-dormimos',
    nombre: 'Por que dormimos',
    emoji: '😴',
    dominio: 'cuerpo-mente',
    nivel: 1,
    conceptoNucleo:
      'Cuando duermes, tu cuerpo se repara y tu cerebro ordena todo lo que aprendiste durante el dia. Los ninos necesitan dormir mas que los adultos porque estan creciendo.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'las-emociones',
    nombre: 'Las emociones',
    emoji: '😊',
    dominio: 'cuerpo-mente',
    nivel: 1,
    conceptoNucleo:
      'Las emociones como la alegria, el miedo o la tristeza son senales de tu cerebro. Todas son normales y utiles: el miedo te protege del peligro, la alegria te motiva.',
    prerequisitos: [],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 2 ---
  {
    slug: 'el-cerebro',
    nombre: 'El cerebro',
    emoji: '🧠',
    dominio: 'cuerpo-mente',
    nivel: 2,
    conceptoNucleo:
      'Tu cerebro controla todo: lo que piensas, sientes y haces. Tiene miles de millones de neuronas conectadas entre si, como una red electrica super compleja.',
    prerequisitos: ['los-sentidos', 'las-emociones'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'sistema-inmune',
    nombre: 'El sistema inmune',
    emoji: '🛡️',
    dominio: 'cuerpo-mente',
    nivel: 2,
    conceptoNucleo:
      'Tu cuerpo tiene un ejercito de celulas que te defienden de los germenes. Cuando te pones enfermo, es porque tu sistema inmune esta luchando contra los invasores.',
    prerequisitos: ['el-corazon', 'por-que-dormimos'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'como-aprendemos',
    nombre: 'Como aprendemos',
    emoji: '📖',
    dominio: 'cuerpo-mente',
    nivel: 2,
    conceptoNucleo:
      'Aprender algo nuevo crea conexiones entre las neuronas de tu cerebro. Cuanto mas practicas, mas fuertes se hacen esas conexiones. Por eso repetir ayuda a recordar.',
    prerequisitos: ['el-cerebro', 'por-que-dormimos'],
    edadMinima: 5,
    edadMaxima: 9,
    orden: o(),
  },

  // --- Nivel 3 ---
  {
    slug: 'genetica-accesible',
    nombre: 'Genetica accesible',
    emoji: '🧬',
    dominio: 'cuerpo-mente',
    nivel: 3,
    conceptoNucleo:
      'Dentro de cada celula de tu cuerpo hay instrucciones llamadas genes. Tus genes vienen de tus padres: por eso te pareces a ellos en el color de ojos, pelo o piel.',
    prerequisitos: ['el-cerebro', 'sistema-inmune'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
  {
    slug: 'nutricion-combustible',
    nombre: 'Nutricion: el combustible del cuerpo',
    emoji: '🍎',
    dominio: 'cuerpo-mente',
    nivel: 3,
    conceptoNucleo:
      'La comida es el combustible de tu cuerpo. Los carbohidratos te dan energia rapida, las proteinas reparan musculos, y las vitaminas mantienen todo funcionando bien.',
    prerequisitos: ['sistema-inmune', 'como-aprendemos'],
    edadMinima: 7,
    edadMaxima: 9,
    orden: o(),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a skill by its slug. */
export function getSkillBySlug(slug: string): SkillDef | undefined {
  return SKILLS.find((s) => s.slug === slug);
}

/** Get all skills for a given domain, sorted by orden. */
export function getSkillsDeDominio(dominioSlug: DominioSlug): SkillDef[] {
  return SKILLS.filter((s) => s.dominio === dominioSlug).sort(
    (a, b) => a.orden - b.orden,
  );
}

/** Get all skills appropriate for a given age. */
export function getSkillsPorEdad(edadAnos: number): SkillDef[] {
  return SKILLS.filter(
    (s) => edadAnos >= s.edadMinima && edadAnos <= s.edadMaxima,
  );
}

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

export interface TopicSeed {
  slug: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  categoria: string;
  categoriaEmoji: string;
  edadMinima: number;
  edadMaxima: number;
  orden: number;
}

export interface CategoriaInfo {
  slug: string;
  nombre: string;
  emoji: string;
  orden: number;
}

/** Maps domains to the old "categorias" format. */
export const CATEGORIAS: CategoriaInfo[] = DOMINIOS.map((d) => ({
  slug: d.slug,
  nombre: d.nombre,
  emoji: d.emoji,
  orden: d.orden,
}));

/** Maps skills to the old "topics" format. */
export const TOPICS_SEED: TopicSeed[] = SKILLS.map((s) => {
  const dominio = DOMINIOS.find((d) => d.slug === s.dominio)!;
  return {
    slug: s.slug,
    nombre: s.nombre,
    emoji: s.emoji,
    descripcion: s.conceptoNucleo,
    categoria: s.dominio,
    categoriaEmoji: dominio.emoji,
    edadMinima: s.edadMinima,
    edadMaxima: s.edadMaxima,
    orden: s.orden,
  };
});

/**
 * Groups topics by category for the UI selector.
 * Kept for backward compatibility with the old topics.ts API.
 */
export function getTopicsPorCategoria(
  edadAnos: number,
): Map<string, TopicSeed[]> {
  const agrupados = new Map<string, TopicSeed[]>();

  for (const cat of CATEGORIAS) {
    const topicsDeCat = TOPICS_SEED.filter(
      (t) =>
        t.categoria === cat.slug &&
        edadAnos >= t.edadMinima &&
        edadAnos <= t.edadMaxima,
    ).sort((a, b) => a.orden - b.orden);

    if (topicsDeCat.length > 0) {
      agrupados.set(cat.slug, topicsDeCat);
    }
  }

  return agrupados;
}
