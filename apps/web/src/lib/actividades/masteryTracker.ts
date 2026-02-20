/**
 * Tracker de mastery para vocales.
 *
 * Registra respuestas, calcula mastery por vocal,
 * determina si está dominada y sugiere la siguiente
 * vocal a practicar.
 */

import type { Vocal } from './generadorVocales';
import { ORDEN_VOCALES } from './generadorVocales';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Tipos de actividad registrables */
export type TipoActividad = 'reconocimiento' | 'sonido' | 'completar';

/** Una respuesta individual registrada */
export interface Respuesta {
  /** Vocal evaluada */
  vocal: Vocal;
  /** Tipo de actividad */
  actividad: TipoActividad;
  /** Si fue correcta */
  correcto: boolean;
  /** Tiempo de respuesta en milisegundos */
  tiempoMs: number;
  /** Timestamp de cuándo ocurrió */
  timestamp: number;
}

/** Métricas de mastery para una vocal */
export interface MasteryVocal {
  /** Vocal evaluada */
  vocal: Vocal;
  /** Nivel de mastery (0.0 - 1.0) */
  mastery: number;
  /** Total de intentos */
  totalIntentos: number;
  /** Total de aciertos */
  totalAciertos: number;
  /** Si la vocal está dominada (mastery ≥ 0.9 con mín 5 intentos) */
  dominada: boolean;
  /** Tiempo promedio de respuesta en ms */
  tiempoPromedioMs: number;
  /** Patrón de errores: qué actividades causan más errores */
  patronErrores: Record<TipoActividad, number>;
}

/** Resumen completo de la sesión */
export interface ResumenSesion {
  /** Mastery por cada vocal */
  vocales: Record<Vocal, MasteryVocal>;
  /** Vocal actual en la que se está trabajando */
  vocalActual: Vocal;
  /** Siguiente vocal a practicar (o null si todas dominadas) */
  siguienteVocal: Vocal | null;
  /** Total de respuestas en la sesión */
  totalRespuestas: number;
  /** Progreso general (vocales dominadas / total vocales) */
  progresoGeneral: number;
  /** Todas las respuestas registradas */
  respuestas: Respuesta[];
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

/** Umbral de mastery para considerar una vocal dominada */
const UMBRAL_MASTERY = 0.9;

/** Mínimo de intentos para evaluar mastery */
const MIN_INTENTOS = 5;

/** Número de respuestas recientes a considerar para mastery (ventana deslizante) */
const VENTANA_MASTERY = 10;

// ─────────────────────────────────────────────
// CLASE MASTERY TRACKER
// ─────────────────────────────────────────────

/**
 * Tracker de mastery para sesiones de vocales.
 *
 * Registra cada respuesta, calcula mastery por vocal usando
 * una ventana deslizante de las últimas N respuestas (mín 5),
 * y determina cuándo una vocal está dominada (≥90%).
 *
 * @example
 * ```ts
 * const tracker = new MasteryTracker();
 * tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1200 });
 * const mastery = tracker.obtenerMastery('A'); // { mastery: 1.0, ... }
 * ```
 */
export class MasteryTracker {
  private respuestas: Respuesta[] = [];

  /**
   * Registra una nueva respuesta.
   */
  registrar(respuesta: Omit<Respuesta, 'timestamp'>): void {
    this.respuestas.push({
      ...respuesta,
      timestamp: Date.now(),
    });
  }

  /**
   * Obtiene las métricas de mastery para una vocal.
   */
  obtenerMastery(vocal: Vocal): MasteryVocal {
    const respuestasVocal = this.respuestas.filter((r) => r.vocal === vocal);
    const totalIntentos = respuestasVocal.length;
    const totalAciertos = respuestasVocal.filter((r) => r.correcto).length;

    // Calcular mastery con ventana deslizante
    let mastery = 0;
    if (totalIntentos > 0) {
      const recientes = respuestasVocal.slice(-VENTANA_MASTERY);
      const aciertosRecientes = recientes.filter((r) => r.correcto).length;
      mastery = aciertosRecientes / recientes.length;
    }

    // Dominio: mastery >= umbral Y al menos MIN_INTENTOS
    const dominada = totalIntentos >= MIN_INTENTOS && mastery >= UMBRAL_MASTERY;

    // Tiempo promedio
    const tiemposRespuesta = respuestasVocal
      .filter((r) => r.tiempoMs > 0)
      .map((r) => r.tiempoMs);
    const tiempoPromedioMs =
      tiemposRespuesta.length > 0
        ? tiemposRespuesta.reduce((a, b) => a + b, 0) / tiemposRespuesta.length
        : 0;

    // Patrón de errores
    const patronErrores: Record<TipoActividad, number> = {
      reconocimiento: 0,
      sonido: 0,
      completar: 0,
    };
    for (const r of respuestasVocal) {
      if (!r.correcto) {
        patronErrores[r.actividad]++;
      }
    }

    return {
      vocal,
      mastery,
      totalIntentos,
      totalAciertos,
      dominada,
      tiempoPromedioMs,
      patronErrores,
    };
  }

  /**
   * Comprueba si una vocal está dominada (mastery ≥ 90%, mín 5 intentos).
   */
  estaDominada(vocal: Vocal): boolean {
    return this.obtenerMastery(vocal).dominada;
  }

  /**
   * Determina la siguiente vocal a practicar en el orden A→E→I→O→U.
   * Devuelve la primera vocal no dominada, o null si todas están dominadas.
   */
  siguienteVocal(): Vocal | null {
    for (const vocal of ORDEN_VOCALES) {
      if (!this.estaDominada(vocal)) {
        return vocal;
      }
    }
    return null;
  }

  /**
   * Determina la vocal actual (primera no dominada).
   * Si todas están dominadas, devuelve la última.
   */
  vocalActual(): Vocal {
    return this.siguienteVocal() ?? ORDEN_VOCALES[ORDEN_VOCALES.length - 1];
  }

  /**
   * Calcula el progreso general (vocales dominadas / total).
   */
  progresoGeneral(): number {
    const dominadas = ORDEN_VOCALES.filter((v) => this.estaDominada(v)).length;
    return dominadas / ORDEN_VOCALES.length;
  }

  /**
   * Obtiene el resumen completo de la sesión.
   */
  obtenerResumen(): ResumenSesion {
    const vocales = {} as Record<Vocal, MasteryVocal>;
    for (const vocal of ORDEN_VOCALES) {
      vocales[vocal] = this.obtenerMastery(vocal);
    }

    return {
      vocales,
      vocalActual: this.vocalActual(),
      siguienteVocal: this.siguienteVocal(),
      totalRespuestas: this.respuestas.length,
      progresoGeneral: this.progresoGeneral(),
      respuestas: [...this.respuestas],
    };
  }

  /**
   * Total de respuestas registradas.
   */
  totalRespuestas(): number {
    return this.respuestas.length;
  }

  /**
   * Obtiene todas las respuestas registradas (copia).
   */
  obtenerRespuestas(): Respuesta[] {
    return [...this.respuestas];
  }

  /**
   * Resetea todas las respuestas.
   */
  resetear(): void {
    this.respuestas = [];
  }
}

// ─────────────────────────────────────────────
// HOOK (para uso en componentes React)
// ─────────────────────────────────────────────

// Nota: El hook se implementa dentro de los componentes React
// que lo necesiten para evitar dependencias circulares con 'use client'.
// La clase MasteryTracker se usa directamente con useRef.
