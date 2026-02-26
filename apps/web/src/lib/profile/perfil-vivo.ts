/**
 * Utilidades canonicas para leer y crear el estado del perfil vivo del estudiante.
 * El "perfil vivo" es el objeto `perfilVivo` anidado dentro de `students.senalesDificultad`.
 */

import type { PerfilVivoState } from '@omegaread/db';

/**
 * Extrae hasta 3 hechos de texto del perfil vivo embebido en senalesDificultad.
 * Acepta el objeto `senalesDificultad` completo (no solo perfilVivo).
 */
export function extraerHechosPerfilVivo(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const senales = raw as Record<string, unknown>;
  const perfil = senales.perfilVivo as Record<string, unknown> | undefined;
  if (!perfil || typeof perfil !== 'object') return [];
  const hechos = perfil.hechos;
  if (!Array.isArray(hechos)) return [];

  return hechos
    .filter((h) => h && typeof h === 'object')
    .map((h) => (h as Record<string, unknown>).texto)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 90))
    .slice(0, 3);
}

/** Crea un perfil vivo vacio con valores por defecto seguros. */
export function crearPerfilVivoVacio(): PerfilVivoState {
  return {
    version: 1,
    hechos: [],
    microRespuestas: {},
  };
}

/**
 * Extrae y valida el estado del perfil vivo desde el objeto `perfilVivo` crudo.
 * El parametro debe ser el valor de `senalesDificultad.perfilVivo`, no el objeto
 * `senalesDificultad` completo.
 *
 * Ejemplo de uso:
 * ```ts
 * const senales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
 * const perfil = extraerPerfilVivo(senales.perfilVivo);
 * ```
 */
export function extraerPerfilVivo(raw: unknown): PerfilVivoState {
  if (!raw || typeof raw !== 'object') {
    return crearPerfilVivoVacio();
  }
  const pv = raw as Record<string, unknown>;
  const hechos = Array.isArray(pv.hechos)
    ? pv.hechos
      .filter((h) => h && typeof h === 'object')
      .map((h) => h as PerfilVivoState['hechos'][number])
      .slice(0, 80)
    : [];

  const microRespuestas = (pv.microRespuestas && typeof pv.microRespuestas === 'object')
    ? (pv.microRespuestas as PerfilVivoState['microRespuestas'])
    : {};

  return {
    version: 1,
    hechos,
    microRespuestas,
  };
}
