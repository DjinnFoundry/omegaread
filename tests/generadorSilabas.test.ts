/**
 * Tests para generadorSilabas.
 *
 * Verifica:
 * - Generacion de ejercicios de fusion silabica
 * - Generacion de ejercicios de sonido
 * - Generacion de ejercicios de construccion de palabra
 * - Tracker de sesion sin repeticiones inmediatas
 */
import { describe, it, expect } from 'vitest';
import {
  ORDEN_SILABAS,
  PRONUNCIACION_SILABA,
  SesionSilabasTracker,
  generarEjercicioConstruirPalabra,
  generarEjercicioFusionSilabica,
  generarEjercicioSonidoSilaba,
} from '@/lib/actividades/generadorSilabas';

describe('generadorSilabas', () => {
  it('fusion silabica: descompone correctamente consonante y vocal', () => {
    const ej = generarEjercicioFusionSilabica('MA');
    expect(ej.consonante).toBe('M');
    expect(ej.vocal).toBe('A');
    expect(ej.silabaCorrecta).toBe('MA');
  });

  it('fusion silabica: incluye la silaba correcta en las opciones', () => {
    const ej = generarEjercicioFusionSilabica('TE');
    expect(ej.opciones).toContain('TE');
    expect(ej.opciones).toHaveLength(3);
  });

  it('sonido: incluye la silaba correcta en las opciones', () => {
    const ej = generarEjercicioSonidoSilaba('NO');
    expect(ej.silabaCorrecta).toBe('NO');
    expect(ej.opciones).toContain('NO');
    expect(ej.opciones).toHaveLength(3);
  });

  it('construccion: devuelve palabra con hueco y silaba faltante esperada', () => {
    const ej = generarEjercicioConstruirPalabra('SA');
    expect(ej.silabaFaltante).toBe('SA');
    expect(ej.palabraConHueco).toContain('__');
    expect(ej.opciones).toContain('SA');
  });

  it('tracker evita repetir inmediatamente una palabra del mismo tipo', () => {
    const tracker = new SesionSilabasTracker();
    const primero = generarEjercicioConstruirPalabra('MA', tracker);
    const segundo = generarEjercicioConstruirPalabra('MA', tracker);
    expect(segundo.palabra.palabra).not.toBe(primero.palabra.palabra);
  });

  it('orden de silabas incluye 30 silabas directas', () => {
    expect(ORDEN_SILABAS).toHaveLength(30);
    expect(ORDEN_SILABAS[0]).toBe('MA');
    expect(ORDEN_SILABAS[ORDEN_SILABAS.length - 1]).toBe('NU');
  });

  it('pronunciacion expone texto para cada silaba del orden', () => {
    for (const silaba of ORDEN_SILABAS) {
      expect(PRONUNCIACION_SILABA[silaba]).toBeTruthy();
    }
  });
});

