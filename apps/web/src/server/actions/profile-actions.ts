'use server';

/**
 * Server Actions para gestion de perfil enriquecido del estudiante.
 * Sprint 1: capturar identidad, contexto e intereses.
 */
import { getDb } from '@/server/db';
import { students, eq, and } from '@omegaread/db';
import { requireAuth } from '../auth';
import {
  actualizarPerfilSchema,
  guardarInteresesSchema,
  guardarContextoPersonalSchema,
} from '../validation';

/**
 * Actualizar perfil del estudiante con contexto (formulario del padre).
 * Marca perfilCompleto = true al completar.
 */
export async function actualizarPerfilEstudiante(datos: {
  studentId: string;
  curso: string;
  centroEscolar?: string;
  rutinaLectura: string;
  acompanamiento: string;
  senalesDificultad: {
    atencion?: boolean;
    vocabulario?: boolean;
    frustracion?: boolean;
    otroDetalle?: string;
  };
  personajesFavoritos?: string;
  temasEvitar?: string[];
}) {
  const db = await getDb();
  const validado = actualizarPerfilSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  await db
    .update(students)
    .set({
      curso: validado.curso,
      centroEscolar: validado.centroEscolar ?? null,
      rutinaLectura: validado.rutinaLectura,
      acompanamiento: validado.acompanamiento,
      senalesDificultad: validado.senalesDificultad,
      personajesFavoritos: validado.personajesFavoritos ?? null,
      temasEvitar: validado.temasEvitar ?? [],
      perfilCompleto: true,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}

/**
 * Guardar intereses del nino (seleccion visual del nino).
 */
export async function guardarIntereses(datos: {
  studentId: string;
  intereses: string[];
}) {
  const db = await getDb();
  const validado = guardarInteresesSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  await db
    .update(students)
    .set({
      intereses: validado.intereses,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}

/**
 * Guardar contexto personal del nino (texto libre del padre).
 * Se usa para personalizar las historias generadas.
 */
export async function guardarContextoPersonal(datos: {
  studentId: string;
  contextoPersonal?: string;
}) {
  const db = await getDb();
  const validado = guardarContextoPersonalSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  // Guardamos '' cuando el padre salta el paso (distinto de null = nunca mostrado)
  await db
    .update(students)
    .set({
      contextoPersonal: validado.contextoPersonal?.trim() || '',
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}
