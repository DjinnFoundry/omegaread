/**
 * Tests para server actions y exports de Sprint 5.
 * Verifica que las funciones de dashboard existen y estan exportadas.
 */
import { describe, it, expect } from 'vitest';
import {
  obtenerDashboardNino,
  obtenerDashboardPadre,
  calcularProgresoNivel,
  generarMensajeMotivacional,
  calcularDesgloseTipos,
  generarRecomendaciones,
} from '@/server/actions/dashboard-actions';

describe('Sprint 5: dashboard-actions exports', () => {
  it('obtenerDashboardNino esta exportada como funcion', () => {
    expect(typeof obtenerDashboardNino).toBe('function');
  });

  it('obtenerDashboardPadre esta exportada como funcion', () => {
    expect(typeof obtenerDashboardPadre).toBe('function');
  });

  it('calcularProgresoNivel esta exportada como funcion', () => {
    expect(typeof calcularProgresoNivel).toBe('function');
  });

  it('generarMensajeMotivacional esta exportada como funcion', () => {
    expect(typeof generarMensajeMotivacional).toBe('function');
  });

  it('calcularDesgloseTipos esta exportada como funcion', () => {
    expect(typeof calcularDesgloseTipos).toBe('function');
  });

  it('generarRecomendaciones esta exportada como funcion', () => {
    expect(typeof generarRecomendaciones).toBe('function');
  });
});

describe('Sprint 5: backwards compat (Sprint 1-4 exports still work)', () => {
  it('student-actions exports still work', async () => {
    const { obtenerResumenProgreso } = await import(
      '@/server/actions/student-actions'
    );
    expect(typeof obtenerResumenProgreso).toBe('function');
  });

  it('reading-actions exports still work', async () => {
    const { calcularAjusteDificultad } = await import(
      '@/server/actions/reading-actions'
    );
    expect(typeof calcularAjusteDificultad).toBe('function');
  });

  it('session-actions exports still work', async () => {
    const { cargarProgresoEstudiante } = await import(
      '@/server/actions/session-actions'
    );
    expect(typeof cargarProgresoEstudiante).toBe('function');
  });
});
