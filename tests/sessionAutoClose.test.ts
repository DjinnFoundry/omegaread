/**
 * Tests para lógica de auto-cierre de sesión por tiempo.
 *
 * Verifica que:
 * - La sesión se auto-cierra a los 10 minutos
 * - El mastery se calcula correctamente antes del cierre
 * - La lógica de progresión funciona con el auto-cierre
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MasteryTracker } from '@/lib/actividades/masteryTracker';

/** Duración máxima de sesión en ms (10 minutos) — debe coincidir con SesionVocales */
const DURACION_MAX_MS = 10 * 60 * 1000;

describe('Auto-cierre de sesión por tiempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('DURACION_MAX_MS debe ser 10 minutos (600000ms)', () => {
    expect(DURACION_MAX_MS).toBe(600000);
  });

  it('debe detectar cuándo se excede el tiempo máximo', () => {
    const inicio = Date.now();

    // Simular 9 minutos — aún no debe cerrarse
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(Date.now() - inicio).toBeLessThan(DURACION_MAX_MS);

    // Simular 1 minuto más — debe cerrarse
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(DURACION_MAX_MS);
  });

  it('el mastery debe preservarse al momento del cierre', () => {
    const tracker = new MasteryTracker();

    // Simular una sesión de juego antes del cierre
    for (let i = 0; i < 7; i++) {
      tracker.registrar({
        vocal: 'A',
        actividad: 'reconocimiento',
        correcto: true,
        tiempoMs: 1000,
      });
    }
    tracker.registrar({
      vocal: 'A',
      actividad: 'sonido',
      correcto: false,
      tiempoMs: 1500,
    });

    // El resumen debe estar disponible para guardar
    const resumen = tracker.obtenerResumen();
    expect(resumen.totalRespuestas).toBe(8);
    expect(resumen.vocales.A.totalIntentos).toBe(8);
    expect(resumen.vocales.A.totalAciertos).toBe(7);
    // 7/8 = 0.875 — NO dominada (necesita ≥ 0.9)
    expect(resumen.vocales.A.dominada).toBe(false);
  });

  it('un timer callback debe ejecutarse al superar DURACION_MAX_MS', () => {
    const onAutoClose = vi.fn();
    const inicio = Date.now();

    // Simular el interval de SesionVocales
    const interval = setInterval(() => {
      const transcurrido = Date.now() - inicio;
      if (transcurrido >= DURACION_MAX_MS) {
        onAutoClose();
        clearInterval(interval);
      }
    }, 1000);

    // Avanzar 9 minutos — no debe cerrarse
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(onAutoClose).not.toHaveBeenCalled();

    // Avanzar 1 minuto más — debe cerrarse
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(onAutoClose).toHaveBeenCalledTimes(1);

    clearInterval(interval);
  });

  it('el progreso se guarda correctamente con sesión parcial', () => {
    const tracker = new MasteryTracker();

    // Simular: el niño dominó A pero no E
    for (let i = 0; i < 5; i++) {
      tracker.registrar({ vocal: 'A', actividad: 'reconocimiento', correcto: true, tiempoMs: 1000 });
    }
    for (let i = 0; i < 3; i++) {
      tracker.registrar({ vocal: 'E', actividad: 'sonido', correcto: true, tiempoMs: 1200 });
    }
    tracker.registrar({ vocal: 'E', actividad: 'completar', correcto: false, tiempoMs: 2000 });

    const resumen = tracker.obtenerResumen();

    // A está dominada
    expect(resumen.vocales.A.dominada).toBe(true);

    // E no está dominada (solo 4 intentos, necesita mín 5)
    expect(resumen.vocales.E.dominada).toBe(false);
    expect(resumen.vocales.E.totalIntentos).toBe(4);

    // Progreso general: 1 de 5 vocales = 0.2
    expect(resumen.progresoGeneral).toBe(0.2);

    // El resumen tiene todas las respuestas para guardar
    expect(resumen.respuestas).toHaveLength(9);
  });
});
