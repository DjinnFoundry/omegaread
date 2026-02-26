import { getNivelConfig } from '@/lib/ai/prompts';

export type PageFlag = 'valid' | 'too_fast' | 'too_slow';

export interface SanitizedPageWpm {
  pagina: number;
  wpm: number;
  palabras: number;
  tiempoMs: number;
  flag: PageFlag;
}

export interface WpmBounds {
  minWpm: number;
  maxWpm: number;
  expected: number;
}

// Multipliers for plausible reading range around expected WPM
const MIN_WPM_RATIO = 0.3;
const MAX_WPM_RATIO = 2.5;
const ABSOLUTE_MIN_WPM = 5;
const ABSOLUTE_MAX_WPM = 400;
// Minimum time on a page to count as "read" (ms)
const MIN_PAGE_TIME_MS = 1_500;
// Maximum time on a single page before flagging as abandoned (5 min)
const MAX_PAGE_TIME_MS = 5 * 60_000;

export function getWpmBounds(nivel: number): WpmBounds {
  const config = getNivelConfig(nivel);
  const expected = config.wpmEsperado;
  return {
    minWpm: Math.max(ABSOLUTE_MIN_WPM, Math.round(expected * MIN_WPM_RATIO)),
    maxWpm: Math.min(ABSOLUTE_MAX_WPM, Math.round(expected * MAX_WPM_RATIO)),
    expected,
  };
}

export function flagPage(
  wpm: number,
  palabras: number,
  tiempoMs: number,
  bounds: WpmBounds,
): PageFlag {
  if (tiempoMs < MIN_PAGE_TIME_MS) return 'too_fast';
  if (tiempoMs > MAX_PAGE_TIME_MS) return 'too_slow';
  if (palabras < 5) return 'valid'; // too few words to judge
  if (wpm > bounds.maxWpm) return 'too_fast';
  if (wpm < bounds.minWpm) return 'too_slow';
  return 'valid';
}

export function sanitizePageWpmData(
  rawPages: Array<{ pagina: number; wpm: number }>,
  paginas: string[],
  timestamps: number[],
  nivel: number,
  contarPalabras: (texto: string) => number,
): SanitizedPageWpm[] {
  const bounds = getWpmBounds(nivel);
  return rawPages.map((page, i) => {
    const palabras = contarPalabras(paginas[i] ?? '');
    const inicio = timestamps[i] ?? 0;
    const fin = timestamps[i + 1] ?? timestamps[i] ?? 0;
    const tiempoMs = fin - inicio;
    return {
      pagina: page.pagina,
      wpm: page.wpm,
      palabras,
      tiempoMs,
      flag: flagPage(page.wpm, palabras, tiempoMs, bounds),
    };
  });
}

/**
 * Server-side sanitization when we have wpmPorPagina but not raw timestamps.
 * Reconstructs approximate timestamps from WPM data and flags purely on bounds.
 */
export function sanitizeFromStoredData(
  wpmPorPagina: Array<{ pagina: number; wpm: number }>,
  nivel: number,
): SanitizedPageWpm[] {
  const bounds = getWpmBounds(nivel);
  return wpmPorPagina.map((page) => {
    // We don't have exact word counts or timestamps from stored data,
    // so we flag purely on WPM bounds. This is less precise but sufficient
    // for retrospective confidence assessment.
    const estimatedPalabras = 50; // median page word count
    const estimatedTimeMs =
      page.wpm > 0 ? (estimatedPalabras / page.wpm) * 60_000 : 0;
    return {
      pagina: page.pagina,
      wpm: page.wpm,
      palabras: estimatedPalabras,
      tiempoMs: Math.round(estimatedTimeMs),
      flag:
        page.wpm > 0
          ? flagPage(page.wpm, estimatedPalabras, estimatedTimeMs, bounds)
          : ('too_slow' as PageFlag),
    };
  });
}
