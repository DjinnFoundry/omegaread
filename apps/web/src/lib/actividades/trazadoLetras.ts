/**
 * Datos de trazado para letras base de Ola 2.
 */

export const ORDEN_TRAZO = ['M', 'P', 'L', 'S', 'T', 'N'] as const;
export type LetraTrazable = (typeof ORDEN_TRAZO)[number];

export interface PuntoTrazado {
  x: number; // 0..1
  y: number; // 0..1
}

export interface LetraTrazadoDef {
  letra: LetraTrazable;
  checkpoints: PuntoTrazado[];
  instruccion: string;
}

export const TRAZOS_LETRAS: Record<LetraTrazable, LetraTrazadoDef> = {
  M: {
    letra: 'M',
    instruccion: 'Sube, baja y vuelve a subir para hacer la M.',
    checkpoints: [
      { x: 0.2, y: 0.85 },
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.6 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.85 },
    ],
  },
  P: {
    letra: 'P',
    instruccion: 'Haz una línea larga y una pancita arriba.',
    checkpoints: [
      { x: 0.28, y: 0.85 },
      { x: 0.28, y: 0.2 },
      { x: 0.62, y: 0.22 },
      { x: 0.7, y: 0.38 },
      { x: 0.62, y: 0.52 },
      { x: 0.28, y: 0.52 },
    ],
  },
  L: {
    letra: 'L',
    instruccion: 'Baja recto y luego gira a la derecha.',
    checkpoints: [
      { x: 0.3, y: 0.2 },
      { x: 0.3, y: 0.85 },
      { x: 0.7, y: 0.85 },
    ],
  },
  S: {
    letra: 'S',
    instruccion: 'Haz una curva arriba y otra abajo.',
    checkpoints: [
      { x: 0.68, y: 0.22 },
      { x: 0.38, y: 0.22 },
      { x: 0.3, y: 0.42 },
      { x: 0.62, y: 0.58 },
      { x: 0.7, y: 0.8 },
      { x: 0.35, y: 0.82 },
    ],
  },
  T: {
    letra: 'T',
    instruccion: 'Primero la barra de arriba, luego la del centro.',
    checkpoints: [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.85 },
    ],
  },
  N: {
    letra: 'N',
    instruccion: 'Sube, cruza en diagonal y baja.',
    checkpoints: [
      { x: 0.2, y: 0.85 },
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.85 },
      { x: 0.8, y: 0.2 },
    ],
  },
};

