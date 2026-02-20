'use server';

/**
 * Server Actions para gestión progresiva de sesiones.
 *
 * Permite crear sesiones al inicio, guardar respuestas individuales
 * conforme ocurren, y finalizar sesiones — evitando pérdida de datos
 * si el niño cierra la app a mitad de sesión.
 */
import {
  db,
  sessions,
  responses,
  achievements,
  skillProgress,
} from '@omegaread/db';
import { eq, and, desc } from 'drizzle-orm';

// ─────────────────────────────────────────────
// INICIAR SESIÓN
// ─────────────────────────────────────────────

/**
 * Crea una nueva sesión de juego en la DB.
 * Se llama AL INICIO de la sesión, no al final.
 * Devuelve el sessionId para guardar respuestas progresivamente.
 */
export async function iniciarSesion(datos: {
  studentId: string;
  tipoActividad: string;
  modulo: string;
}) {
  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: datos.studentId,
      tipoActividad: datos.tipoActividad,
      modulo: datos.modulo,
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
 */
export async function guardarRespuestaIndividual(datos: {
  sessionId: string;
  ejercicioId: string;
  tipoEjercicio: string;
  pregunta: string;
  respuesta: string;
  respuestaCorrecta: string;
  correcta: boolean;
  tiempoRespuestaMs?: number;
  intentoNumero?: number;
}) {
  await db.insert(responses).values({
    sessionId: datos.sessionId,
    ejercicioId: datos.ejercicioId,
    tipoEjercicio: datos.tipoEjercicio,
    pregunta: datos.pregunta,
    respuesta: datos.respuesta,
    respuestaCorrecta: datos.respuestaCorrecta,
    correcta: datos.correcta,
    tiempoRespuestaMs: datos.tiempoRespuestaMs,
    intentoNumero: datos.intentoNumero ?? 1,
  });

  return { ok: true };
}

// ─────────────────────────────────────────────
// ACTUALIZAR SESIÓN (estrellas, progreso)
// ─────────────────────────────────────────────

/**
 * Actualiza los datos de una sesión en curso.
 * Llamar periódicamente para auto-save de estrellas, etc.
 */
export async function actualizarSesionEnCurso(datos: {
  sessionId: string;
  estrellasGanadas?: number;
  metadata?: Record<string, unknown>;
}) {
  const updates: Record<string, unknown> = {};
  if (datos.estrellasGanadas !== undefined) {
    updates.estrellasGanadas = datos.estrellasGanadas;
  }
  if (datos.metadata) {
    updates.metadata = datos.metadata;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, datos.sessionId));
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// FINALIZAR SESIÓN
// ─────────────────────────────────────────────

/**
 * Marca una sesión como finalizada.
 * Las respuestas ya se guardaron progresivamente.
 */
export async function finalizarSesionDB(datos: {
  sessionId: string;
  duracionSegundos: number;
  completada: boolean;
  estrellasGanadas: number;
  stickerGanado?: string;
  studentId: string;
}) {
  // Actualizar sesión
  await db
    .update(sessions)
    .set({
      duracionSegundos: datos.duracionSegundos,
      completada: datos.completada,
      estrellasGanadas: datos.estrellasGanadas,
      stickerGanado: datos.stickerGanado,
      finalizadaEn: new Date(),
    })
    .where(eq(sessions.id, datos.sessionId));

  // Guardar sticker como logro
  if (datos.stickerGanado) {
    await db.insert(achievements).values({
      studentId: datos.studentId,
      tipo: 'sticker',
      logroId: `sticker-${datos.sessionId}`,
      nombre: datos.stickerGanado,
      icono: datos.stickerGanado,
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
 */
export async function actualizarProgresoInmediato(datos: {
  studentId: string;
  skillId: string;
  categoria: string;
  correcto: boolean;
}) {
  const existente = await db.query.skillProgress.findFirst({
    where: and(
      eq(skillProgress.studentId, datos.studentId),
      eq(skillProgress.skillId, datos.skillId),
    ),
  });

  if (existente) {
    const totalIntentos = existente.totalIntentos + 1;
    const totalAciertos = existente.totalAciertos + (datos.correcto ? 1 : 0);
    const nivelMastery = totalIntentos >= 5 ? totalAciertos / totalIntentos : 0;
    const dominada = nivelMastery >= 0.9 && totalIntentos >= 5;

    await db
      .update(skillProgress)
      .set({
        totalIntentos,
        totalAciertos,
        nivelMastery,
        dominada,
        ultimaPractica: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(skillProgress.id, existente.id));

    return { ok: true, nivelMastery, dominada, totalIntentos, totalAciertos };
  } else {
    await db.insert(skillProgress).values({
      studentId: datos.studentId,
      skillId: datos.skillId,
      categoria: datos.categoria,
      totalIntentos: 1,
      totalAciertos: datos.correcto ? 1 : 0,
      nivelMastery: 0,
      dominada: false,
      ultimaPractica: new Date(),
    });

    return { ok: true, nivelMastery: 0, dominada: false, totalIntentos: 1, totalAciertos: datos.correcto ? 1 : 0 };
  }
}

// ─────────────────────────────────────────────
// CARGAR PROGRESO DEL ESTUDIANTE
// ─────────────────────────────────────────────

/**
 * Carga todo el progreso de un estudiante: estrellas, stickers, habilidades.
 * Se usa al llegar al mapa o cualquier pantalla que necesite el estado real.
 */
export async function cargarProgresoEstudiante(studentId: string) {
  // Progreso de habilidades
  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, studentId),
  });

  // Logros / stickers
  const logros = await db.query.achievements.findMany({
    where: eq(achievements.studentId, studentId),
    orderBy: [desc(achievements.ganadoEn)],
  });

  // Sesiones para calcular estrellas totales
  const sesiones = await db.query.sessions.findMany({
    where: eq(sessions.studentId, studentId),
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

  // Sesión en curso (sin finalizar)?
  const sesionEnCurso = sesiones.find((s) => !s.completada && !s.finalizadaEn);

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
    habilidades,
    sesionEnCurso: sesionEnCurso
      ? { id: sesionEnCurso.id, tipoActividad: sesionEnCurso.tipoActividad }
      : null,
    totalSesiones: sesiones.length,
  };
}
