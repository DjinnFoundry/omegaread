'use server';

/**
 * Server Actions para gestion progresiva de sesiones de lectura.
 *
 * Permite crear sesiones al inicio, guardar respuestas individuales
 * conforme ocurren, y finalizar sesiones.
 *
 * TODAS las funciones verifican autenticacion (JWT) y ownership.
 */
import { getDb } from '@/server/db';
import {
  sessions,
  responses,
  achievements,
  skillProgress,
  eq,
  and,
  desc,
} from '@omegaread/db';
import { requireStudentOwnership } from '../auth';
import {
  iniciarSesionSchema,
  guardarRespuestaSchema,
  actualizarSesionSchema,
  finalizarSesionSchema,
  actualizarProgresoSchema,
  cargarProgresoSchema,
} from '../validation';
import { ok, type ActionResult } from '@/lib/types/errors';

// ─────────────────────────────────────────────
// INICIAR SESION
// ─────────────────────────────────────────────

export async function iniciarSesion(datos: {
  studentId: string;
  tipoActividad: string;
  modulo: string;
}): Promise<ActionResult<{ sessionId: string }>> {
  const db = await getDb();
  const validado = iniciarSesionSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: validado.studentId,
      tipoActividad: validado.tipoActividad,
      modulo: validado.modulo,
      completada: false,
      estrellasGanadas: 0,
    })
    .returning();

  return ok({ sessionId: sesion.id });
}

// ─────────────────────────────────────────────
// GUARDAR RESPUESTA INDIVIDUAL
// ─────────────────────────────────────────────

export async function guardarRespuestaIndividual(datos: {
  sessionId: string;
  studentId: string;
  ejercicioId: string;
  tipoEjercicio: string;
  pregunta: string;
  respuesta: string;
  respuestaCorrecta: string;
  correcta: boolean;
  tiempoRespuestaMs?: number;
  intentoNumero?: number;
}) {
  const db = await getDb();
  const validado = guardarRespuestaSchema.parse(datos);
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
    ejercicioId: validado.ejercicioId,
    tipoEjercicio: validado.tipoEjercicio,
    pregunta: validado.pregunta,
    respuesta: validado.respuesta,
    respuestaCorrecta: validado.respuestaCorrecta,
    correcta: validado.correcta,
    tiempoRespuestaMs: validado.tiempoRespuestaMs,
    intentoNumero: validado.intentoNumero ?? 1,
  });

  return ok({});
}

// ─────────────────────────────────────────────
// ACTUALIZAR SESION (metadata, progreso)
// ─────────────────────────────────────────────

export async function actualizarSesionEnCurso(datos: {
  sessionId: string;
  studentId: string;
  estrellasGanadas?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  const validado = actualizarSesionSchema.parse(datos);
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

  const updates: Record<string, unknown> = {};
  if (validado.estrellasGanadas !== undefined) {
    updates.estrellasGanadas = validado.estrellasGanadas;
  }
  if (validado.metadata) {
    updates.metadata = validado.metadata;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, validado.sessionId));
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// FINALIZAR SESION
// ─────────────────────────────────────────────

export async function finalizarSesionDB(datos: {
  sessionId: string;
  duracionSegundos: number;
  completada: boolean;
  estrellasGanadas: number;
  stickerGanado?: string;
  studentId: string;
}) {
  const db = await getDb();
  const validado = finalizarSesionSchema.parse(datos);
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

  await db
    .update(sessions)
    .set({
      duracionSegundos: validado.duracionSegundos,
      completada: validado.completada,
      estrellasGanadas: validado.estrellasGanadas,
      stickerGanado: validado.stickerGanado,
      finalizadaEn: new Date(),
    })
    .where(eq(sessions.id, validado.sessionId));

  if (validado.stickerGanado) {
    await db.insert(achievements).values({
      studentId: validado.studentId,
      tipo: 'sticker',
      logroId: `sticker-${validado.sessionId}`,
      nombre: validado.stickerGanado,
      icono: validado.stickerGanado,
      coleccion: 'sesiones',
    });
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// ACTUALIZAR PROGRESO DE HABILIDAD (inmediato)
// ─────────────────────────────────────────────

/**
 * Actualiza el progreso de una habilidad tras cada respuesta.
 * Usa ventana deslizante de las ultimas 10 respuestas.
 */
export async function actualizarProgresoInmediato(datos: {
  studentId: string;
  skillId: string;
  categoria: string;
  correcto: boolean;
  tiempoRespuestaMs?: number;
}) {
  const db = await getDb();
  const validado = actualizarProgresoSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const VENTANA_MASTERY = 10;
  const MIN_INTENTOS = 5;
  const UMBRAL_MASTERY = 0.9;

  const existente = await db.query.skillProgress.findFirst({
    where: and(
      eq(skillProgress.studentId, validado.studentId),
      eq(skillProgress.skillId, validado.skillId),
    ),
  });

  if (existente) {
    const ahora = new Date();
    const totalIntentos = existente.totalIntentos + 1;
    const totalAciertos = existente.totalAciertos + (validado.correcto ? 1 : 0);

    const meta = (existente.metadata ?? {}) as Record<string, unknown>;
    const historial = Array.isArray(meta.historialReciente)
      ? (meta.historialReciente as unknown[]).filter(
          (v): v is boolean => typeof v === 'boolean',
        )
      : [];
    historial.push(validado.correcto);
    const historialReciente = historial.slice(-VENTANA_MASTERY);

    let nivelMastery = 0;
    if (totalIntentos >= MIN_INTENTOS) {
      const aciertosRecientes = historialReciente.filter(Boolean).length;
      nivelMastery = aciertosRecientes / historialReciente.length;
    }
    const dominada = nivelMastery >= UMBRAL_MASTERY && totalIntentos >= MIN_INTENTOS;

    await db
      .update(skillProgress)
      .set({
        totalIntentos,
        totalAciertos,
        nivelMastery,
        dominada,
        ultimaPractica: ahora,
        actualizadoEn: ahora,
        metadata: { ...meta, historialReciente },
      })
      .where(eq(skillProgress.id, existente.id));

    return { ok: true, nivelMastery, dominada, totalIntentos, totalAciertos };
  } else {
    const ahora = new Date();

    await db.insert(skillProgress).values({
      studentId: validado.studentId,
      skillId: validado.skillId,
      categoria: validado.categoria,
      totalIntentos: 1,
      totalAciertos: validado.correcto ? 1 : 0,
      nivelMastery: 0,
      dominada: false,
      ultimaPractica: ahora,
      metadata: { historialReciente: [validado.correcto] },
    });

    return { ok: true, nivelMastery: 0, dominada: false, totalIntentos: 1, totalAciertos: validado.correcto ? 1 : 0 };
  }
}

// ─────────────────────────────────────────────
// CARGAR PROGRESO DEL ESTUDIANTE
// ─────────────────────────────────────────────

/**
 * Carga el progreso de un estudiante: sesiones, habilidades, logros.
 */
export async function cargarProgresoEstudiante(studentId: string) {
  const db = await getDb();
  const validStudentId = cargarProgresoSchema.parse(studentId);
  await requireStudentOwnership(validStudentId);

  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, validStudentId),
  });

  const sesiones = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, validStudentId),
      eq(sessions.tipoActividad, 'lectura'),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  const totalEstrellas = sesiones.reduce((acc, s) => acc + s.estrellasGanadas, 0);

  // Auto-close orphaned sessions (inactive > 1 hour)
  const UNA_HORA_MS = 60 * 60 * 1000;
  const ahora = Date.now();
  const sesionesHuerfanas = sesiones.filter(
    (s) => !s.completada && !s.finalizadaEn &&
    (ahora - new Date(s.iniciadaEn).getTime()) > UNA_HORA_MS
  );

  if (sesionesHuerfanas.length > 0) {
    for (const huerfana of sesionesHuerfanas) {
      try {
        await db
          .update(sessions)
          .set({
            completada: false,
            finalizadaEn: new Date(),
            duracionSegundos: Math.round(
              (ahora - new Date(huerfana.iniciadaEn).getTime()) / 1000
            ),
          })
          .where(eq(sessions.id, huerfana.id));
      } catch {
        // Best effort
      }
    }
  }

  const sesionEnCurso = sesiones.find(
    (s) => !s.completada && !s.finalizadaEn &&
    (ahora - new Date(s.iniciadaEn).getTime()) <= UNA_HORA_MS
  );

  return {
    totalEstrellas,
    habilidades,
    sesionEnCurso: sesionEnCurso
      ? { id: sesionEnCurso.id, tipoActividad: sesionEnCurso.tipoActividad }
      : null,
    totalSesiones: sesiones.length,
  };
}
