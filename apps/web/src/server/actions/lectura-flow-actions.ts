'use server';

/**
 * Server Actions para el flujo de /jugar/lectura.
 * Determina en que paso esta el estudiante: intereses, contexto, o listo.
 */
import { getDb } from '@/server/db';
import { students, eq, and, type AccesibilidadConfig } from '@zetaread/db';
import { requireAuth } from '../auth';
import { calcularEdad } from '@/lib/utils/fecha';

export type EstadoFlujoLectura =
  | { paso: 'sin-intereses' }
  | { paso: 'sin-contexto' }
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
  accesibilidad: {
    fuenteDislexia: boolean;
    modoTDAH: boolean;
    altoContraste: boolean;
  };
}

/**
 * Obtener estado del flujo de lectura para un estudiante.
 * Devuelve el paso actual y datos necesarios para el UI.
 */
export async function obtenerEstadoLectura(studentId: string): Promise<{
  estado: EstadoFlujoLectura;
  estudiante: DatosEstudianteLectura;
} | null> {
  const db = await getDb();
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });

  if (!estudiante) return null;

  const edadAnos = calcularEdad(estudiante.fechaNacimiento);
  const accesibilidad = (estudiante.accesibilidad ?? {}) as AccesibilidadConfig;

  const datos: DatosEstudianteLectura = {
    id: estudiante.id,
    nombre: estudiante.nombre,
    edadAnos,
    perfilCompleto: estudiante.perfilCompleto,
    intereses: estudiante.intereses ?? [],
    baselineCompletado: estudiante.baselineCompletado,
    nivelLectura: estudiante.nivelLectura,
    baselineConfianza: estudiante.baselineConfianza,
    accesibilidad: {
      fuenteDislexia: accesibilidad.fuenteDislexia === true,
      modoTDAH: accesibilidad.modoTDAH === true,
      altoContraste: accesibilidad.altoContraste === true,
    },
  };

  let estado: EstadoFlujoLectura;

  // Paso "perfil-incompleto" eliminado: la fecha de nacimiento ya da
  // suficiente contexto para empezar. El perfil enriquecido se puede
  // pedir mas adelante cuando aporte valor real.
  if (!estudiante.intereses || estudiante.intereses.length === 0) {
    estado = { paso: 'sin-intereses' };
  } else if (estudiante.contextoPersonal === null) {
    // contextoPersonal null = nunca se presento el paso (distinto de '' = se salto)
    estado = { paso: 'sin-contexto' };
  } else {
    estado = {
      paso: 'listo',
      nivelLectura: estudiante.nivelLectura ?? 1,
      confianza: estudiante.baselineConfianza ?? 'bajo',
    };
  }

  return { estado, estudiante: datos };
}
