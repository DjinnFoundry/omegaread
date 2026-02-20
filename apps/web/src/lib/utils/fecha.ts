/**
 * Utilidades de fecha compartidas.
 *
 * Funciones de cálculo de edad y formateo
 * usadas tanto en dashboard como en student-actions.
 */

/**
 * Calcula la edad en años a partir de una fecha de nacimiento.
 *
 * @param fechaNacimiento - Fecha de nacimiento (Date o string parseable)
 * @returns Edad en años enteros
 */
export function calcularEdad(fechaNacimiento: Date | string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}
