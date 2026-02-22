import { redirect } from 'next/navigation';

/**
 * /jugar ya no muestra selector de lector.
 * El StudentProgressProvider auto-selecciona el primer hijo.
 * Redirigimos directamente a lectura.
 */
export default function JugarPage() {
  redirect('/jugar/lectura');
}
