'use server';

/**
 * Server Actions para sesiones de lectura adaptativa.
 * Sprint 1: contrato de datos (tipos + acciones).
 * Sprint 2+: conectar con generacion de historias.
 */
import {
  db,
  sessions,
  responses,
  difficultyAdjustments,
  students,
} from '@omegaread/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireStudentOwnership } from '../auth';
import {
  crearSesionLecturaSchema,
  registrarRespuestaComprensionSchema,
} from '../validation';
import {
  calcularSessionScore,
  determinarAjuste,
  type DireccionAjuste,
} from '@/lib/types/reading';

/**
 * Crear una sesion de lectura adaptativa.
 */
export async function crearSesionLectura(datos: {
  studentId: string;
  textoId?: string;
  nivelTexto?: number;
  topicId?: string;
}) {
  const validado = crearSesionLecturaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: validado.studentId,
      tipoActividad: 'lectura',
      modulo: 'lectura-adaptativa',
      completada: false,
      estrellasGanadas: 0,
      metadata: {
        textoId: validado.textoId,
        nivelTexto: validado.nivelTexto,
        topicId: validado.topicId,
      },
    })
    .returning();

  return { ok: true, sessionId: sesion.id };
}

/**
 * Registrar respuesta de comprension dentro de una sesion de lectura.
 */
export async function registrarRespuestaComprension(datos: {
  sessionId: string;
  studentId: string;
  preguntaId: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  respuestaSeleccionada: number;
  correcta: boolean;
  tiempoMs: number;
}) {
  const validado = registrarRespuestaComprensionSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });
  if (!sesion) {
    throw new Error('Sesion no encontrada o no pertenece al estudiante');
  }

  await db.insert(responses).values({
    sessionId: validado.sessionId,
    ejercicioId: validado.preguntaId,
    tipoEjercicio: validado.tipo,
    pregunta: validado.preguntaId,
    respuesta: String(validado.respuestaSeleccionada),
    respuestaCorrecta: 'N/A', // La opcion correcta esta en la pregunta
    correcta: validado.correcta,
    tiempoRespuestaMs: validado.tiempoMs,
  });

  return { ok: true };
}

/**
 * Calcular ajuste de dificultad tras una sesion.
 * Registra la decision con trazabilidad (por que).
 *
 * Formula v1:
 *   session_score = 0.65 * comprension + 0.25 * ritmo_normalizado + 0.10 * estabilidad
 *
 * Reglas:
 *   - comprension >= 80%: subir
 *   - comprension 60-79%: mantener
 *   - comprension < 60%: bajar
 */
export async function calcularAjusteDificultad(datos: {
  studentId: string;
  sessionId: string;
  comprensionScore: number;
  tiempoLecturaMs: number;
  tiempoEsperadoMs: number;
}) {
  const { estudiante } = await requireStudentOwnership(datos.studentId);

  const nivelAnterior = estudiante.nivelLectura ?? 1;

  // Calcular ritmo normalizado (1.0 = optimo, decrece si muy rapido o muy lento)
  const ratio = datos.tiempoLecturaMs / datos.tiempoEsperadoMs;
  const ritmoNormalizado = Math.max(0, 1 - Math.abs(1 - ratio) * 0.5);

  // Calcular estabilidad (consistencia en ultimas sesiones)
  const sesionesRecientes = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, datos.studentId),
      eq(sessions.tipoActividad, 'lectura'),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
    limit: 5,
  });

  let estabilidad = 0.5; // Default para pocas sesiones
  if (sesionesRecientes.length >= 3) {
    const scores = sesionesRecientes
      .filter(s => s.metadata && typeof (s.metadata as Record<string, unknown>).comprensionScore === 'number')
      .map(s => (s.metadata as Record<string, unknown>).comprensionScore as number);
    if (scores.length >= 2) {
      const varianza = scores.reduce((sum, s) => {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        return sum + Math.pow(s - mean, 2);
      }, 0) / scores.length;
      estabilidad = Math.max(0, 1 - varianza * 4);
    }
  }

  const sessionScore = calcularSessionScore({
    comprension: datos.comprensionScore,
    ritmoNormalizado,
    estabilidad,
  });

  const direccion: DireccionAjuste = determinarAjuste(datos.comprensionScore);

  let nivelNuevo = nivelAnterior;
  if (direccion === 'subir') nivelNuevo = Math.min(nivelAnterior + 0.5, 10);
  if (direccion === 'bajar') nivelNuevo = Math.max(nivelAnterior - 0.5, 1);

  const RAZONES: Record<DireccionAjuste, string> = {
    subir: `Comprension ${Math.round(datos.comprensionScore * 100)}% (>=80%), ritmo adecuado. Subimos dificultad.`,
    mantener: `Comprension ${Math.round(datos.comprensionScore * 100)}% (60-79%). Mantenemos nivel actual.`,
    bajar: `Comprension ${Math.round(datos.comprensionScore * 100)}% (<60%). Bajamos dificultad para consolidar.`,
  };

  // Registrar ajuste con trazabilidad
  await db.insert(difficultyAdjustments).values({
    studentId: datos.studentId,
    sessionId: datos.sessionId,
    nivelAnterior,
    nivelNuevo,
    direccion,
    razon: RAZONES[direccion],
    evidencia: {
      comprensionScore: datos.comprensionScore,
      ritmoNormalizado: Math.round(ritmoNormalizado * 100) / 100,
      estabilidad: Math.round(estabilidad * 100) / 100,
      sessionScore,
    },
  });

  // Actualizar nivel del estudiante
  if (nivelNuevo !== nivelAnterior) {
    await db
      .update(students)
      .set({
        nivelLectura: nivelNuevo,
        actualizadoEn: new Date(),
      })
      .where(eq(students.id, datos.studentId));
  }

  return {
    ok: true,
    sessionScore,
    direccion,
    nivelAnterior,
    nivelNuevo,
    razon: RAZONES[direccion],
  };
}
