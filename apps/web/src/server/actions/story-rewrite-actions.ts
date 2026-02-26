'use server';

/**
 * Server Action for rewriting stories in-session.
 * Maintains characters and plot, adjusts lexical complexity and length.
 * Sprint 4.
 */
import { getDb } from '@/server/db';
import {
  generatedStories,
  storyQuestions,
  sessions,
  manualAdjustments,
  eq,
  and,
} from '@zetaread/db';
import { reescribirHistoriaSchema } from '../validation';
import { getStudentContext } from '../student-context';
import { rewriteStory } from '@/lib/ai/story-generator';
import { hasLLMKey } from '@/lib/ai/openai';
import {
  getNivelConfig,
  calcularNivelReescritura,
} from '@/lib/ai/prompts';
import { TOPICS_SEED } from '@/lib/data/skills';
import { mapPreguntaToDTO } from '@/lib/questions/mapper';
import { mergeSessionMetadata } from '@/lib/types/session-metadata';

/**
 * Reescribe una historia en caliente durante la sesion de lectura.
 * Mantiene personajes y trama, ajusta complejidad lexica y longitud.
 */
export async function reescribirHistoria(datos: {
  sessionId: string;
  studentId: string;
  storyId: string;
  direccion: 'mas_facil' | 'mas_desafiante';
  tiempoLecturaAntesDePulsar: number;
}) {
  const db = await getDb();
  const validado = reescribirHistoriaSchema.parse(datos);
  const { edadAnos } = await getStudentContext(validado.studentId);

  // 1. Verificar API key
  if (!(await hasLLMKey())) {
    return {
      ok: false as const,
      error: 'API key de LLM no configurada.',
      code: 'NO_API_KEY' as const,
    };
  }

  // 2. Obtener historia original
  const historiaOriginal = await db.query.generatedStories.findFirst({
    where: eq(generatedStories.id, validado.storyId),
  });

  if (!historiaOriginal) {
    return {
      ok: false as const,
      error: 'Historia no encontrada',
      code: 'GENERATION_FAILED' as const,
    };
  }

  // 3. Verificar que no se haya hecho ya un ajuste manual en esta sesion
  const ajustePrevio = await db.query.manualAdjustments.findFirst({
    where: and(
      eq(manualAdjustments.sessionId, validado.sessionId),
      eq(manualAdjustments.studentId, validado.studentId),
    ),
  });

  if (ajustePrevio) {
    return {
      ok: false as const,
      error: 'Ya se realizo un ajuste en esta sesion',
      code: 'GENERATION_FAILED' as const,
    };
  }

  // 4. Calcular niveles
  const nivelActual = historiaOriginal.nivel;
  const nivelNuevo = calcularNivelReescritura(nivelActual, validado.direccion);

  const topic = TOPICS_SEED.find((t) => t.slug === historiaOriginal.topicSlug);

  // 5. Reescribir via LLM
  const result = await rewriteStory({
    historiaOriginal: historiaOriginal.contenido,
    tituloOriginal: historiaOriginal.titulo,
    nivelActual,
    direccion: validado.direccion,
    edadAnos,
    topicNombre: topic?.nombre ?? historiaOriginal.topicSlug,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error, code: result.code };
  }

  const { story } = result;

  // 6. Guardar historia reescrita en DB (no reutilizable: es un ajuste manual)
  const [storyRow] = await db
    .insert(generatedStories)
    .values({
      studentId: validado.studentId,
      topicSlug: historiaOriginal.topicSlug,
      titulo: story.titulo,
      contenido: story.contenido,
      nivel: nivelNuevo,
      metadata: {
        ...story.metadata,
        llmUsage: story.llmUsage,
      },
      modeloGeneracion: story.modelo,
      promptVersion: 'v1-rewrite',
      aprobadaQA: story.aprobadaQA,
      motivoRechazo: story.motivoRechazo ?? null,
      reutilizable: false,
    })
    .returning();

  // 7. Guardar preguntas nuevas
  const preguntasInsert = story.preguntas.map((p, idx) => ({
    storyId: storyRow.id,
    tipo: p.tipo,
    pregunta: p.pregunta,
    opciones: p.opciones,
    respuestaCorrecta: p.respuestaCorrecta,
    explicacion: p.explicacion,
    dificultad: p.dificultadPregunta,
    orden: idx,
  }));

  const preguntasRows = await db.insert(storyQuestions).values(preguntasInsert).returning();

  // 8. Registrar ajuste manual en DB
  await db.insert(manualAdjustments).values({
    studentId: validado.studentId,
    sessionId: validado.sessionId,
    storyId: validado.storyId,
    tipo: validado.direccion,
    nivelAntes: nivelActual,
    nivelDespues: nivelNuevo,
    tiempoLecturaAntesDePulsar: validado.tiempoLecturaAntesDePulsar,
    rewrittenStoryId: storyRow.id,
  });

  // 9. Actualizar sesion con la nueva historia
  const sesion = await db.query.sessions.findFirst({
    where: eq(sessions.id, validado.sessionId),
  });

  const nivelConfig = getNivelConfig(nivelNuevo);
  await db
    .update(sessions)
    .set({
      storyId: storyRow.id,
      metadata: mergeSessionMetadata(sesion?.metadata, {
        nivelTexto: nivelNuevo,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
        ajusteManual: validado.direccion,
        storyIdOriginal: validado.storyId,
        llmStoryModel: story.modelo,
        llmStoryUsage: story.llmUsage,
      }),
    })
    .where(eq(sessions.id, validado.sessionId));

  return {
    ok: true as const,
    storyId: storyRow.id,
    historia: {
      titulo: story.titulo,
      contenido: story.contenido,
      nivel: nivelNuevo,
      topicSlug: historiaOriginal.topicSlug,
      topicEmoji: topic?.emoji ?? '📖',
      topicNombre: topic?.nombre ?? historiaOriginal.topicSlug,
      tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
    },
    preguntas: preguntasRows.map(mapPreguntaToDTO),
  };
}
