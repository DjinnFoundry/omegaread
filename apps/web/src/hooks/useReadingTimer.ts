/**
 * Hook de temporizador de lectura con tracking de WPM por pagina.
 *
 * Registra timestamps de transiciones de pagina y calcula WPM
 * por pagina y promedio (excluyendo la primera pagina que incluye
 * tiempo de orientacion).
 *
 * Extraido de PantallaLectura.tsx para mejorar separacion de concerns.
 */
import { useRef, useCallback } from 'react';

// ─── TYPES ───

export interface WpmPorPagina {
  pagina: number;
  wpm: number;
}

export interface ReadingTimerResult {
  /** Total reading time in milliseconds */
  tiempoTotalMs: number;
  /** WPM per page */
  wpmPorPagina: WpmPorPagina[];
  /** Average WPM (excluding first page) */
  wpmPromedio: number;
}

export interface UseReadingTimerReturn {
  /** Start or reset the timer */
  iniciar: () => void;
  /** Record a page transition (call when user advances to next page) */
  registrarAvancePagina: () => void;
  /** Finalize and calculate reading metrics */
  finalizar: (totalPaginas: number, paginas: string[], contarPalabras: (texto: string) => number) => ReadingTimerResult;
  /** Get the current max page reached */
  getMaxPagina: () => number;
}

// ─── HOOK ───

export function useReadingTimer(): UseReadingTimerReturn {
  const timestampsRef = useRef<number[]>([0]);
  const inicioTotalRef = useRef(0);
  const maxPaginaRef = useRef(0);

  const iniciar = useCallback(() => {
    timestampsRef.current = [Date.now()];
    inicioTotalRef.current = Date.now();
    maxPaginaRef.current = 0;
  }, []);

  const registrarAvancePagina = useCallback(() => {
    const now = Date.now();
    const nextPage = maxPaginaRef.current + 1;
    timestampsRef.current.push(now);
    maxPaginaRef.current = nextPage;
  }, []);

  const finalizar = useCallback(
    (
      totalPaginas: number,
      paginas: string[],
      contarPalabras: (texto: string) => number,
    ): ReadingTimerResult => {
      const ahora = Date.now();

      // Register final timestamp if needed
      if (timestampsRef.current.length <= totalPaginas) {
        timestampsRef.current.push(ahora);
      }

      const tiempoTotalMs = ahora - inicioTotalRef.current;

      // Calculate WPM per page
      const wpmPorPagina: WpmPorPagina[] = [];
      for (let i = 0; i < totalPaginas; i++) {
        const inicio = timestampsRef.current[i];
        const fin = timestampsRef.current[i + 1];
        if (inicio == null || fin == null) continue;
        const minutos = (fin - inicio) / 60_000;
        const palabras = contarPalabras(paginas[i] ?? '');
        const wpm = minutos > 0 ? Math.round(palabras / minutos) : 0;
        wpmPorPagina.push({ pagina: i + 1, wpm });
      }

      // Average WPM excluding first page (orientation time)
      const paginasParaPromedio = wpmPorPagina.filter((p) => p.pagina > 1);
      const wpmPromedio = paginasParaPromedio.length > 0
        ? Math.round(paginasParaPromedio.reduce((sum, p) => sum + p.wpm, 0) / paginasParaPromedio.length)
        : (wpmPorPagina[0]?.wpm ?? 0);

      return { tiempoTotalMs, wpmPorPagina, wpmPromedio };
    },
    [],
  );

  const getMaxPagina = useCallback(() => maxPaginaRef.current, []);

  return {
    iniciar,
    registrarAvancePagina,
    finalizar,
    getMaxPagina,
  };
}
