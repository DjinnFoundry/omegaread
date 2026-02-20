/**
 * Tests para generadorVocales — generación de ejercicios.
 *
 * Verifica:
 * - Generación de ejercicios de reconocimiento por nivel
 * - Generación de ejercicios de sonido
 * - Generación de ejercicios de completar (con anti-repetición)
 * - SesionTracker
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generarEjercicioReconocimiento,
  generarEjercicioSonido,
  generarEjercicioCompletar,
  SesionTracker,
  ORDEN_VOCALES,
} from '@/lib/actividades/generadorVocales';

describe('generarEjercicioReconocimiento', () => {
  it('debe generar ejercicio con la vocal correcta', () => {
    const ej = generarEjercicioReconocimiento('A', 1);
    expect(ej.vocal).toBe('A');
    expect(ej.distractores).toHaveLength(3);
    expect(ej.dificultad).toBe(1);
  });

  it('nivel 1: distractores deben ser consonantes', () => {
    const ej = generarEjercicioReconocimiento('A', 1);
    const consonantes = ['M', 'P', 'S', 'L', 'T', 'N', 'R', 'D', 'B', 'F'];
    for (const d of ej.distractores) {
      expect(consonantes).toContain(d);
    }
  });

  it('nivel 2: distractores deben ser otras vocales', () => {
    const ej = generarEjercicioReconocimiento('A', 2);
    const otrasVocales = ['E', 'I', 'O', 'U'];
    for (const d of ej.distractores) {
      expect(otrasVocales).toContain(d);
    }
    // No debe contener la vocal objetivo
    expect(ej.distractores).not.toContain('A');
  });

  it('nivel 3: distractores pueden ser mayúscula o minúscula', () => {
    // Ejecutar varias veces para cubrir aleatoriedad
    let tieneMinuscula = false;
    for (let i = 0; i < 20; i++) {
      const ej = generarEjercicioReconocimiento('A', 3);
      for (const d of ej.distractores) {
        if (d === d.toLowerCase() && d !== d.toUpperCase()) {
          tieneMinuscula = true;
        }
      }
    }
    // Al menos en alguna iteración debería haber minúsculas
    expect(tieneMinuscula).toBe(true);
  });

  it('debe funcionar para todas las vocales', () => {
    for (const vocal of ORDEN_VOCALES) {
      const ej = generarEjercicioReconocimiento(vocal, 1);
      expect(ej.vocal).toBe(vocal);
      expect(ej.distractores).toHaveLength(3);
    }
  });
});

describe('generarEjercicioSonido', () => {
  it('debe generar ejercicio con la vocal correcta', () => {
    const ej = generarEjercicioSonido('E');
    expect(ej.vocalCorrecta).toBe('E');
  });

  it('debe incluir la vocal correcta en las opciones', () => {
    const ej = generarEjercicioSonido('E');
    expect(ej.opciones).toContain('E');
  });

  it('debe tener exactamente 3 opciones', () => {
    const ej = generarEjercicioSonido('O');
    expect(ej.opciones).toHaveLength(3);
  });

  it('debe funcionar para todas las vocales', () => {
    for (const vocal of ORDEN_VOCALES) {
      const ej = generarEjercicioSonido(vocal);
      expect(ej.vocalCorrecta).toBe(vocal);
      expect(ej.opciones).toContain(vocal);
    }
  });
});

describe('generarEjercicioCompletar', () => {
  it('debe generar ejercicio con palabra de la vocal correcta', () => {
    const ej = generarEjercicioCompletar('A');
    expect(ej.palabra.vocalFaltante).toBe('A');
  });

  it('debe incluir la vocal correcta en las opciones', () => {
    const ej = generarEjercicioCompletar('I');
    expect(ej.opciones).toContain('I');
  });

  it('debe tener 3 opciones', () => {
    const ej = generarEjercicioCompletar('U');
    expect(ej.opciones).toHaveLength(3);
  });

  it('la palabra debe tener emoji y pronunciación', () => {
    const ej = generarEjercicioCompletar('O');
    expect(ej.palabra.imagen).toBeTruthy();
    expect(ej.palabra.pronunciacion).toBeTruthy();
    expect(ej.palabra.palabraCompleta).toBeTruthy();
    expect(ej.palabra.palabraConHueco).toContain('_');
  });
});

describe('SesionTracker', () => {
  let tracker: SesionTracker;

  beforeEach(() => {
    tracker = new SesionTracker();
  });

  it('debe iniciar sin ejercicios usados', () => {
    expect(tracker.fueUsado('completar', 'GATO')).toBe(false);
  });

  it('debe registrar ejercicios usados', () => {
    tracker.registrar('completar', 'GATO');
    expect(tracker.fueUsado('completar', 'GATO')).toBe(true);
    expect(tracker.fueUsado('completar', 'CASA')).toBe(false);
  });

  it('debe separar por tipo de ejercicio', () => {
    tracker.registrar('completar', 'GATO');
    expect(tracker.fueUsado('reconocer', 'GATO')).toBe(false);
  });

  it('debe resetear un tipo específico', () => {
    tracker.registrar('completar', 'GATO');
    tracker.registrar('completar', 'CASA');
    tracker.resetear('completar');
    expect(tracker.fueUsado('completar', 'GATO')).toBe(false);
    expect(tracker.fueUsado('completar', 'CASA')).toBe(false);
  });

  it('debe resetear todo', () => {
    tracker.registrar('completar', 'GATO');
    tracker.registrar('reconocer', 'A');
    tracker.resetearTodo();
    expect(tracker.fueUsado('completar', 'GATO')).toBe(false);
    expect(tracker.fueUsado('reconocer', 'A')).toBe(false);
  });

  it('generarEjercicioCompletar evita repeticiones con tracker', () => {
    const usados = new Set<string>();

    // Generar 6 ejercicios para la vocal A (pool tiene 6 palabras)
    for (let i = 0; i < 6; i++) {
      const ej = generarEjercicioCompletar('A', tracker);
      usados.add(ej.palabra.palabraCompleta);
    }

    // Deben ser 6 palabras diferentes
    expect(usados.size).toBe(6);
  });

  it('generarEjercicioCompletar resetea cuando se agotan', () => {
    // Generar más de 6 ejercicios para A (pool de 6) — debe reciclar
    for (let i = 0; i < 8; i++) {
      const ej = generarEjercicioCompletar('A', tracker);
      expect(ej.palabra.vocalFaltante).toBe('A');
    }
  });
});
