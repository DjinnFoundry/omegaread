/**
 * Tests para MasteryTracker — lógica de mastery de vocales.
 *
 * Verifica:
 * - Registro de respuestas
 * - Cálculo de mastery con ventana deslizante
 * - Determinación de vocal dominada (≥90% en últimos 10, mín 5 intentos)
 * - Progresión A → E → I → O → U
 * - Resumen de sesión
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MasteryTracker } from '@/lib/actividades/masteryTracker';
import type { Vocal } from '@/lib/actividades/generadorVocales';

describe('MasteryTracker', () => {
  let tracker: MasteryTracker;

  beforeEach(() => {
    tracker = new MasteryTracker();
  });

  describe('registrar respuestas', () => {
    it('debe registrar una respuesta correctamente', () => {
      tracker.registrar({
        vocal: 'A',
        actividad: 'reconocimiento',
        correcto: true,
        tiempoMs: 1000,
      });

      expect(tracker.totalRespuestas()).toBe(1);
      const mastery = tracker.obtenerMastery('A');
      expect(mastery.totalIntentos).toBe(1);
      expect(mastery.totalAciertos).toBe(1);
    });

    it('debe registrar múltiples respuestas', () => {
      for (let i = 0; i < 5; i++) {
        tracker.registrar({
          vocal: 'A',
          actividad: 'reconocimiento',
          correcto: true,
          tiempoMs: 1000,
        });
      }

      expect(tracker.totalRespuestas()).toBe(5);
      expect(tracker.obtenerMastery('A').totalIntentos).toBe(5);
    });

    it('debe separar respuestas por vocal', () => {
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'E', actividad: 'reconocimiento', correcto: false, tiempoMs: 1200 });

      expect(tracker.obtenerMastery('A').totalIntentos).toBe(1);
      expect(tracker.obtenerMastery('E').totalIntentos).toBe(1);
      expect(tracker.obtenerMastery('A').totalAciertos).toBe(1);
      expect(tracker.obtenerMastery('E').totalAciertos).toBe(0);
    });
  });

  describe('cálculo de mastery', () => {
    it('debe devolver mastery 0 sin intentos', () => {
      const mastery = tracker.obtenerMastery('A');
      expect(mastery.mastery).toBe(0);
      expect(mastery.dominada).toBe(false);
    });

    it('NO debe marcar como dominada con menos de 5 intentos (aunque sea 100%)', () => {
      for (let i = 0; i < 4; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      const mastery = tracker.obtenerMastery('A');
      expect(mastery.mastery).toBe(1.0); // 100% de aciertos
      expect(mastery.dominada).toBe(false); // Pero no dominada: solo 4 intentos
    });

    it('debe marcar como dominada con ≥90% y ≥5 intentos', () => {
      // 5 aciertos de 5 = 100%
      for (let i = 0; i < 5; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      const mastery = tracker.obtenerMastery('A');
      expect(mastery.mastery).toBe(1.0);
      expect(mastery.dominada).toBe(true);
    });

    it('debe marcar como dominada con 90% exacto (9 de 10)', () => {
      // 1 error + 9 aciertos = 90% en ventana de 10
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      for (let i = 0; i < 9; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      const mastery = tracker.obtenerMastery('A');
      expect(mastery.mastery).toBe(0.9);
      expect(mastery.dominada).toBe(true);
    });

    it('NO debe marcar como dominada con 80% (8 de 10)', () => {
      // 2 errores + 8 aciertos = 80%
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      for (let i = 0; i < 8; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      const mastery = tracker.obtenerMastery('A');
      expect(mastery.mastery).toBe(0.8);
      expect(mastery.dominada).toBe(false);
    });

    it('debe usar ventana deslizante de últimas 10 respuestas', () => {
      // Primero 5 errores
      for (let i = 0; i < 5; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      }

      // Luego 10 aciertos (los errores salen de la ventana de 10)
      for (let i = 0; i < 10; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      const mastery = tracker.obtenerMastery('A');
      // Ventana de 10: los últimos 10 son todos aciertos
      expect(mastery.mastery).toBe(1.0);
      expect(mastery.dominada).toBe(true);
    });
  });

  describe('progresión de vocales', () => {
    it('debe empezar con A como primera vocal', () => {
      expect(tracker.vocalActual()).toBe('A');
      expect(tracker.siguienteVocal()).toBe('A');
    });

    it('debe avanzar a E cuando A está dominada', () => {
      // Dominar A
      for (let i = 0; i < 5; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }

      expect(tracker.estaDominada('A')).toBe(true);
      expect(tracker.siguienteVocal()).toBe('E');
      expect(tracker.vocalActual()).toBe('E');
    });

    it('debe seguir el orden A → E → I → O → U', () => {
      const vocales: Vocal[] = ['A', 'E', 'I', 'O', 'U'];

      for (let v = 0; v < vocales.length; v++) {
        expect(tracker.vocalActual()).toBe(vocales[v]);

        // Dominar la vocal actual
        for (let i = 0; i < 5; i++) {
          tracker.registrar({
            vocal: vocales[v],
            actividad: 'reconocimiento',
            correcto: true,
            tiempoMs: 1000,
          });
        }
      }

      // Todas dominadas
      expect(tracker.siguienteVocal()).toBeNull();
      expect(tracker.progresoGeneral()).toBe(1.0);
    });

    it('debe devolver null cuando todas las vocales están dominadas', () => {
      const vocales: Vocal[] = ['A', 'E', 'I', 'O', 'U'];
      for (const v of vocales) {
        for (let i = 0; i < 5; i++) {
          tracker.registrar({ vocal: v, actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
        }
      }

      expect(tracker.siguienteVocal()).toBeNull();
    });
  });

  describe('progreso general', () => {
    it('debe ser 0 al inicio', () => {
      expect(tracker.progresoGeneral()).toBe(0);
    });

    it('debe ser 0.2 con 1 de 5 vocales dominadas', () => {
      for (let i = 0; i < 5; i++) {
        tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      }
      expect(tracker.progresoGeneral()).toBe(0.2);
    });

    it('debe ser 1.0 con todas dominadas', () => {
      const vocales: Vocal[] = ['A', 'E', 'I', 'O', 'U'];
      for (const v of vocales) {
        for (let i = 0; i < 5; i++) {
          tracker.registrar({ vocal: v, actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
        }
      }
      expect(tracker.progresoGeneral()).toBe(1.0);
    });
  });

  describe('patrón de errores', () => {
    it('debe rastrear errores por tipo de actividad', () => {
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: false, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'A', actividad: 'sonido', correcto: false, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'A', actividad: 'completar', correcto: true, tiempoMs: 1000 });

      const mastery = tracker.obtenerMastery('A');
      expect(mastery.patronErrores.reconocimiento).toBe(2);
      expect(mastery.patronErrores.sonido).toBe(1);
      expect(mastery.patronErrores.completar).toBe(0);
    });
  });

  describe('resumen de sesión', () => {
    it('debe generar resumen correcto', () => {
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      tracker.registrar({ vocal: 'A', actividad: 'sonido', correcto: true, tiempoMs: 800 });

      const resumen = tracker.obtenerResumen();
      expect(resumen.totalRespuestas).toBe(2);
      expect(resumen.vocales.A.totalIntentos).toBe(2);
      expect(resumen.vocalActual).toBe('A');
      expect(resumen.respuestas).toHaveLength(2);
    });
  });

  describe('resetear', () => {
    it('debe limpiar todas las respuestas', () => {
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
      tracker.resetear();
      expect(tracker.totalRespuestas()).toBe(0);
      expect(tracker.obtenerMastery('A').totalIntentos).toBe(0);
    });
  });
});
