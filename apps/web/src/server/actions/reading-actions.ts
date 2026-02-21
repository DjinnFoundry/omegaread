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
  manualAdjustments,
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
 * Formula v2:
 *   session_score = 0.55 * comprension + 0.25 * wpm_ratio + 0.10 * ritmo_mejora + 0.10 * estabilidad
 *
 * Reglas:
 *   - score >= 80%: subir
 *   - score 60-79%: mantener
 *   - score < 60%: bajar
 */
export async function calcularAjusteDificultad(datos: {
  studentId: string;
  sessionId: string;
  comprensionScore: number;
  tiempoLecturaMs: number;
  tiempoEsperadoMs: number;
  wpmPromedio?: number;
}) {
  const { estudiante } = await requireStudentOwnership(datos.studentId);

  // Clamp nivel anterior a [1.0, 4.8]
  const nivelAnterior = Math.max(1.0, Math.min(4.8, estudiante.nivelLectura ?? 1.0));

  // Calcular wpm_ratio: clamp(wpm_real / wpmEsperado, 0, 1.5) normalizado a 0-1
  const nivelConfig = getNivelConfig(nivelAnterior);
  const wpmEsperado = nivelConfig.wpmEsperado;
  let wpmRatio = 0.5; // fallback si no hay datos
  if (datos.wpmPromedio && wpmEsperado > 0) {
    const rawRatio = Math.max(0, Math.min(1.5, datos.wpmPromedio / wpmEsperado));
    wpmRatio = rawRatio / 1.5; // normalizar a 0-1
  }

  // Transaccion para evitar race conditions entre read-compute-write
  return db.transaction(async (tx) => {
    const sesionesRecientes = await tx.query.sessions.findMany({
      where: and(
        eq(sessions.studentId, datos.studentId),
        eq(sessions.tipoActividad, 'lectura'),
      ),
      orderBy: [desc(sessions.iniciadaEn)],
      limit: 5,
    });

    // Estabilidad: consistencia en comprension de sesiones recientes
    let estabilidad = 0.5;
    if (sesionesRecientes.length >= 3) {
      const scores = sesionesRecientes
        .filter(s => s.metadata && typeof (s.metadata as Record<string, unknown>).comprensionScore === 'number')
        .map(s => (s.metadata as Record<string, unknown>).comprensionScore as number);
      if (scores.length >= 2) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const varianza = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        estabilidad = Math.max(0, 1 - varianza * 4);
      }
    }

    // Ritmo mejora: comparar WPM actual vs media de sesiones anteriores
    let ritmoMejora = 0.5; // neutro por defecto
    if (datos.wpmPromedio) {
      const wpmsPrevios = sesionesRecientes
        .filter(s => typeof s.wpmPromedio === 'number' && s.wpmPromedio > 0)
        .map(s => s.wpmPromedio as number);
      if (wpmsPrevios.length > 0) {
        const mediaPrevio = wpmsPrevios.reduce((a, b) => a + b, 0) / wpmsPrevios.length;
        if (mediaPrevio > 0) {
          // >1 = mejora, <1 = retroceso, normalizado a 0-1
          const ratioMejora = datos.wpmPromedio / mediaPrevio;
          ritmoMejora = Math.max(0, Math.min(1, ratioMejora - 0.5));
        }
      }
    }

    // Sprint 4: Buscar si hubo ajuste manual en esta sesion
    const ajusteManual = await tx.query.manualAdjustments.findFirst({
      where: and(
        eq(manualAdjustments.sessionId, datos.sessionId),
        eq(manualAdjustments.studentId, datos.studentId),
      ),
    });

    let modificadorManual = 0;
    let ajusteManualTipo: 'mas_facil' | 'mas_desafiante' | null = null;

    if (ajusteManual) {
      ajusteManualTipo = ajusteManual.tipo as 'mas_facil' | 'mas_desafiante';
      if (ajusteManualTipo === 'mas_facil') {
        modificadorManual = -0.10;
      } else if (ajusteManualTipo === 'mas_desafiante' && datos.comprensionScore >= 0.75) {
        modificadorManual = 0.10;
      }
    }

    const sessionScoreBase = calcularSessionScore({
      comprension: datos.comprensionScore,
      wpmRatio,
      ritmoMejora,
      estabilidad,
    });

    const sessionScore = Math.max(0, Math.min(1,
      Math.round((sessionScoreBase + modificadorManual) * 100) / 100
    ));

    const direccionCandidata: DireccionAjuste = determinarAjuste(sessionScore);

    // Logica de sesiones consecutivas para evitar cambios bruscos de nivel.
    // Usa sessionScore compuesto (con fallback a comprensionScore para datos legacy).
    let direccion: DireccionAjuste = direccionCandidata;

    const getSessionScorePrevio = (s: typeof sesionesRecientes[number]): number | null => {
      const meta = s.metadata as Record<string, unknown> | null;
      if (!meta) return null;
      if (typeof meta.sessionScore === 'number') return meta.sessionScore;
      if (typeof meta.comprensionScore === 'number') return meta.comprensionScore;
      return null;
    };

    if (direccionCandidata === 'subir') {
      const scoresPrevios = sesionesRecientes
        .slice(0, 2)
        .map(getSessionScorePrevio)
        .filter((sc): sc is number => sc !== null);
      if (scoresPrevios.filter(sc => sc >= 0.80).length < 2) {
        direccion = 'mantener';
      }
    }

    if (direccionCandidata === 'bajar') {
      const scoresPrevios = sesionesRecientes
        .slice(0, 1)
        .map(getSessionScorePrevio)
        .filter((sc): sc is number => sc !== null);
      if (scoresPrevios.filter(sc => sc < 0.60).length < 1) {
        direccion = 'mantener';
      }
    }

    let nivelNuevo = nivelAnterior;
    if (direccion === 'subir') nivelNuevo = Math.min(nivelAnterior + 0.5, 4);
    if (direccion === 'bajar') nivelNuevo = Math.max(nivelAnterior - 0.5, 1);

    const scorePct = Math.round(sessionScore * 100);
    const RAZONES: Record<DireccionAjuste, string> = {
      subir: `Score ${scorePct}% (>=80%) en 3 sesiones consecutivas. Subimos dificultad.`,
      mantener: `Score ${scorePct}% (60-79%). Mantenemos nivel actual.`,
      bajar: `Score ${scorePct}% (<60%) en 2 sesiones consecutivas. Bajamos dificultad para consolidar.`,
    };

    const razonFinal = ajusteManualTipo
      ? `${RAZONES[direccion]} (Ajuste manual: ${ajusteManualTipo}, modificador: ${modificadorManual > 0 ? '+' : ''}${Math.round(modificadorManual * 100)}%)`
      : RAZONES[direccion];

    await tx.insert(difficultyAdjustments).values({
      studentId: datos.studentId,
      sessionId: datos.sessionId,
      nivelAnterior,
      nivelNuevo,
      direccion,
      razon: razonFinal,
      evidencia: {
        comprensionScore: datos.comprensionScore,
        ritmoNormalizado: Math.round(ritmoNormalizado * 100) / 100,
        estabilidad: Math.round(estabilidad * 100) / 100,
        sessionScore,
        ajusteManual: ajusteManualTipo,
        modificadorManual: modificadorManual !== 0 ? modificadorManual : undefined,
      },
    });

    if (nivelNuevo !== nivelAnterior) {
      await tx
        .update(students)
        .set({
          nivelLectura: nivelNuevo,
          actualizadoEn: new Date(),
        })
        .where(eq(students.id, datos.studentId));
    }

    return {
      ok: true as const,
      sessionScore,
      direccion,
      nivelAnterior,
      nivelNuevo,
      razon: RAZONES[direccion],
    };
  });
}
