/**
 * Taxonomia de topics para OmegaRead.
 * Cada topic representa una categoria de interes que personaliza las lecturas.
 * Se usa como seed para la tabla topics y como referencia en el frontend.
 */

export interface TopicSeed {
  slug: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  edadMinima: number;
  edadMaxima: number;
  orden: number;
}

export const TOPICS_SEED: TopicSeed[] = [
  {
    slug: 'animales',
    nombre: 'Animales',
    emoji: '🐾',
    descripcion: 'Historias sobre animales salvajes, mascotas y criaturas del mar',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 1,
  },
  {
    slug: 'aventura',
    nombre: 'Aventura',
    emoji: '🗺️',
    descripcion: 'Exploraciones, viajes y misiones emocionantes',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 2,
  },
  {
    slug: 'espacio',
    nombre: 'Espacio',
    emoji: '🚀',
    descripcion: 'Planetas, estrellas, astronautas y viajes espaciales',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 3,
  },
  {
    slug: 'deportes',
    nombre: 'Deportes',
    emoji: '⚽',
    descripcion: 'Futbol, baloncesto, natacion y mas deportes',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 4,
  },
  {
    slug: 'ciencia',
    nombre: 'Ciencia',
    emoji: '🔬',
    descripcion: 'Experimentos, descubrimientos y como funciona el mundo',
    edadMinima: 6,
    edadMaxima: 9,
    orden: 5,
  },
  {
    slug: 'fantasia',
    nombre: 'Fantasia',
    emoji: '🧙',
    descripcion: 'Magia, dragones, hadas y mundos imaginarios',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 6,
  },
  {
    slug: 'tecnologia',
    nombre: 'Tecnologia',
    emoji: '🤖',
    descripcion: 'Robots, inventos, videojuegos y el futuro',
    edadMinima: 6,
    edadMaxima: 9,
    orden: 7,
  },
  {
    slug: 'naturaleza',
    nombre: 'Naturaleza',
    emoji: '🌿',
    descripcion: 'Bosques, rios, montanas y el medio ambiente',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 8,
  },
  {
    slug: 'historia',
    nombre: 'Historia',
    emoji: '🏛️',
    descripcion: 'Civilizaciones antiguas, personajes historicos y grandes inventos',
    edadMinima: 7,
    edadMaxima: 9,
    orden: 9,
  },
  {
    slug: 'cocina',
    nombre: 'Cocina',
    emoji: '🍳',
    descripcion: 'Recetas, alimentos del mundo y aventuras en la cocina',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 10,
  },
  {
    slug: 'dinosaurios',
    nombre: 'Dinosaurios',
    emoji: '🦕',
    descripcion: 'T-Rex, fosiles y la vida en la era prehistorica',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 11,
  },
  {
    slug: 'musica',
    nombre: 'Musica',
    emoji: '🎵',
    descripcion: 'Instrumentos, canciones y ritmos de todo el mundo',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 12,
  },
  {
    slug: 'arte',
    nombre: 'Arte',
    emoji: '🎨',
    descripcion: 'Pintura, dibujo, escultura y creatividad',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 13,
  },
  {
    slug: 'misterio',
    nombre: 'Misterio',
    emoji: '🔍',
    descripcion: 'Enigmas, detectives y pistas por resolver',
    edadMinima: 6,
    edadMaxima: 9,
    orden: 14,
  },
  {
    slug: 'oceano',
    nombre: 'Oceano',
    emoji: '🌊',
    descripcion: 'Vida marina, barcos piratas y tesoros del fondo del mar',
    edadMinima: 5,
    edadMaxima: 9,
    orden: 15,
  },
];
