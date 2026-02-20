'use server';

/**
 * Server Actions para gestión progresiva de sesiones.
 *
 * Permite crear sesiones al inicio, guardar respuestas individuales
 * conforme ocurren, y finalizar sesiones — evitando pérdida de datos
 * si el niño cierra la app a mitad de sesión.
 *
 * TODAS las funciones verifican autenticación (JWT) y ownership
 * (el padre autenticado debe ser dueño del estudiante).
 */
import {
  db,
  sessions,
  responses,
  achievements,
  skillProgress,
} from '@omegaread/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireStudentOwnership } from '../auth';
import {
  iniciarSesionSchema,
  guardarRespuestaSchema,
  actualizarSesionSchema,
  finalizarSesionSchema,
  actualizarProgresoSchema,
  cargarProgresoSchema,
} from '../validation';
import { ORDEN_SILABAS } from '@/lib/actividades/generadorSilabas';
import {
  fsrsInit,
  fsrsRatingFromOutcome,
  fsrsReview,
  readFsrsState,
} from '@/lib/actividades/fsrs';

// ─────────────────────────────────────────────
// INICIAR SESIÓN
// ─────────────────────────────────────────────

/**
 * Crea una nueva sesión de juego en la DB.
 * Se llama AL INICIO de la sesión, no al final.
 * Devuelve el sessionId para guardar respuestas progresivamente.
 *
 * Requiere autenticación + ownership del estudiante.
 */
export async function iniciarSesion(datos: {
  studentId: string;
  tipoActividad: string;
  modulo: string;
}) {
  // Validar inputs
  const validado = iniciarSesionSchema.parse(datos);

  // Verificar que el padre autenticado es dueño del estudiante
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

  return { ok: true, sessionId: sesion.id };
}

// ─────────────────────────────────────────────
// GUARDAR RESPUESTA INDIVIDUAL
// ─────────────────────────────────────────────

/**
 * Guarda UNA respuesta individual inmediatamente.
 * Se llama después de cada interacción del niño.
 *
 * Requiere autenticación + ownership (verifica a través del sessionId).
 */
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
  // Validar inputs
  const validado = guardarRespuestaSchema.parse(datos);

  // Verificar que el padre autenticado es dueño del estudiante
  await requireStudentOwnership(validado.studentId);

  // Verificar que la sesión pertenece al estudiante
  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });
  if (!sesion) {
    throw new Error('Sesión no encontrada o no pertenece al estudiante');
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

  return { ok: true };
}

// ─────────────────────────────────────────────
// ACTUALIZAR SESIÓN (estrellas, progreso)
// ─────────────────────────────────────────────

/**
 * Actualiza los datos de una sesión en curso.
 * Llamar periódicamente para auto-save de estrellas, etc.
 *
 * Requiere autenticación + ownership (verifica a través del sessionId).
 */
export async function actualizarSesionEnCurso(datos: {
  sessionId: string;
  studentId: string;
  estrellasGanadas?: number;
  metadata?: Record<string, unknown>;
}) {
  // Validar inputs
  const validado = actualizarSesionSchema.parse(datos);

  // Verificar que el padre autenticado es dueño del estudiante
  await requireStudentOwnership(validado.studentId);

  // Verificar que la sesión pertenece al estudiante
  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });
  if (!sesion) {
    throw new Error('Sesión no encontrada o no pertenece al estudiante');
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
// FINALIZAR SESIÓN
// ─────────────────────────────────────────────

/**
 * Marca una sesión como finalizada.
 * Las respuestas ya se guardaron progresivamente.
 *
 * Requiere autenticación + ownership del estudiante.
 */
export async function finalizarSesionDB(datos: {
  sessionId: string;
  duracionSegundos: number;
  completada: boolean;
  estrellasGanadas: number;
  stickerGanado?: string;
  studentId: string;
}) {
  // Validar inputs
  const validado = finalizarSesionSchema.parse(datos);

  // Verificar que el padre autenticado es dueño del estudiante
  await requireStudentOwnership(validado.studentId);

  // Verificar que la sesión pertenece al estudiante
  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });
  if (!sesion) {
    throw new Error('Sesión no encontrada o no pertenece al estudiante');
  }

  // Actualizar sesión
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

  // Guardar sticker como logro
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
 * Actualiza el progreso de una habilidad inmediatamente tras cada respuesta.
 * Esto asegura que el progreso persiste aunque se cierre la app.
 *
 * Usa ventana deslizante de las últimas 10 respuestas (igual que MasteryTracker
 * del cliente) para evitar divergencia entre mastery percibido y guardado.
 *
 * Requiere autenticación + ownership del estudiante.
 */
export async function actualizarProgresoInmediato(datos: {
  studentId: string;
  skillId: string;
  categoria: string;
  correcto: boolean;
  calidad?: 1 | 2 | 3 | 4;
  tiempoRespuestaMs?: number;
}) {
  // Validar inputs
  const validado = actualizarProgresoSchema.parse(datos);

  // Verificar que el padre autenticado es dueño del estudiante
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

    // Ventana deslizante: mantener historial de las últimas N respuestas
    const meta = (existente.metadata ?? {}) as Record<string, unknown>;
    const historial = Array.isArray(meta.historialReciente)
      ? (meta.historialReciente as unknown[]).filter(
          (v): v is boolean => typeof v === 'boolean',
        )
      : [];
    historial.push(validado.correcto);
    // Mantener solo las últimas VENTANA_MASTERY respuestas
    const historialReciente = historial.slice(-VENTANA_MASTERY);

    // Calcular mastery con ventana deslizante (igual que MasteryTracker del cliente)
    let nivelMastery = 0;
    if (totalIntentos >= MIN_INTENTOS) {
      const aciertosRecientes = historialReciente.filter(Boolean).length;
      nivelMastery = aciertosRecientes / historialReciente.length;
    }
    let dominada = nivelMastery >= UMBRAL_MASTERY && totalIntentos >= MIN_INTENTOS;
    let proximaRevision = existente.proximaRevision;
    let fsrsDebug: Record<string, unknown> | undefined;

    // Ola 2: FSRS real para sílabas (scheduler de repaso)
    if (validado.categoria === 'silabas') {
      const rating =
        validado.calidad ??
        fsrsRatingFromOutcome(validado.correcto, validado.tiempoRespuestaMs);
      const fsrsPrevio = readFsrsState(meta);
      const revision = fsrsPrevio
        ? fsrsReview(fsrsPrevio, ahora, rating)
        : fsrsInit(ahora, rating);

      proximaRevision = new Date(revision.dueAt);
      fsrsDebug = {
        rating: revision.rating,
        intervalDays: revision.intervalDays,
        retrievability: revision.retrievability,
      };

      // Dominar sílabas exige exactitud y estabilidad mínima de repaso.
      dominada =
        totalIntentos >= 4 &&
        nivelMastery >= 0.85 &&
        revision.state.stability >= 2.5;

      meta.fsrs = revision.state;
    }

    await db
      .update(skillProgress)
      .set({
        totalIntentos,
        totalAciertos,
        nivelMastery,
        dominada,
        ultimaPractica: ahora,
        proximaRevision,
        actualizadoEn: ahora,
        metadata: { ...meta, historialReciente, ...(fsrsDebug ? { fsrsDebug } : {}) },
      })
      .where(eq(skillProgress.id, existente.id));

    return {
      ok: true,
      nivelMastery,
      dominada,
      totalIntentos,
      totalAciertos,
      proximaRevision: proximaRevision?.toISOString() ?? null,
    };
  } else {
    const historialReciente = [validado.correcto];
    const ahora = new Date();
    let metadata: Record<string, unknown> = { historialReciente };
    let proximaRevision: Date | null = null;

    if (validado.categoria === 'silabas') {
      const rating =
        validado.calidad ??
        fsrsRatingFromOutcome(validado.correcto, validado.tiempoRespuestaMs);
      const inicio = fsrsInit(ahora, rating);
      metadata = {
        ...metadata,
        fsrs: inicio.state,
        fsrsDebug: {
          rating: inicio.rating,
          intervalDays: inicio.intervalDays,
          retrievability: inicio.retrievability,
        },
      };
      proximaRevision = new Date(inicio.dueAt);
    }

    await db.insert(skillProgress).values({
      studentId: validado.studentId,
      skillId: validado.skillId,
      categoria: validado.categoria,
      totalIntentos: 1,
      totalAciertos: validado.correcto ? 1 : 0,
      nivelMastery: 0,
      dominada: false,
      ultimaPractica: ahora,
      proximaRevision,
      metadata,
    });

    return {
      ok: true,
      nivelMastery: 0,
      dominada: false,
      totalIntentos: 1,
      totalAciertos: validado.correcto ? 1 : 0,
      proximaRevision: proximaRevision?.toISOString() ?? null,
    };
  }
}

// ─────────────────────────────────────────────
// CARGAR PROGRESO DEL ESTUDIANTE
// ─────────────────────────────────────────────

/**
 * Carga todo el progreso de un estudiante: estrellas, stickers, habilidades.
 * Se usa al llegar al mapa o cualquier pantalla que necesite el estado real.
 *
 * Requiere autenticación + ownership del estudiante.
 */
export async function cargarProgresoEstudiante(studentId: string) {
  // Validar input
  const validStudentId = cargarProgresoSchema.parse(studentId);

  // Verificar que el padre autenticado es dueño del estudiante
  await requireStudentOwnership(validStudentId);

  // Progreso de habilidades
  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, validStudentId),
  });

  // Logros / stickers
  const logros = await db.query.achievements.findMany({
    where: eq(achievements.studentId, validStudentId),
    orderBy: [desc(achievements.ganadoEn)],
  });

  // Sesiones para calcular estrellas totales (sin limit para total correcto)
  const sesiones = await db.query.sessions.findMany({
    where: eq(sessions.studentId, validStudentId),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  // Calcular totales
  const totalEstrellas = sesiones.reduce((acc, s) => acc + s.estrellasGanadas, 0);
  const stickers = logros.filter((l) => l.tipo === 'sticker');

  // Vocales dominadas
  const vocalesDominadas = habilidades
    .filter((h) => h.categoria === 'vocales' && h.dominada)
    .map((h) => h.skillId.replace('vocal-', '').toUpperCase());

  // Vocal actual (primera no dominada)
  const ORDEN_VOCALES = ['A', 'E', 'I', 'O', 'U'];
  const vocalActual = ORDEN_VOCALES.find((v) => !vocalesDominadas.includes(v)) ?? 'A';

  // Silabas dominadas (Ola 2)
  const silabasDominadas = habilidades
    .filter((h) => h.categoria === 'silabas' && h.dominada)
    .map((h) => h.skillId.replace('silaba-', '').toUpperCase());

  // Silaba actual (primera no dominada)
  const silabaActual = ORDEN_SILABAS.find((s) => !silabasDominadas.includes(s)) ?? ORDEN_SILABAS[0];

  // Issue #10: Auto-close orphaned sessions (inactive > 1 hour)
  const UNA_HORA_MS = 60 * 60 * 1000;
  const ahora = Date.now();
  const sesionesHuerfanas = sesiones.filter(
    (s) => !s.completada && !s.finalizadaEn &&
    (ahora - new Date(s.iniciadaEn).getTime()) > UNA_HORA_MS
  );

  // Finalizar sesiones huérfanas automáticamente en background
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
        // Best effort — don't block loading
      }
    }
  }

  // Sesión en curso (sin finalizar, active < 1h)?
  const sesionEnCurso = sesiones.find(
    (s) => !s.completada && !s.finalizadaEn &&
    (ahora - new Date(s.iniciadaEn).getTime()) <= UNA_HORA_MS
  );

  return {
    totalEstrellas,
    stickers: stickers.map((s) => ({
      id: s.logroId,
      emoji: s.icono ?? '⭐',
      nombre: s.nombre,
      ganado: true,
      ganadoEn: s.ganadoEn,
    })),
    vocalesDominadas,
    vocalActual,
    silabasDominadas,
    silabaActual,
    habilidades,
    sesionEnCurso: sesionEnCurso
      ? { id: sesionEnCurso.id, tipoActividad: sesionEnCurso.tipoActividad }
      : null,
    totalSesiones: sesiones.length,
  };
}
