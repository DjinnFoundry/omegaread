import type { SanitizedPageWpm } from './sanitize';

export type WpmConfidence = 'high' | 'medium' | 'low';

export interface SessionWpmResult {
  wpmRobusto: number;
  confianza: WpmConfidence;
  paginasValidas: number;
  paginasTotales: number;
  wpmPromedio: number; // backward compat
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Winsorized mean (10% trim). Returns 0 for empty input. */
function winsorizedMean(values: number[], fraction = 0.1): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) return median(values);
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length * fraction));
  const lower = sorted[trimCount]!;
  const upper = sorted[sorted.length - 1 - trimCount]!;
  const winsorized = sorted.map((v) => Math.max(lower, Math.min(upper, v)));
  return winsorized.reduce((a, b) => a + b, 0) / winsorized.length;
}

export function computeSessionWpm(
  sanitizedPages: SanitizedPageWpm[],
): SessionWpmResult {
  const validPages = sanitizedPages.filter((p) => p.flag === 'valid');

  // Skip first page (orientation time) if we have enough valid pages
  const skipFirst = validPages.length >= 3;
  const pagesForCalc = skipFirst
    ? validPages.filter((p) => p.pagina > 1)
    : validPages;

  // Fall back to all valid pages if skipping page 1 removed everything
  const effectivePages = pagesForCalc.length > 0 ? pagesForCalc : validPages;
  const wpmValues = effectivePages.map((p) => p.wpm);

  const wpmRobusto = Math.round(winsorizedMean(wpmValues));
  const wpmPromedio =
    wpmValues.length > 0
      ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length)
      : 0;

  const confianza: WpmConfidence =
    effectivePages.length >= 4
      ? 'high'
      : effectivePages.length >= 2
        ? 'medium'
        : 'low';

  return {
    wpmRobusto,
    confianza,
    paginasValidas: effectivePages.length,
    paginasTotales: sanitizedPages.length,
    wpmPromedio,
  };
}
