'use server';

/**
 * Server Actions para gestión de estudiantes (niños)
 */
import { db, students, sessions, responses, achievements, skillProgress } from '@omegaread/db';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { requireAuth } from '../auth';
import type { DiagnosticoNivel } from '@omegaread/db/schema';

/** Crear perfil de niño */
export async function crearEstudiante(formData: FormData) {
  const padre = await requireAuth();

  const nombre = formData.get('nombre') as string;
  const fechaNacStr = formData.get('fechaNacimiento') as string;
  const mascotaTipo = (formData.get('mascotaTipo') as string) || 'gato';
  const mascotaNombre = (formData.get('mascotaNombre') as string) || 'Luna';

  if (!nombre || !fechaNacStr) {
    return { ok: false, error: 'Nombre y fecha de nacimiento son obligatorios' };
  }

  const [estudiante] = await db
    .insert(students)
    .values({
      parentId: padre.id,
      nombre: nombre.trim(),
      fechaNacimiento: new Date(fechaNacStr),
      mascotaTipo,
      mascotaNombre: mascotaNombre.trim(),
    })
    .returning();

  return { ok: true, estudiante };
}

/** Obtener estudiantes del padre actual */
export async function obtenerEstudiantes() {
  const padre = await requireAuth();

  return db.query.students.findMany({
    where: eq(students.parentId, padre.id),
    orderBy: [students.creadoEn],
  });
}

/** Obtener un estudiante por ID (verificando pertenencia al padre) */
export async function obtenerEstudiante(studentId: string) {
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });

  return estudiante;
}

/** Guardar resultado de diagnóstico invisible */
export async function guardarDiagnostico(studentId: string, resultado: DiagnosticoNivel) {
  await db
    .update(students)
    .set({
      nivelDiagnostico: resultado,
      diagnosticoCompletado: true,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, studentId));

  return { ok: true };
}

/** Guardar sesión completa */
export async function guardarSesion(datos: {
  studentId: string;
  tipoActividad: string;
  modulo: string;
  duracionSegundos: number;
  completada: boolean;
  estrellasGanadas: number;
  stickerGanado?: string;
  respuestas: Array<{
    ejercicioId: string;
    tipoEjercicio: string;
    pregunta: string;
    respuesta: string;
    respuestaCorrecta: string;
    correcta: boolean;
    tiempoRespuestaMs?: number;
    intentoNumero?: number;
  }>;
}) {
  // Crear sesión
  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: datos.studentId,
      tipoActividad: datos.tipoActividad,
      modulo: datos.modulo,
      duracionSegundos: datos.duracionSegundos,
      completada: datos.completada,
      estrellasGanadas: datos.estrellasGanadas,
      stickerGanado: datos.stickerGanado,
      finalizadaEn: new Date(),
    })
    .returning();

  // Guardar respuestas
  if (datos.respuestas.length > 0) {
    await db.insert(responses).values(
      datos.respuestas.map((r) => ({
        sessionId: sesion.id,
        ejercicioId: r.ejercicioId,
        tipoEjercicio: r.tipoEjercicio,
        pregunta: r.pregunta,
        respuesta: r.respuesta,
        respuestaCorrecta: r.respuestaCorrecta,
        correcta: r.correcta,
        tiempoRespuestaMs: r.tiempoRespuestaMs,
        intentoNumero: r.intentoNumero ?? 1,
      }))
    );
  }

  // Dar sticker como logro si hay uno
  if (datos.stickerGanado) {
    await db.insert(achievements).values({
      studentId: datos.studentId,
      tipo: 'sticker',
      logroId: `sticker-${Date.now()}`,
      nombre: datos.stickerGanado,
      icono: datos.stickerGanado,
      coleccion: 'sesiones',
    });
  }

  return { ok: true, sesionId: sesion.id };
}

/** Actualizar progreso de habilidad */
export async function actualizarProgreso(datos: {
  studentId: string;
  skillId: string;
  categoria: string;
  correcto: boolean;
}) {
  // Buscar progreso existente
  const existente = await db.query.skillProgress.findFirst({
    where: and(
      eq(skillProgress.studentId, datos.studentId),
      eq(skillProgress.skillId, datos.skillId)
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
  }

  return { ok: true };
}

/** Obtener resumen de progreso para dashboard de padre */
export async function obtenerResumenProgreso(studentId: string) {
  const padre = await requireAuth();

  // Verificar que el estudiante pertenece al padre
  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) return null;

  // Obtener progreso de habilidades
  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, studentId),
    orderBy: [skillProgress.categoria, skillProgress.skillId],
  });

  // Sesiones recientes
  const sesionesRecientes = await db.query.sessions.findMany({
    where: eq(sessions.studentId, studentId),
    orderBy: [desc(sessions.iniciadaEn)],
    limit: 10,
  });

  // Logros / stickers
  const logros = await db.query.achievements.findMany({
    where: eq(achievements.studentId, studentId),
    orderBy: [desc(achievements.ganadoEn)],
  });

  // Estadísticas de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const sesionesHoy = sesionesRecientes.filter(
    (s) => new Date(s.iniciadaEn) >= hoy
  );
  const tiempoHoyMin = sesionesHoy.reduce(
    (acc, s) => acc + (s.duracionSegundos ?? 0),
    0
  ) / 60;

  // Calcular racha
  const racha = calcularRacha(sesionesRecientes);

  // Vocales dominadas
  const vocalesDominadas = habilidades
    .filter((h) => h.categoria === 'vocales' && h.dominada)
    .map((h) => h.skillId.replace('vocal-', '').toUpperCase());

  return {
    estudiante,
    habilidades,
    sesionesHoy: sesionesHoy.length,
    tiempoHoyMin: Math.round(tiempoHoyMin),
    totalEstrellas: sesionesRecientes.reduce((acc, s) => acc + s.estrellasGanadas, 0),
    stickers: logros.filter((l) => l.tipo === 'sticker'),
    vocalesDominadas,
    racha,
    sesionesRecientes,
  };
}

/** Calcula días consecutivos con al menos 1 sesión */
function calcularRacha(sesiones: Array<{ iniciadaEn: Date }>): number {
  if (sesiones.length === 0) return 0;

  const dias = new Set(
    sesiones.map((s) => {
      const d = new Date(s.iniciadaEn);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let racha = 0;
  const hoy = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dias.has(key)) {
      racha++;
    } else if (i > 0) {
      break;
    }
  }

  return racha;
}
