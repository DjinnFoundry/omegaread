'use server';

/**
 * Server Actions para el test de baseline de lectura.
 * Sprint 1: medir nivel inicial y confianza.
 */
import { db, students, baselineAssessments } from '@omegaread/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../auth';
import {
  guardarRespuestaBaselineSchema,
  finalizarBaselineSchema,
} from '../validation';

/**
 * Guardar resultado de un texto del baseline (se llama por cada texto completado).
 */
export async function guardarRespuestaBaseline(datos: {
  studentId: string;
  nivelTexto: number;
  textoId: string;
  totalPreguntas: number;
  aciertos: number;
  aciertosPorTipo: Record<string, number>;
  tiempoLecturaMs?: number;
  respuestas: Array<{
    preguntaId: string;
    tipo: string;
    respuesta: string;
    correcta: boolean;
    tiempoMs?: number;
  }>;
}) {
  const validado = guardarRespuestaBaselineSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  const [assessment] = await db
    .insert(baselineAssessments)
    .values({
      studentId: validado.studentId,
      nivelTexto: validado.nivelTexto,
      textoId: validado.textoId,
      totalPreguntas: validado.totalPreguntas,
      aciertos: validado.aciertos,
      aciertosPorTipo: validado.aciertosPorTipo,
      tiempoLecturaMs: validado.tiempoLecturaMs,
      respuestas: validado.respuestas,
    })
    .returning();

  return { ok: true, assessmentId: assessment.id };
}

/**
 * Finalizar el baseline: guarda nivel calculado en el estudiante.
 */
export async function finalizarBaseline(datos: {
  studentId: string;
  nivelLectura: number;
  comprensionScore: number;
  confianza: 'alto' | 'medio' | 'bajo';
}) {
  const validado = finalizarBaselineSchema.parse(datos);
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
      nivelLectura: validado.nivelLectura,
      comprensionScore: validado.comprensionScore,
      baselineConfianza: validado.confianza,
      baselineCompletado: true,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}
