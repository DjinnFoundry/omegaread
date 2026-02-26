'use server';

/**
 * Server Actions para el test de baseline de lectura.
 * Sprint 1: medir nivel inicial y confianza.
 */
import { getDb } from '@/server/db';
import { students, baselineAssessments, eq } from '@zetaread/db';
import { requireStudentOwnership } from '../auth';
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
  const db = await getDb();
  const validado = guardarRespuestaBaselineSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

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
  const db = await getDb();
  const validado = finalizarBaselineSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

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
