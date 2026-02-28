'use server';

/**
 * Server Actions for story generation, progress polling, and question generation.
 * Contains the main story generation pipeline and background question generation
 * for the split-flow architecture.
 *
 * Trace types and state machine: @/lib/story-generation/trace
 * Fun mode helpers: @/lib/story-generation/fun-mode
 * Question mapping: @/lib/questions/mapper
 */
import { getDb } from '@/server/db';
import {
  generatedStories,
  storyQuestions,
  sessions,
  skillProgress,
  eq,
  and,
  gte,
  lte,
  desc,
  sql,
  type AccesibilidadConfig,
} from '@zetaread/db';
import { requireStudentOwnership } from '../auth';
import { getStudentContext } from '../student-context';
import {
  generarHistoriaSchema,
  generarPreguntasSesionSchema,
  obtenerProgresoGeneracionHistoriaSchema,
  cargarHistoriaExistenteSchema,
} from '../validation';
import { generateStoryOnly, generateQuestions } from '@/lib/ai/story-generator';
import { hasLLMKey } from '@/lib/ai/openai';
import {
  getNivelConfig,
  normalizarSubnivel,
  type PromptInput,
  type TonoHistoria,
} from '@/lib/ai/prompts';
import {
  TOPICS_SEED,
  CATEGORIAS,
  getSkillBySlug,
  DOMINIOS,
} from '@/lib/data/skills';
import { normalizarTexto } from '@/lib/utils/text';
import { calcularEdad } from '@/lib/utils/fecha';
import {
  elegirSiguienteSkillTechTree,
  construirContextoTechTree,
} from '@/lib/learning/topic-selector';
import { crearMapaProgresoCompleto as crearMapaProgresoSkill } from '@/lib/skills/progress';
import { extraerHechosPerfilVivo } from '@/lib/profile/perfil-vivo';
import {
  crearStoryGenerationTrace,
  marcarStageRunning,
  marcarStageDone,
  marcarStageError,
  finalizarTraceOk,
  completarEtapasRestantesComoOmitidas,
  extraerTraceMetadata,
  extraerFunModeConfig,
  extraerTonoHistoria,
  derivarTonoEfectivo,
  type StoryGenerationTrace,
  type StoryGenerationStageId,
} from '@/lib/story-generation/trace';
import { mergeSessionMetadata } from '@/lib/types/session-metadata';
import { mapPreguntaToDTO } from '@/lib/questions/mapper';

// ─── Constants ───

const MAX_HISTORIAS_DIA = 20;

// Numero de dias hacia atras que se considera valida una historia cacheada.
const CACHE_TTL_DIAS = 7;
// Reutilizamos cache en una ventana de subnivel cercana para aumentar hit-rate.
const CACHE_LEVEL_WINDOW = 0.18;

/**
 * Compatibilidad con slugs legacy (pre-tech-tree) que aun pueden existir
 * en historiales viejos o enlaces guardados.
 */
const LEGACY_TOPIC_SLUG_MAP: Record<string, string> = {
  animales: 'animales-que-vuelan',
  dinosaurios: 'prehistoria-accesible',
  espacio: 'sistema-solar',
  ciencia: 'fuerzas-empujar-jalar',
  tecnologia: 'como-piensan-ordenadores',
  historia: 'lineas-del-tiempo',
  geografia: 'que-son-mapas',
  cultura: 'ninos-otros-paises',
  musica: 'sonido-vibra',
  cocina: 'nutricion-combustible',
  deportes: 'fuerzas-empujar-jalar',
  naturaleza: 'plantas-que-crecen',
  arte: 'como-se-transmiten-tradiciones',
};

// ─── Custom topic helpers ───

const CUSTOM_TOPIC_PREFIX = 'custom:';

function isCustomTopic(slug: string | undefined): slug is string {
  return !!slug && slug.startsWith(CUSTOM_TOPIC_PREFIX);
}

function parseCustomTopic(slug: string): string {
  return slug.slice(CUSTOM_TOPIC_PREFIX.length).trim();
}

// ─── Internal helpers ───

async function contarHistoriasHoy(
  db: Awaited<ReturnType<typeof getDb>>,
  studentId: string,
): Promise<number> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(generatedStories)
    .where(and(eq(generatedStories.studentId, studentId), gte(generatedStories.creadoEn, hoy)));

  return Number(result[0]?.count ?? 0);
}

function topicAplicaPorEdad(
  topic: (typeof TOPICS_SEED)[number],
  edadAnos: number,
): boolean {
  return edadAnos >= topic.edadMinima && edadAnos <= topic.edadMaxima;
}

function resolverTopicPorSlug(
  rawTopicSlug: string,
  edadAnos: number,
): { topicSlug: string; topic: (typeof TOPICS_SEED)[number]; remapped: boolean } | null {
  const normalizedSlug = rawTopicSlug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const direct = TOPICS_SEED.find((t) => t.slug === normalizedSlug);
  if (direct) {
    return {
      topicSlug: direct.slug,
      topic: direct,
      remapped: false,
    };
  }

  const mappedSlug = LEGACY_TOPIC_SLUG_MAP[normalizedSlug];
  if (mappedSlug) {
    const mappedTopic = TOPICS_SEED.find((t) => t.slug === mappedSlug);
    if (mappedTopic) {
      return {
        topicSlug: mappedTopic.slug,
        topic: mappedTopic,
        remapped: true,
      };
    }
  }

  const requested = normalizarTexto(normalizedSlug);
  const requestedTokens = requested.split(' ').filter((token) => token.length >= 3);
  if (requestedTokens.length === 0) return null;

  let best: { topic: (typeof TOPICS_SEED)[number]; score: number } | null = null;
  for (const topic of TOPICS_SEED) {
    const haystack = normalizarTexto(`${topic.slug} ${topic.nombre} ${topic.descripcion}`);
    let score = 0;

    if (haystack.includes(requested)) score += 5;
    for (const token of requestedTokens) {
      if (haystack.includes(token)) score += 1;
    }
    if (score === 0) continue;
    if (topicAplicaPorEdad(topic, edadAnos)) score += 2;

    if (!best || score > best.score) {
      best = { topic, score };
    }
  }

  if (!best) return null;
  return {
    topicSlug: best.topic.slug,
    topic: best.topic,
    remapped: true,
  };
}

// ─── Server Actions ───

/**
 * Persists the story generation trace to the sessions table.
 * Used as a polling target while generarHistoria runs client-side.
 */
export async function persistirStoryGenerationTrace(params: {
  db: Awaited<ReturnType<typeof getDb>>;
  traceId: string | undefined;
  studentId: string;
  trace: StoryGenerationTrace;
}) {
  const { db, traceId, studentId, trace } = params;
  if (!traceId) return;

  const terminal = trace.status === 'done' || trace.status === 'error';
  const startedAtDate = new Date(trace.startedAt);
  const finishedAtDate = trace.finishedAt ? new Date(trace.finishedAt) : null;
  const duracionSegundos =
    trace.totalMs !== undefined ? Math.max(0, Math.round(trace.totalMs / 1000)) : null;

  await db
    .insert(sessions)
    .values({
      id: traceId,
      studentId,
      tipoActividad: 'sistema',
      modulo: 'story-generation',
      completada: terminal,
      estrellasGanadas: 0,
      metadata: { generationTrace: trace },
      iniciadaEn: startedAtDate,
      finalizadaEn: finishedAtDate,
      duracionSegundos,
    })
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        metadata: { generationTrace: trace },
        completada: terminal,
        finalizadaEn: finishedAtDate,
        duracionSegundos,
      },
    });
}

/**
 * Genera una historia personalizada con preguntas de comprension.
 * Crea la sesion de lectura y devuelve todo lo necesario para el UI.
 */
export async function generarHistoria(datos: {
  studentId: string;
  topicSlug?: string;
  forceRegenerate?: boolean;
  progressTraceId?: string;
  nivelOverride?: number;
}) {
  const db = await getDb();
  const validado = generarHistoriaSchema.parse(datos);
  const { estudiante, padre, edadAnos, nivel: nivelElo } = await getStudentContext(validado.studentId);
  const nivel = normalizarSubnivel(validado.nivelOverride ?? nivelElo);
  const accesibilidad = (estudiante.accesibilidad ?? {}) as AccesibilidadConfig;
  const funModeActivo = extraerFunModeConfig(padre.config);
  const tono = derivarTonoEfectivo(accesibilidad.tonoHistoria, funModeActivo) as TonoHistoria;
  const traceId = validado.progressTraceId;
  const trace = crearStoryGenerationTrace();

  const persistirTrace = async () =>
    persistirStoryGenerationTrace({
      db,
      traceId,
      studentId: validado.studentId,
      trace,
    });

  const avanzarEtapa = async (
    stageId: StoryGenerationStageId,
    detail: string,
    persist = false,
  ) => {
    marcarStageRunning(trace, stageId, detail);
    if (persist) {
      await persistirTrace();
    }
  };

  const completarEtapa = async (stageId: StoryGenerationStageId, detail: string) => {
    marcarStageDone(trace, stageId, detail);
    await persistirTrace();
  };

  const finalizarConError = async (
    stageId: StoryGenerationStageId,
    error: string,
    code: 'NO_API_KEY' | 'RATE_LIMIT' | 'GENERATION_FAILED' | 'QA_REJECTED',
  ) => {
    marcarStageError(trace, stageId, error);
    await persistirTrace();
    return {
      ok: false as const,
      error,
      code,
      generationTrace: trace,
    };
  };

  try {
    console.info('[story-generation] inicio', {
      traceId: traceId ?? null,
      studentId: validado.studentId,
      topicSlug: validado.topicSlug ?? null,
      forceRegenerate: !!validado.forceRegenerate,
      tono,
    });

    await avanzarEtapa('validaciones', 'Comprobando API key y limites de uso', true);

    if (!(await hasLLMKey())) {
      return await finalizarConError(
        'validaciones',
        'Para generar historias personalizadas necesitas configurar una API key de LLM. Recomendado: ZAI_API_KEY (Code subscription). Reinicia la app tras actualizar .env.local.',
        'NO_API_KEY',
      );
    }

    const historiasHoy = await contarHistoriasHoy(db, validado.studentId);
    if (historiasHoy >= MAX_HISTORIAS_DIA) {
      return await finalizarConError(
        'validaciones',
        `Has alcanzado el limite de ${MAX_HISTORIAS_DIA} historias por dia. Vuelve manana para seguir leyendo.`,
        'RATE_LIMIT',
      );
    }
    await completarEtapa('validaciones', 'Validaciones completadas');

    await avanzarEtapa('ruta', 'Analizando nivel, historial e intereses');
    const intereses = estudiante.intereses ?? [];
    const progresoSkillsTopic = await db.query.skillProgress.findMany({
      where: and(
        eq(skillProgress.studentId, validado.studentId),
        eq(skillProgress.categoria, 'topic'),
      ),
    });
    const progresoMap = crearMapaProgresoSkill(progresoSkillsTopic);
    const historiasRecientesNodos = await db.query.generatedStories.findMany({
      where: eq(generatedStories.studentId, validado.studentId),
      orderBy: [desc(generatedStories.creadoEn)],
      limit: 8,
      columns: { topicSlug: true },
    });
    const historialReciente = historiasRecientesNodos.map((h) => h.topicSlug);
    const skillActualSlug = historialReciente[0];

    let topicSlug = validado.topicSlug;
    let topicNombre: string;
    let topicDescripcion: string;
    let topicEmoji: string;
    let skill: ReturnType<typeof getSkillBySlug>;
    let dominio: (typeof DOMINIOS)[number] | undefined;
    let techTreeContext: ReturnType<typeof construirContextoTechTree> | undefined;
    const customTopic = isCustomTopic(topicSlug);

    if (customTopic && topicSlug) {
      const textoLibre = parseCustomTopic(topicSlug);
      if (!textoLibre) {
        return await finalizarConError('ruta', 'El tema libre esta vacio', 'GENERATION_FAILED');
      }
      topicNombre = textoLibre;
      topicDescripcion = textoLibre;
      topicEmoji = '✏️';
      skill = undefined;
      dominio = undefined;
      techTreeContext = undefined;
      await completarEtapa('ruta', `Tema libre: ${textoLibre}`);
    } else {
      if (!topicSlug) {
        const skillSiguiente = elegirSiguienteSkillTechTree({
          edadAnos,
          intereses,
          progresoMap,
          skillActualSlug,
          historialReciente,
        });
        if (skillSiguiente) {
          topicSlug = skillSiguiente.slug;
        }
      }

      if (!topicSlug) {
        const topicsPorEdad = TOPICS_SEED.filter(
          (t) => edadAnos >= t.edadMinima && edadAnos <= t.edadMaxima,
        );
        topicSlug =
          topicsPorEdad[Math.floor(Math.random() * topicsPorEdad.length)]?.slug ??
          TOPICS_SEED[0]?.slug;
      }

      if (!topicSlug) {
        return await finalizarConError('ruta', 'No hay topics disponibles para esta edad', 'GENERATION_FAILED');
      }
      const topicResolved = resolverTopicPorSlug(topicSlug, edadAnos);
      if (!topicResolved) {
        return await finalizarConError('ruta', 'Topic no encontrado', 'GENERATION_FAILED');
      }
      topicSlug = topicResolved.topicSlug;
      const topic = topicResolved.topic;
      if (topicResolved.remapped && validado.topicSlug) {
        console.info('[story-generation] topic remapeado por compatibilidad', {
          from: validado.topicSlug,
          to: topicSlug,
        });
      }

      topicNombre = topic.nombre;
      topicDescripcion = topic.descripcion;
      topicEmoji = topic.emoji;
      skill = getSkillBySlug(topicSlug);
      dominio = skill ? DOMINIOS.find((d) => d.slug === skill!.dominio) : undefined;
      techTreeContext = skill
        ? construirContextoTechTree({
            skill,
            progresoMap,
            edadAnos,
            nivel,
          })
        : undefined;
      await completarEtapa('ruta', `Topic seleccionado: ${topicNombre}`);
    }

    const skipCache = validado.forceRegenerate || customTopic;
    await avanzarEtapa(
      'cache',
      skipCache
        ? (customTopic ? 'Tema libre, se omite cache' : 'Regeneracion forzada, se omite cache')
        : 'Buscando historia reutilizable',
    );
    if (!skipCache) {
      const ttlDate = new Date();
      ttlDate.setDate(ttlDate.getDate() - CACHE_TTL_DIAS);
      const nivelCacheMin = Math.max(1, nivel - CACHE_LEVEL_WINDOW);
      const nivelCacheMax = Math.min(4.8, nivel + CACHE_LEVEL_WINDOW);
      const cacheCandidates = await db.query.generatedStories.findMany({
        where: and(
          eq(generatedStories.studentId, validado.studentId),
          eq(generatedStories.topicSlug, topicSlug),
          gte(generatedStories.nivel, nivelCacheMin),
          lte(generatedStories.nivel, nivelCacheMax),
          eq(generatedStories.reutilizable, true),
          eq(generatedStories.aprobadaQA, true),
          gte(generatedStories.creadoEn, ttlDate),
        ),
        orderBy: [desc(generatedStories.creadoEn)],
        limit: 12,
        with: { questions: true },
      });
      const cacheCompatibles = cacheCandidates.filter(
        (story) => extraerTonoHistoria(story.metadata) === tono,
      );
      const cached = cacheCompatibles.sort((a, b) => {
        const scoreA = Math.abs(a.nivel - nivel) + (a.questions.length > 0 ? 0 : 0.15);
        const scoreB = Math.abs(b.nivel - nivel) + (b.questions.length > 0 ? 0 : 0.15);
        return scoreA - scoreB;
      })[0];

      if (cached) {
        await completarEtapa('cache', 'Cache hit, se reutiliza historia');
        completarEtapasRestantesComoOmitidas(
          trace,
          ['prompt', 'llm', 'persistencia'],
          'Omitida por reutilizacion de cache',
        );
        await persistirTrace();

        await avanzarEtapa('sesion', 'Creando sesion de lectura', true);
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
              skillSlug: customTopic ? 'custom-topic' : (getSkillBySlug(topicSlug)?.slug ?? topicSlug),
              tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
              fromCache: true,
              tonoHistoria: tono,
              funMode: tono >= 4,
            },
          })
          .returning();
        await completarEtapa('sesion', 'Sesion creada');
        finalizarTraceOk(trace, 'Historia lista desde cache');
        await persistirTrace();

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
            topicEmoji: topicEmoji,
            topicNombre: topicNombre,
            tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
          },
          preguntas: cached.questions.length > 0
            ? cached.questions.sort((a, b) => a.orden - b.orden).map(mapPreguntaToDTO)
            : [],
          generationTrace: trace,
        };
      }
    }
    await completarEtapa('cache', 'Sin cache valida, se genera historia nueva');

    await avanzarEtapa('prompt', 'Preparando contexto pedagogico y personalizacion');
    const historiasPrevias = await db.query.generatedStories.findMany({
      where: and(
        eq(generatedStories.studentId, validado.studentId),
        eq(generatedStories.topicSlug, topicSlug),
      ),
      orderBy: [desc(generatedStories.creadoEn)],
      limit: 5,
      columns: { titulo: true },
    });
    const titulosPrevios = historiasPrevias.map((h) => h.titulo);

    const promptInput: PromptInput = {
      edadAnos,
      nivel,
      topicNombre,
      topicDescripcion,
      lecturaSinTildes: accesibilidad.lecturaSinTildes === true,
      conceptoNucleo: skill?.conceptoNucleo,
      dominio: dominio?.nombre,
      tono,
      intereses: intereses
        .map((slug) => CATEGORIAS.find((c) => c.slug === slug)?.nombre)
        .filter((n): n is string => !!n)
        .slice(0, 3),
      personajesFavoritos: estudiante.personajesFavoritos ?? undefined,
      contextoPersonal: (() => {
        const base = (estudiante.contextoPersonal ?? '').trim().slice(0, 320);
        const hechos = extraerHechosPerfilVivo(estudiante.senalesDificultad);
        if (hechos.length === 0) return base || undefined;
        const memoria = `Hechos recientes del nino: ${hechos.join(' | ')}`;
        return [base, memoria].filter(Boolean).join('\n').slice(0, 420);
      })(),
      historiasAnteriores: titulosPrevios.length > 0 ? titulosPrevios : undefined,
      techTreeContext: techTreeContext
        ? {
            skillSlug: techTreeContext.skillSlug,
            skillNombre: techTreeContext.skillNombre,
            skillNivel: techTreeContext.skillNivel,
            objetivoSesion: techTreeContext.objetivoSesion,
            estrategia: techTreeContext.estrategia,
          }
        : undefined,
    };
    console.info('[story-generation] prompt profile', {
      traceId: traceId ?? null,
      topicSlug,
      nivel,
      tono,
      skillSlug: promptInput.techTreeContext?.skillSlug ?? null,
      estrategia: promptInput.techTreeContext?.estrategia ?? null,
    });
    await completarEtapa('prompt', 'Prompt listo');

    await avanzarEtapa('llm', 'Llamando al modelo para generar la narrativa', true);
    const result = await generateStoryOnly(promptInput);
    if (!result.ok) {
      console.warn('[story-generation] fallo en LLM', {
        traceId: traceId ?? null,
        topicSlug,
        error: result.error,
        code: result.code,
      });
      return await finalizarConError('llm', result.error, result.code);
    }
    const { story } = result;
    console.info('[story-generation] historia generada', {
      traceId: traceId ?? null,
      topicSlug,
      model: story.modelo,
      palabras: story.metadata.longitudPalabras,
    });
    await completarEtapa('llm', 'Historia validada por QA');

    await avanzarEtapa('persistencia', 'Guardando historia en base de datos');
    const [storyRow] = await db
      .insert(generatedStories)
      .values({
        studentId: validado.studentId,
        topicSlug,
        titulo: story.titulo,
        contenido: story.contenido,
        nivel,
        metadata: {
          ...story.metadata,
          generationFlags: {
            ...(story.metadata.generationFlags ?? {}),
            tonoHistoria: tono,
            funMode: tono >= 4,
          },
          llmUsage: story.llmUsage,
        },
        modeloGeneracion: story.modelo,
        promptVersion: 'v3-split',
        aprobadaQA: story.aprobadaQA,
        motivoRechazo: story.motivoRechazo ?? null,
      })
      .returning();
    await completarEtapa('persistencia', 'Historia guardada');

    await avanzarEtapa('sesion', 'Creando sesion de lectura', true);
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
          skillSlug: customTopic ? 'custom-topic' : (skill?.slug ?? topicSlug),
          objetivoSesion: techTreeContext?.objetivoSesion,
          estrategiaPedagogica: techTreeContext?.estrategia,
          tonoHistoria: tono,
          funMode: tono >= 4,
          tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
          llmStoryModel: story.modelo,
          llmStoryUsage: story.llmUsage,
        },
      })
      .returning();
    await completarEtapa('sesion', 'Sesion lista');
    finalizarTraceOk(trace, 'Historia lista');
    await persistirTrace();

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
        topicEmoji: topicEmoji,
        topicNombre: topicNombre,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
      },
      preguntas: undefined,
      generationTrace: trace,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno inesperado';
    console.error('[story-generation] error inesperado', {
      traceId: traceId ?? null,
      studentId: validado.studentId,
      message,
    });
    return await finalizarConError(trace.stageCurrent, message, 'GENERATION_FAILED');
  }
}

/**
 * Devuelve el progreso en tiempo real de una generacion de historia.
 * Se consulta por polling desde la UI mientras `generarHistoria` esta en curso.
 */
export async function obtenerProgresoGeneracionHistoria(datos: {
  studentId: string;
  progressTraceId: string;
}) {
  const db = await getDb();
  const validado = obtenerProgresoGeneracionHistoriaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const row = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.progressTraceId),
      eq(sessions.studentId, validado.studentId),
      eq(sessions.tipoActividad, 'sistema'),
      eq(sessions.modulo, 'story-generation'),
    ),
    columns: {
      metadata: true,
    },
  });

  if (!row) {
    return {
      ok: false as const,
      error: 'Progreso aun no disponible',
    };
  }

  const trace = extraerTraceMetadata(row.metadata);
  if (!trace) {
    return {
      ok: false as const,
      error: 'No se encontro traza de progreso',
    };
  }

  return {
    ok: true as const,
    trace,
  };
}

/**
 * Genera preguntas de comprension para una historia existente.
 * Se llama en background mientras el nino lee, para no bloquear la UX.
 */
export async function generarPreguntasSesion(datos: {
  sessionId: string;
  studentId: string;
  storyId: string;
}) {
  const db = await getDb();
  const validado = generarPreguntasSesionSchema.parse(datos);
  const { estudiante } = await requireStudentOwnership(validado.studentId);

  // 1. Verificar sesion y consistencia session/story/student
  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
    columns: {
      id: true,
      storyId: true,
      metadata: true,
    },
  });

  if (!sesion) {
    return {
      ok: false as const,
      error: 'Sesion no encontrada',
      code: 'GENERATION_FAILED' as const,
    };
  }

  if (!sesion.storyId || sesion.storyId !== validado.storyId) {
    return {
      ok: false as const,
      error: 'La historia no corresponde a la sesion activa',
      code: 'GENERATION_FAILED' as const,
    };
  }

  // 2. Verificar que la historia existe y obtener datos
  const historia = await db.query.generatedStories.findFirst({
    where: and(
      eq(generatedStories.id, validado.storyId),
      eq(generatedStories.studentId, validado.studentId),
    ),
    with: { questions: true },
  });

  if (!historia) {
    return {
      ok: false as const,
      error: 'Historia no encontrada',
      code: 'GENERATION_FAILED' as const,
    };
  }

  // 3. Si ya tiene preguntas, devolverlas directamente
  if (historia.questions && historia.questions.length > 0) {
    return {
      ok: true as const,
      preguntas: historia.questions.sort((a, b) => a.orden - b.orden).map(mapPreguntaToDTO),
    };
  }

  // 4. Verificar API key
  if (!(await hasLLMKey())) {
    return {
      ok: false as const,
      error: 'API key de LLM no configurada',
      code: 'NO_API_KEY' as const,
    };
  }

  // 5. Obtener estudiante para nivel y edad
  const edadAnos = calcularEdad(estudiante.fechaNacimiento);

  // 6. Generar preguntas
  const result = await generateQuestions({
    storyTitulo: historia.titulo,
    storyContenido: historia.contenido,
    nivel: historia.nivel,
    edadAnos,
    elo: {
      global: estudiante.eloGlobal ?? 1000,
      literal: estudiante.eloLiteral ?? 1000,
      inferencia: estudiante.eloInferencia ?? 1000,
      vocabulario: estudiante.eloVocabulario ?? 1000,
      resumen: estudiante.eloResumen ?? 1000,
      rd: estudiante.eloRd ?? 350,
    },
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error, code: result.code };
  }

  await db
    .update(sessions)
    .set({
      metadata: mergeSessionMetadata(sesion.metadata, {
        llmQuestionsModel: result.questions.modelo,
        llmQuestionsUsage: result.questions.llmUsage,
      }),
    })
    .where(eq(sessions.id, validado.sessionId));

  // 7. Revalidar por concurrencia (si otra llamada ya inserto preguntas)
  const preguntasExistentes = await db.query.storyQuestions.findMany({
    where: eq(storyQuestions.storyId, validado.storyId),
    orderBy: [storyQuestions.orden],
  });

  if (preguntasExistentes.length > 0) {
    return {
      ok: true as const,
      preguntas: preguntasExistentes.map(mapPreguntaToDTO),
    };
  }

  // 8. Guardar preguntas en DB
  const preguntasInsert = result.questions.preguntas.map((p, idx) => ({
    storyId: validado.storyId,
    tipo: p.tipo,
    pregunta: p.pregunta,
    opciones: p.opciones,
    respuestaCorrecta: p.respuestaCorrecta,
    explicacion: p.explicacion,
    dificultad: p.dificultadPregunta,
    orden: idx,
  }));

  const preguntasRows = await db.insert(storyQuestions).values(preguntasInsert).returning();

  return {
    ok: true as const,
    preguntas: preguntasRows.map(mapPreguntaToDTO),
  };
}

/**
 * Loads an existing story for re-reading.
 * Creates a new session and returns the story + questions without LLM calls.
 */
export async function cargarHistoriaExistente(datos: {
  storyId: string;
  studentId: string;
}) {
  const db = await getDb();
  const validado = cargarHistoriaExistenteSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const historia = await db.query.generatedStories.findFirst({
    where: and(
      eq(generatedStories.id, validado.storyId),
      eq(generatedStories.studentId, validado.studentId),
    ),
    with: { questions: true },
  });

  if (!historia) {
    return { ok: false as const, error: 'Historia no encontrada' };
  }

  const isCustom = isCustomTopic(historia.topicSlug);
  const topic = isCustom ? null : TOPICS_SEED.find((t) => t.slug === historia.topicSlug);
  const customNombre = isCustom ? parseCustomTopic(historia.topicSlug) : undefined;
  const nivelConfig = getNivelConfig(historia.nivel);

  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: validado.studentId,
      tipoActividad: 'lectura',
      modulo: 'lectura-adaptativa',
      completada: false,
      estrellasGanadas: 0,
      storyId: historia.id,
      metadata: {
        textoId: historia.id,
        nivelTexto: historia.nivel,
        topicSlug: historia.topicSlug,
        skillSlug: isCustom ? 'custom-topic' : (getSkillBySlug(historia.topicSlug)?.slug ?? historia.topicSlug),
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
        fromCache: true,
        reRead: true,
      },
    })
    .returning();

  return {
    ok: true as const,
    sessionId: sesion.id,
    storyId: historia.id,
    fromCache: true,
    historia: {
      titulo: historia.titulo,
      contenido: historia.contenido,
      nivel: historia.nivel,
      topicSlug: historia.topicSlug,
      topicEmoji: isCustom ? '✏️' : (topic?.emoji ?? ''),
      topicNombre: customNombre ?? topic?.nombre ?? historia.topicSlug,
      tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
    },
    preguntas: historia.questions.length > 0
      ? historia.questions.sort((a, b) => a.orden - b.orden).map(mapPreguntaToDTO)
      : [],
  };
}
