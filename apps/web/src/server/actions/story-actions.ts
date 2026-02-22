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
  skillProgress,
  students,
  eloSnapshots,
  manualAdjustments,
} from '@omegaread/db';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
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
  getModoFromCategoria,
  inferirEstrategiaPedagogica,
  type PromptInput,
  type TechTreeContext,
} from '@/lib/ai/prompts';
import {
  TOPICS_SEED,
  CATEGORIAS,
  getSkillBySlug,
  getSkillsDeDominio,
  getSkillsPorEdad,
  DOMINIOS,
  type SkillDef,
} from '@/lib/data/skills';
import { calcularEdad } from '@/lib/utils/fecha';
import { calcularAjusteDificultad } from './reading-actions';
import { actualizarProgresoInmediato } from './session-actions';
import { procesarRespuestasElo, type EloRatings, type RespuestaElo } from '@/lib/elo';
import type { TipoPregunta } from '@/lib/types/reading';

const MAX_HISTORIAS_DIA = 20;
const UMBRAL_SKILL_DOMINADA = 0.85;
const INTENTOS_MIN_REFORZAR = 3;

type SkillProgressRow = Awaited<ReturnType<typeof db.query.skillProgress.findMany>>[number];

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

function normalizarSkillSlug(skillId: string): string | null {
  return skillId.startsWith('topic-') ? skillId.slice('topic-'.length) : null;
}

function crearMapaProgresoSkill(rows: SkillProgressRow[]): Map<string, SkillProgressRow> {
  const map = new Map<string, SkillProgressRow>();
  for (const row of rows) {
    const slug = normalizarSkillSlug(row.skillId);
    if (!slug) continue;
    map.set(slug, row);
  }
  return map;
}

function skillDominada(slug: string, map: Map<string, SkillProgressRow>): boolean {
  const row = map.get(slug);
  if (!row) return false;
  return row.dominada || row.nivelMastery >= UMBRAL_SKILL_DOMINADA;
}

function skillDesbloqueada(skill: SkillDef, map: Map<string, SkillProgressRow>): boolean {
  if (skill.prerequisitos.length === 0) return true;
  return skill.prerequisitos.every(req => skillDominada(req, map));
}

function ordenarSkillsPorRuta(a: SkillDef, b: SkillDef): number {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel;
  return a.orden - b.orden;
}

function elegirSiguienteSkillTechTree(params: {
  edadAnos: number;
  intereses: string[];
  progresoMap: Map<string, SkillProgressRow>;
}): SkillDef | undefined {
  const { edadAnos, intereses, progresoMap } = params;
  const skillsEdad = getSkillsPorEdad(edadAnos).sort(ordenarSkillsPorRuta);

  const poolIntereses = skillsEdad.filter(s => intereses.includes(s.dominio));
  const pools = poolIntereses.length > 0 ? [poolIntereses, skillsEdad] : [skillsEdad];

  for (const pool of pools) {
    const desbloqueadasPendientes = pool
      .filter(skill => skillDesbloqueada(skill, progresoMap))
      .filter(skill => !skillDominada(skill.slug, progresoMap))
      .sort(ordenarSkillsPorRuta);

    if (desbloqueadasPendientes.length > 0) {
      return desbloqueadasPendientes[0];
    }
  }

  return skillsEdad[0];
}

function construirObjetivoSesion(skill: SkillDef, row: SkillProgressRow | undefined): string {
  if (!row || row.totalIntentos === 0) {
    return `Introducir el concepto de "${skill.nombre}" con un caso divertido y facil de recordar.`;
  }

  if (row.dominada || row.nivelMastery >= UMBRAL_SKILL_DOMINADA) {
    return `Consolidar "${skill.nombre}" con una aplicacion nueva para reforzar transferencia de aprendizaje.`;
  }

  if (row.totalIntentos >= INTENTOS_MIN_REFORZAR && row.nivelMastery < 0.6) {
    return `Reforzar bases de "${skill.nombre}" con ejemplos muy concretos y lenguaje sencillo.`;
  }

  return `Avanzar en "${skill.nombre}" aumentando un poco la dificultad sin perder claridad.`;
}

function construirContextoTechTree(params: {
  skill: SkillDef;
  progresoMap: Map<string, SkillProgressRow>;
  edadAnos: number;
  nivel: number;
}): TechTreeContext {
  const { skill, progresoMap, edadAnos, nivel } = params;
  const skillsDominio = getSkillsDeDominio(skill.dominio).sort(ordenarSkillsPorRuta);

  const prerequisitosDominados = skill.prerequisitos
    .filter(req => skillDominada(req, progresoMap))
    .map(req => getSkillBySlug(req)?.nombre ?? req);

  const prerequisitosPendientes = skill.prerequisitos
    .filter(req => !skillDominada(req, progresoMap))
    .map(req => getSkillBySlug(req)?.nombre ?? req);

  const skillsDominadasRelacionadas = skillsDominio
    .filter(s => s.slug !== skill.slug && skillDominada(s.slug, progresoMap))
    .slice(0, 3)
    .map(s => s.nombre);

  const skillsEnProgresoRelacionadas = skillsDominio
    .filter(s => s.slug !== skill.slug)
    .filter(s => {
      const row = progresoMap.get(s.slug);
      return !!row && row.totalIntentos > 0 && !skillDominada(s.slug, progresoMap) && row.nivelMastery >= 0.6;
    })
    .slice(0, 3)
    .map(s => s.nombre);

  const skillsAReforzarRelacionadas = skillsDominio
    .filter(s => s.slug !== skill.slug)
    .filter(s => {
      const row = progresoMap.get(s.slug);
      return !!row && row.totalIntentos >= INTENTOS_MIN_REFORZAR && row.nivelMastery < 0.6;
    })
    .slice(0, 3)
    .map(s => s.nombre);

  const siguienteSkillSugerida = skillsDominio
    .filter(s => s.slug !== skill.slug)
    .filter(s => skillDesbloqueada(s, progresoMap))
    .filter(s => !skillDominada(s.slug, progresoMap))
    .sort(ordenarSkillsPorRuta)[0]?.nombre;

  const rowActual = progresoMap.get(skill.slug);

  return {
    skillSlug: skill.slug,
    skillNombre: skill.nombre,
    skillNivel: skill.nivel,
    objetivoSesion: construirObjetivoSesion(skill, rowActual),
    estrategia: inferirEstrategiaPedagogica(edadAnos, nivel),
    prerequisitosDominados,
    prerequisitosPendientes,
    skillsDominadasRelacionadas,
    skillsEnProgresoRelacionadas,
    skillsAReforzarRelacionadas,
    siguienteSkillSugerida,
  };
}

/**
 * Genera una historia personalizada con preguntas de comprension.
 * Crea la sesion de lectura y devuelve todo lo necesario para el UI.
 */
export async function generarHistoria(datos: {
  studentId: string;
  topicSlug?: string;
  forceRegenerate?: boolean;
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
  const progresoSkillsTopic = await db.query.skillProgress.findMany({
    where: and(
      eq(skillProgress.studentId, validado.studentId),
      eq(skillProgress.categoria, 'topic'),
    ),
  });
  const progresoMap = crearMapaProgresoSkill(progresoSkillsTopic);

  let topicSlug = validado.topicSlug;
  if (!topicSlug) {
    // Elegir siguiente nodo del tech tree segun desbloqueo y progreso.
    const skillSiguiente = elegirSiguienteSkillTechTree({
      edadAnos,
      intereses,
      progresoMap,
    });
    if (skillSiguiente) {
      topicSlug = skillSiguiente.slug;
    }
  }

  if (!topicSlug) {
    // Fallback: topic apropiado para edad si no se pudo resolver por skill.
    const topicsPorEdad = TOPICS_SEED.filter(
      t => edadAnos >= t.edadMinima && edadAnos <= t.edadMaxima,
    );
    topicSlug = topicsPorEdad[Math.floor(Math.random() * topicsPorEdad.length)]?.slug ?? 'como-funciona-corazon';
  }

  const topic = TOPICS_SEED.find(t => t.slug === topicSlug);
  if (!topic) {
    return { ok: false as const, error: 'Topic no encontrado', code: 'GENERATION_FAILED' as const };
  }

  // 3b. Buscar historia cacheada (misma combinacion student+topic+nivel)
  if (!validado.forceRegenerate) {
    const cached = await db.query.generatedStories.findFirst({
      where: and(
        eq(generatedStories.studentId, validado.studentId),
        eq(generatedStories.topicSlug, topicSlug),
        eq(generatedStories.nivel, nivel),
        eq(generatedStories.reutilizable, true),
        eq(generatedStories.aprobadaQA, true),
      ),
      orderBy: [desc(generatedStories.creadoEn)],
      with: { questions: true },
    });

    if (cached && cached.questions.length > 0) {
      // Crear sesion con la historia cacheada
      const nivelConfig = getNivelConfig(nivel);
      const [sesion] = await db
        .insert(sessions)
        .values({
          studentId: validado.studentId,
          tipoActividad: 'lectura',
          modulo: 'lectura-adaptativa',
          completada: false,
          estrellasGanadas: 0,
          storyId: cached.id,
          metadata: {
            textoId: cached.id,
            nivelTexto: nivel,
            topicSlug,
            skillSlug: getSkillBySlug(topicSlug)?.slug ?? topicSlug,
            tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
            fromCache: true,
          },
        })
        .returning();

      return {
        ok: true as const,
        sessionId: sesion.id,
        storyId: cached.id,
        fromCache: true,
        historia: {
          titulo: cached.titulo,
          contenido: cached.contenido,
          nivel,
          topicSlug,
          topicEmoji: topic.emoji,
          topicNombre: topic.nombre,
          tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
        },
        preguntas: cached.questions
          .sort((a, b) => a.orden - b.orden)
          .map(p => ({
            id: p.id,
            tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
            pregunta: p.pregunta,
            opciones: p.opciones,
            respuestaCorrecta: p.respuestaCorrecta,
            explicacion: p.explicacion,
          })),
      };
    }
  }

  // 4. Consultar historial de historias previas para evitar repeticion
  const historiasPrevias = await db.query.generatedStories.findMany({
    where: and(
      eq(generatedStories.studentId, validado.studentId),
      eq(generatedStories.topicSlug, topicSlug),
    ),
    orderBy: [desc(generatedStories.creadoEn)],
    limit: 5,
    columns: { titulo: true },
  });
  const titulosPrevios = historiasPrevias.map(h => h.titulo);

  // 5. Generar historia
  const skill = getSkillBySlug(topicSlug);
  const dominio = skill ? DOMINIOS.find(d => d.slug === skill.dominio) : undefined;
  const techTreeContext = skill
    ? construirContextoTechTree({
      skill,
      progresoMap,
      edadAnos,
      nivel,
    })
    : undefined;

  const promptInput: PromptInput = {
    edadAnos,
    nivel,
    topicNombre: topic.nombre,
    topicDescripcion: topic.descripcion,
    conceptoNucleo: skill?.conceptoNucleo,
    dominio: dominio?.nombre,
    modo: getModoFromCategoria(topic.categoria),
    intereses: intereses
      .map(slug => CATEGORIAS.find(c => c.slug === slug)?.nombre)
      .filter((n): n is string => !!n)
      .slice(0, 3),
    personajesFavoritos: estudiante.personajesFavoritos ?? undefined,
    contextoPersonal: estudiante.contextoPersonal || undefined,
    historiasAnteriores: titulosPrevios.length > 0 ? titulosPrevios : undefined,
    techTreeContext,
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
      promptVersion: 'v2-tree',
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
    dificultad: p.dificultadPregunta,
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
        skillSlug: skill?.slug ?? topicSlug,
        objetivoSesion: techTreeContext?.objetivoSesion,
        estrategiaPedagogica: techTreeContext?.estrategia,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
      },
    })
    .returning();

  return {
    ok: true as const,
    sessionId: sesion.id,
    storyId: storyRow.id,
    fromCache: false,
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
  wpmPromedio?: number | null;
  wpmPorPagina?: Array<{ pagina: number; wpm: number }> | null;
  totalPaginas?: number | null;
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

  // 1. Guardar respuestas individuales (batch insert)
  await db.insert(responses).values(
    validado.respuestas.map(resp => ({
      sessionId: validado.sessionId,
      ejercicioId: resp.preguntaId,
      tipoEjercicio: resp.tipo,
      pregunta: resp.preguntaId,
      respuesta: String(resp.respuestaSeleccionada),
      respuestaCorrecta: String(resp.correcta ? resp.respuestaSeleccionada : 'incorrecto'),
      correcta: resp.correcta,
      tiempoRespuestaMs: resp.tiempoMs,
    }))
  );

  // 1b. Actualizar skill progress por tipo de pregunta
  const topicSlug = (sesion.metadata as Record<string, unknown>)?.topicSlug as string | undefined;
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
    const aciertosTotal = validado.respuestas.filter(r => r.correcta).length;
    await actualizarProgresoInmediato({
      studentId: validado.studentId,
      skillId: `topic-${topicSlug}`,
      categoria: 'topic',
      correcto: aciertosTotal >= Math.ceil(validado.respuestas.length * 0.75),
    });
  }

  // 2. Calcular comprension
  const totalPreguntas = validado.respuestas.length;
  const aciertos = validado.respuestas.filter(r => r.correcta).length;
  const comprensionScore = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;

  // 3. Marcar sesion como completada
  const duracionSegundos = Math.round(validado.tiempoLecturaMs / 1000);
  const ratioAciertos = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;
  const estrellas = ratioAciertos >= 1 ? 3 : ratioAciertos >= 0.75 ? 2 : ratioAciertos > 0 ? 1 : 0;

  await db
    .update(sessions)
    .set({
      completada: true,
      duracionSegundos,
      estrellasGanadas: estrellas,
      finalizadaEn: new Date(),
      wpmPromedio: validado.wpmPromedio ?? null,
      wpmPorPagina: validado.wpmPorPagina ?? null,
      totalPaginas: validado.totalPaginas ?? null,
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
    wpmPromedio: validado.wpmPromedio ?? undefined,
  });

  // Guardar sessionScore compuesto en metadata para que futuras sesiones lo usen
  // en la logica de sesiones consecutivas (en vez de usar comprensionScore como proxy)
  const metadataActual = (await db.query.sessions.findFirst({
    where: eq(sessions.id, validado.sessionId),
    columns: { metadata: true },
  }))?.metadata as Record<string, unknown> | null;

  await db
    .update(sessions)
    .set({
      metadata: { ...metadataActual, sessionScore: ajuste.sessionScore },
    })
    .where(eq(sessions.id, validado.sessionId));

  // 5. Calcular y guardar Elo
  let eloResult: { nuevoElo: EloRatings } | null = null;
  try {
    // Leer dificultad de las preguntas de la story
    const storyId = sesion.storyId;
    if (storyId) {
      const preguntasDB = await db.query.storyQuestions.findMany({
        where: eq(storyQuestions.storyId, storyId),
      });
      const preguntaMap = new Map(preguntasDB.map(p => [p.id, p]));

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
        const eloActual: EloRatings = {
          global: estudianteElo.eloGlobal,
          literal: estudianteElo.eloLiteral,
          inferencia: estudianteElo.eloInferencia,
          vocabulario: estudianteElo.eloVocabulario,
          resumen: estudianteElo.eloResumen,
          rd: estudianteElo.eloRd,
        };

        const nivelTexto = (sesion.metadata as Record<string, unknown>)?.nivelTexto as number ?? 2;

        // Construir respuestas para el motor Elo
        const respuestasElo: RespuestaElo[] = validado.respuestas.map(r => {
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
          wpmPromedio: validado.wpmPromedio ?? null,
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

  // 6. Guardar historia reescrita en DB (no reutilizable: es un ajuste manual)
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
