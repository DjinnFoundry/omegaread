/**
 * StudentContext: eliminates the repeated pattern of
 * requireStudentOwnership() + calcularEdad() + (nivelLectura ?? 1)
 * across server actions.
 *
 * Use this when you need all three pieces of data (ownership check,
 * computed age, and safe reading level default). For actions that
 * only need the ownership check, use requireStudentOwnership directly.
 */
import { requireStudentOwnership } from './auth';
import { calcularEdad } from '@/lib/utils/fecha';

type OwnershipResult = Awaited<ReturnType<typeof requireStudentOwnership>>;

export interface StudentContext {
  /** Parent record from the ownership check. */
  padre: OwnershipResult['padre'];
  /** Student record from the ownership check. */
  estudiante: OwnershipResult['estudiante'];
  /** Student age in whole years, computed from fechaNacimiento. */
  edadAnos: number;
  /** Reading level with safe default (nivelLectura ?? 1). */
  nivel: number;
}

/**
 * Fetches the authenticated student context in a single call.
 *
 * Combines:
 * 1. requireStudentOwnership (auth + ownership verification)
 * 2. calcularEdad (age computation)
 * 3. nivelLectura with default of 1
 *
 * @throws Redirects to /padre/login if not authenticated.
 * @throws Error if studentId does not belong to the authenticated parent.
 */
export async function getStudentContext(studentId: string): Promise<StudentContext> {
  const { padre, estudiante } = await requireStudentOwnership(studentId);
  const edadAnos = calcularEdad(estudiante.fechaNacimiento);
  const nivel = estudiante.nivelLectura ?? 1;
  return { padre, estudiante, edadAnos, nivel };
}
