'use server';

/**
 * Server Actions para generacion de historias y finalizacion de sesiones.
 * Sprint 2: pipeline LLM + QA + adaptacion de dificultad.
 */
import {
  db,
  generatedStories,
  storyQuestions,
  sessions,
  responses,
  manualAdjustments,
} from '@omegaread/db';
import { eq, and, gte, sql } from 'drizzle-orm';
import { requireStudentOwnership } from '../auth';
import {
  generarHistoriaSchema,
  finalizarSesionLecturaSchema,
  reescribirHistoriaSchema,
} from '../validation';
import { generateStory, rewriteStory } from '@/lib/ai/story-generator';
import { hasOpenAIKey } from '@/lib/ai/openai';
import {
  getNivelConfig,
  calcularNivelReescritura,
  type PromptInput,
} from '@/lib/ai/prompts';
import { TOPICS_SEED } from '@/lib/data/topics';
import { calcularEdad } from '@/lib/utils/fecha';
import { calcularAjusteDificultad } from './reading-actions';

const MAX_HISTORIAS_DIA = 20;

/**
 * Verifica cuantas historias ha generado un estudiante hoy.
 */
async function contarHistoriasHoy(studentId: string): Promise<number> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generatedStories)
    .where(
      and(
        eq(generatedStories.studentId, studentId),
        gte(generatedStories.creadoEn, hoy),
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Genera una historia personalizada con preguntas de comprension.
 * Crea la sesion de lectura y devuelve todo lo necesario para el UI.
 */
export async function generarHistoria(datos: {
  studentId: string;
  topicSlug?: string;
}) {
  const validado = generarHistoriaSchema.parse(datos);
  const { estudiante } = await requireStudentOwnership(validado.studentId);

  // 1. Verificar API key
  if (!hasOpenAIKey()) {
    return {
      ok: false as const,
      error: 'Para generar historias personalizadas necesitas configurar una API key de OpenAI. Anade OPENAI_API_KEY en el archivo .env.local y reinicia la app.',
      code: 'NO_API_KEY' as const,
    };
  }

  // 2. Rate limiting
  const historiasHoy = await contarHistoriasHoy(validado.studentId);
  if (historiasHoy >= MAX_HISTORIAS_DIA) {
    return {
      ok: false as const,
      error: `Has alcanzado el limite de ${MAX_HISTORIAS_DIA} historias por dia. Vuelve manana para seguir leyendo.`,
      code: 'RATE_LIMIT' as const,
    };
  }

  // 3. Determinar topic
  const edadAnos = calcularEdad(estudiante.fechaNacimiento);
  const nivel = estudiante.nivelLectura ?? 1;
  const intereses = estudiante.intereses ?? [];

  let topicSlug = validado.topicSlug;
  if (!topicSlug && intereses.length > 0) {
    // Elegir aleatoriamente de los intereses del nino
    topicSlug = intereses[Math.floor(Math.random() * intereses.length)];
  }
  if (!topicSlug) {
    topicSlug = 'aventura'; // Fallback
  }

  const topic = TOPICS_SEED.find(t => t.slug === topicSlug);
  if (!topic) {
    return { ok: false as const, error: 'Topic no encontrado', code: 'GENERATION_FAILED' as const };
  }

  // 4. Generar historia
  const promptInput: PromptInput = {
    edadAnos,
    nivel,
    topicNombre: topic.nombre,
    topicDescripcion: topic.descripcion,
    intereses: intereses
      .map(slug => TOPICS_SEED.find(t => t.slug === slug)?.nombre)
      .filter((n): n is string => !!n),
    personajesFavoritos: estudiante.personajesFavoritos ?? undefined,
  };

  const result = await generateStory(promptInput);

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error,
      code: result.code,
    };
  }

  const { story } = result;

  // 5. Guardar historia en DB
  const [storyRow] = await db
    .insert(generatedStories)
    .values({
      studentId: validado.studentId,
      topicSlug,
      titulo: story.titulo,
      contenido: story.contenido,
      nivel,
      metadata: story.metadata,
      modeloGeneracion: story.modelo,
      promptVersion: 'v1',
      aprobadaQA: story.aprobadaQA,
      motivoRechazo: story.motivoRechazo ?? null,
    })
    .returning();

  // 6. Guardar preguntas
  const preguntasInsert = story.preguntas.map((p, idx) => ({
    storyId: storyRow.id,
    tipo: p.tipo,
    pregunta: p.pregunta,
    opciones: p.opciones,
    respuestaCorrecta: p.respuestaCorrecta,
    explicacion: p.explicacion,
    orden: idx,
  }));

  const preguntasRows = await db
    .insert(storyQuestions)
    .values(preguntasInsert)
    .returning();

  // 7. Crear sesion de lectura
  const nivelConfig = getNivelConfig(nivel);
  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: validado.studentId,
      tipoActividad: 'lectura',
      modulo: 'lectura-adaptativa',
      completada: false,
      estrellasGanadas: 0,
      storyId: storyRow.id,
      metadata: {
        textoId: storyRow.id,
        nivelTexto: nivel,
        topicSlug,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
      },
    })
    .returning();

  return {
    ok: true as const,
    sessionId: sesion.id,
    storyId: storyRow.id,
    historia: {
      titulo: story.titulo,
      contenido: story.contenido,
      nivel,
      topicSlug,
      topicEmoji: topic.emoji,
      topicNombre: topic.nombre,
      tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
    },
    preguntas: preguntasRows.map(p => ({
      id: p.id,
      tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
      pregunta: p.pregunta,
      opciones: p.opciones,
      respuestaCorrecta: p.respuestaCorrecta,
      explicacion: p.explicacion,
    })),
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
}) {
  const validado = finalizarSesionLecturaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  // Verificar sesion
  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });

  if (!sesion) {
    return { ok: false as const, error: 'Sesion no encontrada' };
  }

  if (sesion.completada) {
    return { ok: false as const, error: 'La sesion ya fue finalizada' };
  }

  // 1. Guardar respuestas individuales
  for (const resp of validado.respuestas) {
    await db.insert(responses).values({
      sessionId: validado.sessionId,
      ejercicioId: resp.preguntaId,
      tipoEjercicio: resp.tipo,
      pregunta: resp.preguntaId,
      respuesta: String(resp.respuestaSeleccionada),
      respuestaCorrecta: 'N/A',
      correcta: resp.correcta,
      tiempoRespuestaMs: resp.tiempoMs,
    });
  }

  // 2. Calcular comprension
  const totalPreguntas = validado.respuestas.length;
  const aciertos = validado.respuestas.filter(r => r.correcta).length;
  const comprensionScore = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;

  // 3. Marcar sesion como completada
  const duracionSegundos = Math.round(validado.tiempoLecturaMs / 1000);
  const estrellas = aciertos >= 4 ? 3 : aciertos >= 3 ? 2 : aciertos >= 1 ? 1 : 0;

  await db
    .update(sessions)
    .set({
      completada: true,
      duracionSegundos,
      estrellasGanadas: estrellas,
      finalizadaEn: new Date(),
      metadata: {
        ...(sesion.metadata as Record<string, unknown>),
        comprensionScore,
        aciertos,
        totalPreguntas,
        tiempoLecturaMs: validado.tiempoLecturaMs,
      },
    })
    .where(eq(sessions.id, validado.sessionId));

  // 4. Calcular ajuste de dificultad
  const tiempoEsperadoMs =
    (sesion.metadata as Record<string, unknown>)?.tiempoEsperadoMs as number
    ?? getNivelConfig((sesion.metadata as Record<string, unknown>)?.nivelTexto as number ?? 2).tiempoEsperadoMs;

  const ajuste = await calcularAjusteDificultad({
    studentId: validado.studentId,
    sessionId: validado.sessionId,
    comprensionScore,
    tiempoLecturaMs: validado.tiempoLecturaMs,
    tiempoEsperadoMs,
  });

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
    },
  };
}

/**
 * Reescribe una historia en caliente durante la sesion de lectura.
 * Mantiene personajes y trama, ajusta complejidad lexica y longitud.
 * Sprint 4.
 */
export async function reescribirHistoria(datos: {
  sessionId: string;
  studentId: string;
  storyId: string;
  direccion: 'mas_facil' | 'mas_desafiante';
  tiempoLecturaAntesDePulsar: number;
}) {
  const validado = reescribirHistoriaSchema.parse(datos);
  const { estudiante } = await requireStudentOwnership(validado.studentId);

  // 1. Verificar API key
  if (!hasOpenAIKey()) {
    return {
      ok: false as const,
      error: 'API key de OpenAI no configurada.',
      code: 'NO_API_KEY' as const,
    };
  }

  // 2. Obtener historia original
  const historiaOriginal = await db.query.generatedStories.findFirst({
    where: eq(generatedStories.id, validado.storyId),
  });

  if (!historiaOriginal) {
    return { ok: false as const, error: 'Historia no encontrada', code: 'GENERATION_FAILED' as const };
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
  const edadAnos = calcularEdad(estudiante.fechaNacimiento);

  const topic = TOPICS_SEED.find(t => t.slug === historiaOriginal.topicSlug);

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

  // 6. Guardar historia reescrita en DB
  const [storyRow] = await db
    .insert(generatedStories)
    .values({
      studentId: validado.studentId,
      topicSlug: historiaOriginal.topicSlug,
      titulo: story.titulo,
      contenido: story.contenido,
      nivel: nivelNuevo,
      metadata: story.metadata,
      modeloGeneracion: story.modelo,
      promptVersion: 'v1-rewrite',
      aprobadaQA: story.aprobadaQA,
      motivoRechazo: story.motivoRechazo ?? null,
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
    orden: idx,
  }));

  const preguntasRows = await db
    .insert(storyQuestions)
    .values(preguntasInsert)
    .returning();

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
      metadata: {
        ...(sesion?.metadata as Record<string, unknown>),
        nivelTexto: nivelNuevo,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
        ajusteManual: validado.direccion,
        storyIdOriginal: validado.storyId,
      },
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
    preguntas: preguntasRows.map(p => ({
      id: p.id,
      tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
      pregunta: p.pregunta,
      opciones: p.opciones,
      respuestaCorrecta: p.respuestaCorrecta,
      explicacion: p.explicacion,
    })),
  };
}
