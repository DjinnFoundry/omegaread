/**
 * Generador de ejercicios de silabas directas.
 *
 * Ola 2: vocales -> silabas directas -> primeras palabras.
 * Incluye actividades de fusion, sonido y construccion de palabras.
 */

import { mezclar, seleccionarAleatorios } from '@/lib/utils/random';
import type { Vocal } from './generadorVocales';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Orden pedagogico de silabas directas para Ola 2 */
export const ORDEN_SILABAS = [
  'MA', 'ME', 'MI', 'MO', 'MU',
  'PA', 'PE', 'PI', 'PO', 'PU',
  'LA', 'LE', 'LI', 'LO', 'LU',
  'SA', 'SE', 'SI', 'SO', 'SU',
  'TA', 'TE', 'TI', 'TO', 'TU',
  'NA', 'NE', 'NI', 'NO', 'NU',
] as const;

export type Silaba = (typeof ORDEN_SILABAS)[number];

export interface EjercicioFusionSilabica {
  consonante: string;
  vocal: Vocal;
  silabaCorrecta: Silaba;
  opciones: Silaba[];
}

export interface EjercicioSonidoSilaba {
  silabaCorrecta: Silaba;
  opciones: Silaba[];
}

export interface PalabraSilabica {
  palabra: string;
  silabas: string[];
  emoji: string;
  pronunciacion: string;
}

export interface EjercicioConstruirPalabra {
  palabra: PalabraSilabica;
  palabraConHueco: string;
  silabaFaltante: Silaba;
  opciones: Silaba[];
}

// ─────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────

const PALABRAS_SILABICAS: PalabraSilabica[] = [
  { palabra: 'MANO', silabas: ['MA', 'NO'], emoji: '✋', pronunciacion: 'ma-no' },
  { palabra: 'MESA', silabas: ['ME', 'SA'], emoji: '🪑', pronunciacion: 'me-sa' },
  { palabra: 'MISA', silabas: ['MI', 'SA'], emoji: '⛪', pronunciacion: 'mi-sa' },
  { palabra: 'MOTO', silabas: ['MO', 'TO'], emoji: '🏍️', pronunciacion: 'mo-to' },
  { palabra: 'MURO', silabas: ['MU', 'RO'], emoji: '🧱', pronunciacion: 'mu-ro' },
  { palabra: 'PATO', silabas: ['PA', 'TO'], emoji: '🦆', pronunciacion: 'pa-to' },
  { palabra: 'PELO', silabas: ['PE', 'LO'], emoji: '💇', pronunciacion: 'pe-lo' },
  { palabra: 'PINO', silabas: ['PI', 'NO'], emoji: '🌲', pronunciacion: 'pi-no' },
  { palabra: 'POLO', silabas: ['PO', 'LO'], emoji: '👕', pronunciacion: 'po-lo' },
  { palabra: 'PUMA', silabas: ['PU', 'MA'], emoji: '🐆', pronunciacion: 'pu-ma' },
  { palabra: 'LANA', silabas: ['LA', 'NA'], emoji: '🧶', pronunciacion: 'la-na' },
  { palabra: 'LENA', silabas: ['LE', 'NA'], emoji: '🪵', pronunciacion: 'le-na' },
  { palabra: 'LIMA', silabas: ['LI', 'MA'], emoji: '🍋', pronunciacion: 'li-ma' },
  { palabra: 'LOMA', silabas: ['LO', 'MA'], emoji: '⛰️', pronunciacion: 'lo-ma' },
  { palabra: 'LUNA', silabas: ['LU', 'NA'], emoji: '🌙', pronunciacion: 'lu-na' },
  { palabra: 'SAPO', silabas: ['SA', 'PO'], emoji: '🐸', pronunciacion: 'sa-po' },
  { palabra: 'SETA', silabas: ['SE', 'TA'], emoji: '🍄', pronunciacion: 'se-ta' },
  { palabra: 'SILA', silabas: ['SI', 'LA'], emoji: '🪑', pronunciacion: 'si-la' },
  { palabra: 'SOPA', silabas: ['SO', 'PA'], emoji: '🥣', pronunciacion: 'so-pa' },
  { palabra: 'SUMA', silabas: ['SU', 'MA'], emoji: '➕', pronunciacion: 'su-ma' },
  { palabra: 'TAZA', silabas: ['TA', 'ZA'], emoji: '☕', pronunciacion: 'ta-za' },
  { palabra: 'TELA', silabas: ['TE', 'LA'], emoji: '🧵', pronunciacion: 'te-la' },
  { palabra: 'TINA', silabas: ['TI', 'NA'], emoji: '🛁', pronunciacion: 'ti-na' },
  { palabra: 'TOMA', silabas: ['TO', 'MA'], emoji: '🥤', pronunciacion: 'to-ma' },
  { palabra: 'TUBO', silabas: ['TU', 'BO'], emoji: '🧪', pronunciacion: 'tu-bo' },
  { palabra: 'NAVE', silabas: ['NA', 'VE'], emoji: '🚀', pronunciacion: 'na-ve' },
  { palabra: 'NENA', silabas: ['NE', 'NA'], emoji: '👧', pronunciacion: 'ne-na' },
  { palabra: 'NIDO', silabas: ['NI', 'DO'], emoji: '🪺', pronunciacion: 'ni-do' },
  { palabra: 'NOTA', silabas: ['NO', 'TA'], emoji: '🎵', pronunciacion: 'no-ta' },
  { palabra: 'NUDO', silabas: ['NU', 'DO'], emoji: '🪢', pronunciacion: 'nu-do' },
];

// ─────────────────────────────────────────────
// TRACKER DE SESION
// ─────────────────────────────────────────────

export class SesionSilabasTracker {
  private usados: Map<string, Set<string>> = new Map();

  registrar(tipo: string, id: string): void {
    if (!this.usados.has(tipo)) {
      this.usados.set(tipo, new Set());
    }
    this.usados.get(tipo)?.add(id);
  }

  fueUsado(tipo: string, id: string): boolean {
    return this.usados.get(tipo)?.has(id) ?? false;
  }

  resetear(tipo: string): void {
    this.usados.delete(tipo);
  }
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function separarSilaba(silaba: Silaba): { consonante: string; vocal: Vocal } {
  const consonante = silaba[0];
  const vocal = silaba[1] as Vocal;
  return { consonante, vocal };
}

function generarOpcionesConDistractores(silaba: Silaba, tamano = 3): Silaba[] {
  const { consonante } = separarSilaba(silaba);
  const mismaFamilia = ORDEN_SILABAS.filter((s) => s.startsWith(consonante) && s !== silaba);
  const pool = mismaFamilia.length >= (tamano - 1)
    ? mismaFamilia
    : ORDEN_SILABAS.filter((s) => s !== silaba);
  const distractoras = seleccionarAleatorios(pool, tamano - 1) as Silaba[];
  return mezclar([silaba, ...distractoras]) as Silaba[];
}

// ─────────────────────────────────────────────
// GENERADORES
// ─────────────────────────────────────────────

export function generarEjercicioFusionSilabica(silaba: Silaba): EjercicioFusionSilabica {
  const { consonante, vocal } = separarSilaba(silaba);
  return {
    consonante,
    vocal,
    silabaCorrecta: silaba,
    opciones: generarOpcionesConDistractores(silaba),
  };
}

export function generarEjercicioSonidoSilaba(silaba: Silaba): EjercicioSonidoSilaba {
  return {
    silabaCorrecta: silaba,
    opciones: generarOpcionesConDistractores(silaba),
  };
}

export function generarEjercicioConstruirPalabra(
  silaba: Silaba,
  tracker?: SesionSilabasTracker,
): EjercicioConstruirPalabra {
  const tipo = 'construir-palabra';
  const poolSilaba = PALABRAS_SILABICAS.filter((p) => p.silabas.includes(silaba));
  const disponibles = poolSilaba.filter((p) => !tracker?.fueUsado(tipo, p.palabra));
  let palabra: PalabraSilabica;

  if (disponibles.length === 0) {
    tracker?.resetear(tipo);
    palabra = poolSilaba[Math.floor(Math.random() * poolSilaba.length)];
  } else {
    palabra = disponibles[Math.floor(Math.random() * disponibles.length)];
  }

  tracker?.registrar(tipo, palabra.palabra);

  const idxHueco = palabra.silabas.indexOf(silaba);
  const palabraConHueco = palabra.silabas
    .map((s, idx) => (idx === idxHueco ? '__' : s))
    .join('-');

  return {
    palabra,
    palabraConHueco,
    silabaFaltante: silaba,
    opciones: generarOpcionesConDistractores(silaba),
  };
}

export const PRONUNCIACION_SILABA: Record<Silaba, string> = ORDEN_SILABAS.reduce(
  (acc, silaba) => {
    acc[silaba] = `${silaba.toLowerCase()}... ${silaba.toLowerCase()}`;
    return acc;
  },
  {} as Record<Silaba, string>,
);

