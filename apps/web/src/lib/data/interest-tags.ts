/**
 * Tags de intereses/personalidad para onboarding del nino.
 * Se agrupan por bloques visuales (sin titulo en UI), usando `grupo`.
 */

export type InterestGroup = 1 | 2 | 3;

export interface InterestTag {
  slug: string;
  label: string;
  emoji: string;
  grupo: InterestGroup;
}

export const INTEREST_TAGS: InterestTag[] = [
  // Grupo 1: Personalidad
  { slug: 'timido', label: 'Timido', emoji: '🙈', grupo: 1 },
  { slug: 'extrovertido', label: 'Extrovertido', emoji: '🗣️', grupo: 1 },
  { slug: 'curioso', label: 'Curioso', emoji: '🔎', grupo: 1 },
  { slug: 'tranquilo', label: 'Tranquilo', emoji: '😌', grupo: 1 },
  { slug: 'energetico', label: 'Energetico', emoji: '⚡', grupo: 1 },
  { slug: 'sensible', label: 'Sensible', emoji: '💛', grupo: 1 },
  { slug: 'independiente', label: 'Independiente', emoji: '🚀', grupo: 1 },

  // Grupo 2: Actividades
  { slug: 'deportista', label: 'Deportista', emoji: '⚽', grupo: 2 },
  { slug: 'legos-construccion', label: 'Legos / construccion', emoji: '🧱', grupo: 2 },
  { slug: 'videojuegos', label: 'Videojuegos', emoji: '🎮', grupo: 2 },
  { slug: 'musica', label: 'Musica', emoji: '🎵', grupo: 2 },
  { slug: 'dibujo-arte', label: 'Dibujo / arte', emoji: '🎨', grupo: 2 },
  { slug: 'cocina', label: 'Cocina', emoji: '🍳', grupo: 2 },
  { slug: 'manualidades', label: 'Manualidades', emoji: '✂️', grupo: 2 },

  // Grupo 3: Intereses
  { slug: 'animales', label: 'Animales', emoji: '🐾', grupo: 3 },
  { slug: 'dinosaurios', label: 'Dinosaurios', emoji: '🦖', grupo: 3 },
  { slug: 'espacio', label: 'Espacio', emoji: '🌌', grupo: 3 },
  { slug: 'coches', label: 'Coches', emoji: '🚗', grupo: 3 },
  { slug: 'princesas', label: 'Princesas', emoji: '👑', grupo: 3 },
  { slug: 'superheroes', label: 'Superheroes', emoji: '🦸', grupo: 3 },
  { slug: 'robots', label: 'Robots', emoji: '🤖', grupo: 3 },
  { slug: 'piratas', label: 'Piratas', emoji: '🏴‍☠️', grupo: 3 },
  { slug: 'naturaleza', label: 'Naturaleza', emoji: '🌿', grupo: 3 },
  { slug: 'ciencia', label: 'Ciencia', emoji: '🧪', grupo: 3 },
];
