/**
 * Utilidades canonicas de normalizacion de texto.
 * Unico lugar para funciones de limpieza/comparacion de strings en espanol.
 */

export interface NormalizarTextoOpts {
  /**
   * Si `true`, conserva el caracter 'n' con tilde (n con virgulilla) en la salida.
   * Necesario cuando los tokens resultantes se usan para alineacion de audio,
   * donde distinguir 'n' con tilde de 'n' es importante para precision de matching.
   * Por defecto `false` (elimina todos los diacriticos, incluyendo n con virgulilla).
   */
  preservarEnie?: boolean;
}

const ENIE_PLACEHOLDER = '\uE000';

/**
 * Normaliza texto para comparacion y busqueda:
 * - Minusculas
 * - Elimina diacriticos (tildes, etc.) — opcionalmente preserva la n con virgulilla
 * - Reemplaza caracteres no alfanumericos con espacios
 * - Colapsa espacios multiples
 * - Elimina espacios al inicio y al final
 */
export function normalizarTexto(value: string, opts?: NormalizarTextoOpts): string {
  const preservarEnie = opts?.preservarEnie === true;

  if (preservarEnie) {
    // Sustituir temporalmente la n con virgulilla antes de eliminar diacriticos,
    // luego restaurarla para que el replace de no-alfanumericos la permita.
    const conPlaceholder = value
      .toLowerCase()
      .replaceAll('ñ', ENIE_PLACEHOLDER);

    return conPlaceholder
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replaceAll(ENIE_PLACEHOLDER, 'n\u0303') // restaurar como NFD para volver a compose
      .normalize('NFC') // recomponer: 'n' + combinacion -> n con virgulilla
      .normalize('NFC')
      .replace(/[^a-z0-9\u00f1\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
