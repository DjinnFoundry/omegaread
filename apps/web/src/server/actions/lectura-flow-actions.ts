'use server';

/**
 * Server Actions para el flujo de /jugar/lectura.
 * Determina en que paso esta el estudiante: perfil, intereses, baseline, o listo.
 */
import { db, students } from '@omegaread/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { calcularEdad } from '@/lib/utils/fecha';

export type EstadoFlujoLectura =
  | { paso: 'perfil-incompleto' }
  | { paso: 'sin-intereses' }
  | { paso: 'sin-contexto' }
  | { paso: 'sin-baseline' }
  | { paso: 'listo'; nivelLectura: number; confianza: string };

export interface DatosEstudianteLectura {
  id: string;
  nombre: string;
  edadAnos: number;
  perfilCompleto: boolean;
  intereses: string[];
  baselineCompletado: boolean;
  nivelLectura: number | null;
  baselineConfianza: string | null;
}

/**
 * Obtener estado del flujo de lectura para un estudiante.
 * Devuelve el paso actual y datos necesarios para el UI.
 */
export async function obtenerEstadoLectura(studentId: string): Promise<{
  estado: EstadoFlujoLectura;
  estudiante: DatosEstudianteLectura;
} | null> {
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });

  if (!estudiante) return null;

  const edadAnos = calcularEdad(estudiante.fechaNacimiento);

  const datos: DatosEstudianteLectura = {
    id: estudiante.id,
    nombre: estudiante.nombre,
    edadAnos,
    perfilCompleto: estudiante.perfilCompleto,
    intereses: estudiante.intereses ?? [],
    baselineCompletado: estudiante.baselineCompletado,
    nivelLectura: estudiante.nivelLectura,
    baselineConfianza: estudiante.baselineConfianza,
  };

  let estado: EstadoFlujoLectura;

  if (!estudiante.perfilCompleto) {
    estado = { paso: 'perfil-incompleto' };
  } else if (!estudiante.intereses || estudiante.intereses.length === 0) {
    estado = { paso: 'sin-intereses' };
  } else if (estudiante.contextoPersonal === null) {
    // contextoPersonal null = nunca se presento el paso (distinto de '' = se salto)
    estado = { paso: 'sin-contexto' };
  } else if (!estudiante.baselineCompletado) {
    estado = { paso: 'sin-baseline' };
  } else {
    estado = {
      paso: 'listo',
      nivelLectura: estudiante.nivelLectura ?? 1,
      confianza: estudiante.baselineConfianza ?? 'bajo',
    };
  }

  return { estado, estudiante: datos };
}
