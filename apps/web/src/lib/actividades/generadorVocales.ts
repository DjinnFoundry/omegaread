/**
 * Generador de ejercicios de vocales.
 *
 * Genera ejercicios de reconocimiento, sonido y completar palabra
 * para cada vocal. Garantiza que no se repitan ejercicios dentro
 * de una misma sesión.
 */

import { mezclar, seleccionarAleatorios } from '@/lib/utils/random';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Vocales soportadas */
export type Vocal = 'A' | 'E' | 'I' | 'O' | 'U';

/** Niveles de dificultad para reconocimiento */
export type NivelDificultad = 1 | 2 | 3;

/** Ejercicio de reconocimiento de vocal */
export interface EjercicioReconocimiento {
  /** Vocal que el niño debe encontrar */
  vocal: Vocal;
  /** Letras distractoras (3) */
  distractores: string[];
  /** Nivel de dificultad */
  dificultad: NivelDificultad;
}

/** Ejercicio de sonido de vocal */
export interface EjercicioSonido {
  /** Vocal cuyo sonido se reproduce */
  vocalCorrecta: Vocal;
  /** Opciones de vocales (incluye la correcta) */
  opciones: Vocal[];
}

/** Datos de una palabra con vocal faltante */
export interface PalabraVocal {
  /** Palabra completa (ej: "ÁRBOL") */
  palabraCompleta: string;
  /** Palabra con hueco (ej: "_RBOL") */
  palabraConHueco: string;
  /** Vocal que falta */
  vocalFaltante: Vocal;
  /** Emoji representativo */
  imagen: string;
  /** Texto que la mascota pronuncia enfatizando la vocal */
  pronunciacion: string;
}

/** Ejercicio de completar vocal en palabra */
export interface EjercicioCompletar {
  /** Datos de la palabra */
  palabra: PalabraVocal;
  /** Opciones de vocales (incluye la correcta) */
  opciones: Vocal[];
}

// ─────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────

/** Consonantes para distractores de nivel 1 (muy diferentes a vocales) */
const CONSONANTES_FACILES = ['M', 'P', 'S', 'L', 'T', 'N', 'R', 'D', 'B', 'F'];

/** Todas las vocales */
const VOCALES: Vocal[] = ['A', 'E', 'I', 'O', 'U'];

/** Pool de palabras por vocal (mín 5 por vocal) */
const PALABRAS_POR_VOCAL: Record<Vocal, PalabraVocal[]> = {
  A: [
    { palabraCompleta: 'ÁRBOL', palabraConHueco: '_RBOL', vocalFaltante: 'A', imagen: '🌳', pronunciacion: 'aaaárbol' },
    { palabraCompleta: 'GATO', palabraConHueco: 'G_TO', vocalFaltante: 'A', imagen: '🐱', pronunciacion: 'gaaato' },
    { palabraCompleta: 'CASA', palabraConHueco: 'C_SA', vocalFaltante: 'A', imagen: '🏠', pronunciacion: 'caaasa' },
    { palabraCompleta: 'AGUA', palabraConHueco: '_GUA', vocalFaltante: 'A', imagen: '💧', pronunciacion: 'aaagua' },
    { palabraCompleta: 'ALA', palabraConHueco: '_LA', vocalFaltante: 'A', imagen: '🪽', pronunciacion: 'aaala' },
    { palabraCompleta: 'MAPA', palabraConHueco: 'M_PA', vocalFaltante: 'A', imagen: '🗺️', pronunciacion: 'maaapa' },
  ],
  E: [
    { palabraCompleta: 'ESTRELLA', palabraConHueco: '_STRELLA', vocalFaltante: 'E', imagen: '⭐', pronunciacion: 'eeeestrella' },
    { palabraCompleta: 'PEZ', palabraConHueco: 'P_Z', vocalFaltante: 'E', imagen: '🐟', pronunciacion: 'peeez' },
    { palabraCompleta: 'MESA', palabraConHueco: 'M_SA', vocalFaltante: 'E', imagen: '🪑', pronunciacion: 'meeeesa' },
    { palabraCompleta: 'ELEFANTE', palabraConHueco: '_LEFANTE', vocalFaltante: 'E', imagen: '🐘', pronunciacion: 'eeelefante' },
    { palabraCompleta: 'PERRO', palabraConHueco: 'P_RRO', vocalFaltante: 'E', imagen: '🐕', pronunciacion: 'peeeerro' },
    { palabraCompleta: 'TREN', palabraConHueco: 'TR_N', vocalFaltante: 'E', imagen: '🚂', pronunciacion: 'treeeen' },
  ],
  I: [
    { palabraCompleta: 'ISLA', palabraConHueco: '_SLA', vocalFaltante: 'I', imagen: '🏝️', pronunciacion: 'iiiisla' },
    { palabraCompleta: 'LIBRO', palabraConHueco: 'L_BRO', vocalFaltante: 'I', imagen: '📕', pronunciacion: 'liiibro' },
    { palabraCompleta: 'PIÑA', palabraConHueco: 'P_ÑA', vocalFaltante: 'I', imagen: '🍍', pronunciacion: 'piiiiña' },
    { palabraCompleta: 'PINO', palabraConHueco: 'P_NO', vocalFaltante: 'I', imagen: '🌲', pronunciacion: 'piiino' },
    { palabraCompleta: 'CIRCO', palabraConHueco: 'C_RCO', vocalFaltante: 'I', imagen: '🎪', pronunciacion: 'ciiirco' },
    { palabraCompleta: 'RISA', palabraConHueco: 'R_SA', vocalFaltante: 'I', imagen: '😄', pronunciacion: 'riiisa' },
  ],
  O: [
    { palabraCompleta: 'OSO', palabraConHueco: '_SO', vocalFaltante: 'O', imagen: '🐻', pronunciacion: 'ooooso' },
    { palabraCompleta: 'SOL', palabraConHueco: 'S_L', vocalFaltante: 'O', imagen: '☀️', pronunciacion: 'soool' },
    { palabraCompleta: 'OJO', palabraConHueco: '_JO', vocalFaltante: 'O', imagen: '👁️', pronunciacion: 'oooojo' },
    { palabraCompleta: 'MONO', palabraConHueco: 'M_NO', vocalFaltante: 'O', imagen: '🐵', pronunciacion: 'moono' },
    { palabraCompleta: 'BOTE', palabraConHueco: 'B_TE', vocalFaltante: 'O', imagen: '⛵', pronunciacion: 'booote' },
    { palabraCompleta: 'POLLO', palabraConHueco: 'P_LLO', vocalFaltante: 'O', imagen: '🐔', pronunciacion: 'poollo' },
  ],
  U: [
    { palabraCompleta: 'UVA', palabraConHueco: '_VA', vocalFaltante: 'U', imagen: '🍇', pronunciacion: 'uuuuva' },
    { palabraCompleta: 'LUNA', palabraConHueco: 'L_NA', vocalFaltante: 'U', imagen: '🌙', pronunciacion: 'luuuna' },
    { palabraCompleta: 'NUBE', palabraConHueco: 'N_BE', vocalFaltante: 'U', imagen: '☁️', pronunciacion: 'nuuube' },
    { palabraCompleta: 'BURRO', palabraConHueco: 'B_RRO', vocalFaltante: 'U', imagen: '🫏', pronunciacion: 'buuurro' },
    { palabraCompleta: 'CUNA', palabraConHueco: 'C_NA', vocalFaltante: 'U', imagen: '🛏️', pronunciacion: 'cuuuna' },
    { palabraCompleta: 'PULPO', palabraConHueco: 'P_LPO', vocalFaltante: 'U', imagen: '🐙', pronunciacion: 'puuulpo' },
  ],
};

// ─────────────────────────────────────────────
// TRACKER DE SESIÓN (evita repeticiones)
// ─────────────────────────────────────────────

/**
 * Tracker para evitar repetir ejercicios dentro de una misma sesión.
 * Mantiene un set de IDs usados por tipo de ejercicio.
 */
export class SesionTracker {
  private usados: Map<string, Set<string>> = new Map();

  /**
   * Registra un ejercicio como usado.
   * @param tipo - Tipo de ejercicio (reconocimiento, sonido, completar)
   * @param id - ID único del ejercicio
   */
  registrar(tipo: string, id: string): void {
    if (!this.usados.has(tipo)) {
      this.usados.set(tipo, new Set());
    }
    this.usados.get(tipo)!.add(id);
  }

  /**
   * Comprueba si un ejercicio ya fue usado.
   */
  fueUsado(tipo: string, id: string): boolean {
    return this.usados.get(tipo)?.has(id) ?? false;
  }

  /**
   * Resetea los ejercicios usados de un tipo (cuando se agotan).
   */
  resetear(tipo: string): void {
    this.usados.delete(tipo);
  }

  /**
   * Resetea todos los ejercicios usados.
   */
  resetearTodo(): void {
    this.usados.clear();
  }
}

// ─────────────────────────────────────────────
// GENERADORES
// ─────────────────────────────────────────────

/**
 * Genera un ejercicio de reconocimiento de vocal.
 *
 * @param vocal - Vocal objetivo
 * @param nivel - Nivel de dificultad (1-3)
 * @returns Ejercicio con vocal, distractores y dificultad
 *
 * - Nivel 1: vocal vs consonantes muy diferentes (M, S, P)
 * - Nivel 2: vocal vs otras vocales (A vs E, O, U)
 * - Nivel 3: vocal mayúscula vs minúscula mezcladas
 */
export function generarEjercicioReconocimiento(
  vocal: Vocal,
  nivel: NivelDificultad = 1,
): EjercicioReconocimiento {
  let distractores: string[];

  switch (nivel) {
    case 1: {
      // Consonantes fáciles de distinguir
      distractores = seleccionarAleatorios(CONSONANTES_FACILES, 3);
      break;
    }
    case 2: {
      // Otras vocales
      const otrasVocales = VOCALES.filter((v) => v !== vocal);
      distractores = seleccionarAleatorios(otrasVocales, 3);
      break;
    }
    case 3: {
      // Mezcla de mayúsculas y minúsculas
      const otrasVocales = VOCALES.filter((v) => v !== vocal);
      const mezcladas = otrasVocales.map((v) =>
        Math.random() > 0.5 ? v : v.toLowerCase(),
      );
      distractores = seleccionarAleatorios(mezcladas, 3);
      break;
    }
  }

  return {
    vocal,
    distractores,
    dificultad: nivel,
  };
}

/**
 * Genera un ejercicio de sonido de vocal.
 *
 * @param vocal - Vocal cuyo sonido se reproduce
 * @returns Ejercicio con la vocal correcta y opciones mezcladas
 */
export function generarEjercicioSonido(vocal: Vocal): EjercicioSonido {
  const otrasVocales = VOCALES.filter((v) => v !== vocal);
  const distractoras = seleccionarAleatorios(otrasVocales, 2);
  const opciones = mezclar([vocal, ...distractoras]);

  return {
    vocalCorrecta: vocal,
    opciones,
  };
}

/**
 * Genera un ejercicio de completar vocal en palabra.
 *
 * @param vocal - Vocal que falta en la palabra
 * @param tracker - Tracker de sesión para evitar repeticiones (opcional)
 * @returns Ejercicio con palabra, imagen, y opciones de vocal
 */
export function generarEjercicioCompletar(
  vocal: Vocal,
  tracker?: SesionTracker,
): EjercicioCompletar {
  const pool = PALABRAS_POR_VOCAL[vocal];
  const tipo = 'completar';

  // Buscar una palabra no usada
  let palabra: PalabraVocal | undefined;
  const disponibles = pool.filter(
    (p) => !tracker?.fueUsado(tipo, p.palabraCompleta),
  );

  if (disponibles.length === 0) {
    // Si se agotaron todas, resetear y elegir cualquiera
    tracker?.resetear(tipo);
    palabra = pool[Math.floor(Math.random() * pool.length)];
  } else {
    palabra = disponibles[Math.floor(Math.random() * disponibles.length)];
  }

  // Registrar como usada
  tracker?.registrar(tipo, palabra.palabraCompleta);

  // Generar opciones (vocal correcta + 2 distractoras)
  const otrasVocales = VOCALES.filter((v) => v !== vocal);
  const distractoras = seleccionarAleatorios(otrasVocales, 2);
  const opciones = mezclar([vocal, ...distractoras]);

  return {
    palabra,
    opciones,
  };
}

/**
 * Texto de pronunciación para TTS al reproducir sonido de vocal.
 * Estira la vocal para que el niño la identifique claramente.
 */
export const PRONUNCIACION_VOCAL: Record<Vocal, string> = {
  A: 'aaaa',
  E: 'eeee',
  I: 'iiii',
  O: 'oooo',
  U: 'uuuu',
};

/**
 * Orden de vocales para la progresión del curso.
 */
export const ORDEN_VOCALES: Vocal[] = ['A', 'E', 'I', 'O', 'U'];
