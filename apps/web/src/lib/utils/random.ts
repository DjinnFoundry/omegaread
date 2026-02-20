/**
 * Utilidades de aleatorización compartidas.
 *
 * Fisher-Yates shuffle y helpers de selección aleatoria.
 * Single source of truth — no duplicar en componentes.
 */

/**
 * Mezcla un array usando el algoritmo Fisher-Yates.
 * Devuelve una copia nueva (no muta el original).
 *
 * @param arr - Array a mezclar
 * @returns Copia mezclada del array
 */
export function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Selecciona N elementos aleatorios de un array.
 * Devuelve una copia nueva mezclada y truncada.
 *
 * @param arr - Array fuente
 * @param n - Número de elementos a seleccionar
 * @returns Array con N elementos aleatorios
 */
export function seleccionarAleatorios<T>(arr: T[], n: number): T[] {
  return mezclar(arr).slice(0, n);
}
