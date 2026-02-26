'use server';

/**
 * Server Actions for session finalization.
 * Handles marking reading complete, saving responses, ELO calculation,
 * skill progress updates, and stars assignment.
 */
import { getDb } from '@/server/db';
import {
  sessions,
  responses,
  students,
  storyQuestions,
  eloSnapshots,
  eq,
  and,
  desc,
} from '@zetaread/db';
import { requireStudentOwnership } from '../auth';
import {
  registrarLecturaCompletadaSchema,
  finalizarSesionLecturaSchema,
} from '../validation';
import { getNivelConfig } from '@/lib/ai/prompts';
import { calcularAjusteDificultad } from './reading-actions';
import { actualizarProgresoInmediato } from './session-actions';
import { procesarRespuestasElo, inflarRdPorInactividad, type EloRatings, type RespuestaElo } from '@/lib/elo';
import type { TipoPregunta, AudioReadingAnalysis } from '@/lib/types/reading';
import { serializarAudioAnalisis } from '@/lib/audio/utils';
import { parseSessionMetadata, mergeSessionMetadata } from '@/lib/types/session-metadata';

// ─── Constants ───

// Porcentaje minimo de aciertos para marcar el topic skill como correcto.
const UMBRAL_ACIERTO_TOPIC_SKILL = 0.75;

// Umbrales para asignar estrellas al finalizar una sesion de lectura.
const UMBRAL_ESTRELLAS_3 = 1.0;   // 100% de aciertos: 3 estrellas
const UMBRAL_ESTRELLAS_2 = 0.75;  // >= 75%: 2 estrellas
// Cualquier acierto > 0: 1 estrella

// ─── Server Actions ───

/**
 * Marca el hito guiding-star de una sesion: lectura completada.
 * Se dispara al terminar de leer, incluso si aun no responde preguntas.
 */
export async function registrarLecturaCompletada(datos: {
  sessionId: string;
  studentId: string;
  tiempoLecturaMs: number;
  wpmPromedio?: number | null;
  wpmPorPagina?: Array<{ pagina: number; wpm: number }> | null;
  totalPaginas?: number | null;
  audioAnalisis?: AudioReadingAnalysis;
}) {
  const db = await getDb();
  const validado = registrarLecturaCompletadaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
  });

  if (!sesion) {
    return { ok: false as const, error: 'Sesion no encontrada' };
  }

  const metadataBase = parseSessionMetadata(sesion.metadata);
  const yaMarcada = metadataBase.lecturaCompletada === true;
  const lecturaCompletadaEn = metadataBase.lecturaCompletadaEn ?? new Date().toISOString();

  const usarAudioParaWpm =
    !!validado.audioAnalisis?.confiable && validado.audioAnalisis.wpmUtil > 0;
  const wpmPromedioFinal = usarAudioParaWpm
    ? (validado.audioAnalisis?.wpmUtil ?? null)
    : (validado.wpmPromedio ?? null);

  await db
    .update(sessions)
    .set({
      wpmPromedio: wpmPromedioFinal ?? sesion.wpmPromedio ?? null,
      wpmPorPagina: validado.wpmPorPagina ?? sesion.wpmPorPagina ?? null,
      totalPaginas: validado.totalPaginas ?? sesion.totalPaginas ?? null,
      metadata: mergeSessionMetadata(sesion.metadata, {
        lecturaCompletada: true,
        lecturaCompletadaEn,
        tiempoLecturaMs: validado.tiempoLecturaMs,
        fuenteWpm: usarAudioParaWpm ? 'audio' : 'pagina',
        audioAnalisis: serializarAudioAnalisis(validado.audioAnalisis, metadataBase.audioAnalisis ?? null),
      }),
    })
    .where(eq(sessions.id, validado.sessionId));

  return {
    ok: true as const,
    alreadyMarked: yaMarcada,
    lecturaCompletadaEn,
  };
}

/**
 * Finaliza una sesion de lectura: guarda respuestas, calcula score, ajusta nivel.
 */
export async function finalizarSesionLectura(datos: {
  sessionId: string;
  studentId: string;
  tiempoLecturaMs: number;
  respuestas: Array<{
    preguntaId: string;
    tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
    respuestaSeleccionada: number;
    correcta: boolean;
    tiempoMs: number;
  }>;
  wpmPromedio?: number | null;
  wpmPorPagina?: Array<{ pagina: number; wpm: number }> | null;
  totalPaginas?: number | null;
  audioAnalisis?: AudioReadingAnalysis;
}) {
  const db = await getDb();
  const validado = finalizarSesionLecturaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  // Verificar sesion
  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
  });

  if (!sesion) {
    return { ok: false as const, error: 'Sesion no encontrada' };
  }

  if (sesion.completada) {
    return { ok: false as const, error: 'La sesion ya fue finalizada' };
  }

  // 1. Guardar respuestas individuales (batch insert)
  await db.insert(responses).values(
    validado.respuestas.map((resp) => ({
      sessionId: validado.sessionId,
      ejercicioId: resp.preguntaId,
      tipoEjercicio: resp.tipo,
      pregunta: resp.preguntaId,
      respuesta: String(resp.respuestaSeleccionada),
      respuestaCorrecta: String(resp.correcta ? resp.respuestaSeleccionada : 'incorrecto'),
      correcta: resp.correcta,
      tiempoRespuestaMs: resp.tiempoMs,
    })),
  );

  // 1b. Actualizar skill progress por tipo de pregunta
  const topicSlug = parseSessionMetadata(sesion.metadata).topicSlug;
  for (const resp of validado.respuestas) {
    await actualizarProgresoInmediato({
      studentId: validado.studentId,
      skillId: `comprension-${resp.tipo}`,
      categoria: 'comprension',
      correcto: resp.correcta,
      tiempoRespuestaMs: resp.tiempoMs,
    });
  }
  if (topicSlug) {
    const aciertosTotal = validado.respuestas.filter((r) => r.correcta).length;
    await actualizarProgresoInmediato({
      studentId: validado.studentId,
      skillId: `topic-${topicSlug}`,
      categoria: 'topic',
      correcto: aciertosTotal >= Math.ceil(validado.respuestas.length * UMBRAL_ACIERTO_TOPIC_SKILL),
    });
  }

  // 2. Calcular comprension
  const totalPreguntas = validado.respuestas.length;
  const aciertos = validado.respuestas.filter((r) => r.correcta).length;
  const comprensionScore = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;

  // 3. Marcar sesion como completada
  const duracionSegundos = Math.round(validado.tiempoLecturaMs / 1000);
  const ratioAciertos = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;
  const estrellas = ratioAciertos >= UMBRAL_ESTRELLAS_3 ? 3 : ratioAciertos >= UMBRAL_ESTRELLAS_2 ? 2 : ratioAciertos > 0 ? 1 : 0;
  const usarAudioParaWpm =
    !!validado.audioAnalisis?.confiable && validado.audioAnalisis.wpmUtil > 0;
  const wpmPromedioFinal = usarAudioParaWpm
    ? (validado.audioAnalisis?.wpmUtil ?? null)
    : (validado.wpmPromedio ?? null);
  const fuenteWpm = usarAudioParaWpm ? 'audio' : 'pagina';
  const metadataPrev = parseSessionMetadata(sesion.metadata);
  const lecturaCompletadaEn = metadataPrev.lecturaCompletadaEn ?? new Date().toISOString();

  // 4. Calcular ajuste de dificultad
  const tiempoEsperadoMs =
    (metadataPrev.tiempoEsperadoMs as number | undefined) ??
    getNivelConfig((metadataPrev.nivelTexto as number | undefined) ?? 2)
      .tiempoEsperadoMs;

  let ajuste: {
    sessionScore: number;
    direccion: 'subir' | 'mantener' | 'bajar';
    nivelAnterior: number;
    nivelNuevo: number;
    razon: string;
  };
  try {
    ajuste = await calcularAjusteDificultad({
      studentId: validado.studentId,
      sessionId: validado.sessionId,
      comprensionScore,
      tiempoLecturaMs: validado.tiempoLecturaMs,
      tiempoEsperadoMs,
      wpmPromedio: wpmPromedioFinal ?? undefined,
    });
  } catch (ajusteError) {
    // En D1 local puede fallar por soporte parcial de transacciones.
    // Fallback no bloqueante: mantener nivel y usar comprension como score de sesion.
    console.error('[AjusteDificultad] Fallback por error:', ajusteError);
    const nivelMetadata = metadataPrev.nivelTexto;
    const nivelAnterior = Math.max(
      1.0,
      Math.min(4.8, typeof nivelMetadata === 'number' ? nivelMetadata : 1.0),
    );
    ajuste = {
      sessionScore: Math.round(comprensionScore * 100) / 100,
      direccion: 'mantener',
      nivelAnterior,
      nivelNuevo: nivelAnterior,
      razon: 'Ajuste de dificultad no disponible temporalmente; se mantiene nivel.',
    };
  }

  // 3+4 combined: single update writes all session fields and full metadata including sessionScore.
  await db
    .update(sessions)
    .set({
      completada: true,
      duracionSegundos,
      estrellasGanadas: estrellas,
      finalizadaEn: new Date(),
      wpmPromedio: wpmPromedioFinal,
      wpmPorPagina: validado.wpmPorPagina ?? null,
      totalPaginas: validado.totalPaginas ?? null,
      metadata: {
        ...metadataPrev,
        lecturaCompletada: true,
        lecturaCompletadaEn,
        comprensionScore,
        aciertos,
        totalPreguntas,
        tiempoLecturaMs: validado.tiempoLecturaMs,
        fuenteWpm,
        audioAnalisis: serializarAudioAnalisis(validado.audioAnalisis),
        sessionScore: ajuste.sessionScore,
      },
    })
    .where(eq(sessions.id, validado.sessionId));

  // 5. Calcular y guardar Elo
  let eloResult: { nuevoElo: EloRatings } | null = null;
  let eloPrevioGlobal: number | null = null;
  try {
    // Leer dificultad de las preguntas de la story
    const storyId = sesion.storyId;
    if (storyId) {
      const preguntasDB = await db.query.storyQuestions.findMany({
        where: eq(storyQuestions.storyId, storyId),
      });
      const preguntaMap = new Map(preguntasDB.map((p) => [p.id, p]));

      // Leer Elo actual del estudiante
      const estudianteElo = await db.query.students.findFirst({
        where: eq(students.id, validado.studentId),
        columns: {
          eloGlobal: true,
          eloLiteral: true,
          eloInferencia: true,
          eloVocabulario: true,
          eloResumen: true,
          eloRd: true,
        },
      });

      if (estudianteElo) {
        eloPrevioGlobal = estudianteElo.eloGlobal;
        const eloRaw: EloRatings = {
          global: estudianteElo.eloGlobal,
          literal: estudianteElo.eloLiteral,
          inferencia: estudianteElo.eloInferencia,
          vocabulario: estudianteElo.eloVocabulario,
          resumen: estudianteElo.eloResumen,
          rd: estudianteElo.eloRd,
        };

        // Inflar RD si hubo inactividad (Glicko standard: uncertainty grows over time)
        const ultimaSesionPrevia = await db.query.sessions.findFirst({
          where: and(
            eq(sessions.studentId, validado.studentId),
            eq(sessions.completada, true),
          ),
          orderBy: [desc(sessions.finalizadaEn)],
          columns: { finalizadaEn: true },
        });
        const eloActual = inflarRdPorInactividad(
          eloRaw,
          ultimaSesionPrevia?.finalizadaEn ?? null,
        );

        const nivelTexto = metadataPrev.nivelTexto ?? 2;

        // Construir respuestas para el motor Elo
        const respuestasElo: RespuestaElo[] = validado.respuestas.map((r) => {
          const preguntaDB = preguntaMap.get(r.preguntaId);
          return {
            tipo: r.tipo as TipoPregunta,
            correcta: r.correcta,
            dificultadPregunta: preguntaDB?.dificultad ?? 3,
          };
        });

        eloResult = procesarRespuestasElo(eloActual, respuestasElo, nivelTexto);

        // Actualizar Elo + RD en students
        await db
          .update(students)
          .set({
            eloGlobal: eloResult.nuevoElo.global,
            eloLiteral: eloResult.nuevoElo.literal,
            eloInferencia: eloResult.nuevoElo.inferencia,
            eloVocabulario: eloResult.nuevoElo.vocabulario,
            eloResumen: eloResult.nuevoElo.resumen,
            eloRd: eloResult.nuevoElo.rd,
          })
          .where(eq(students.id, validado.studentId));

        // Insertar snapshot con RD
        await db.insert(eloSnapshots).values({
          studentId: validado.studentId,
          sessionId: validado.sessionId,
          eloGlobal: eloResult.nuevoElo.global,
          eloLiteral: eloResult.nuevoElo.literal,
          eloInferencia: eloResult.nuevoElo.inferencia,
          eloVocabulario: eloResult.nuevoElo.vocabulario,
          eloResumen: eloResult.nuevoElo.resumen,
          rdGlobal: eloResult.nuevoElo.rd,
          wpmPromedio: wpmPromedioFinal,
        });
      }
    }
  } catch (eloError) {
    // Elo es no-critico: si falla, la sesion sigue siendo valida
    console.error('[Elo] Error al calcular/guardar Elo:', eloError);
  }

  return {
    ok: true as const,
    resultado: {
      aciertos,
      totalPreguntas,
      comprensionScore: Math.round(comprensionScore * 100),
      estrellas,
      sessionScore: ajuste.sessionScore,
      direccion: ajuste.direccion,
      nivelAnterior: ajuste.nivelAnterior,
      nivelNuevo: ajuste.nivelNuevo,
      razon: ajuste.razon,
      eloGlobal: eloResult?.nuevoElo.global ?? null,
      eloPrevio: eloPrevioGlobal,
    },
  };
}
