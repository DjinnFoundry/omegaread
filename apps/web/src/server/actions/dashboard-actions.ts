'use server';

/**
 * Server Actions para dashboards de nino y padre.
 * Sprint 5: Agregan datos de sesiones, respuestas, ajustes de dificultad.
 */
import { getDb } from '@/server/db';
import {
  sessions,
  responses,
  difficultyAdjustments,
  generatedStories,
  topics,
  eloSnapshots,
  skillProgress,
  eq,
  and,
  desc,
  asc,
  inArray,
  type InferSelectModel,
  type ParentConfig,
  type AccesibilidadConfig,
} from '@zetaread/db';
import { getStudentContext } from '../student-context';
import {
  calcularProgresoNivel,
  generarMensajeMotivacional,
  calcularDesgloseTipos,
  generarRecomendaciones,
  construirNormativaLectura,
} from './dashboard-utils';
import { seleccionarPreguntaPerfilActiva } from '@/lib/profile/micro-profile';
import { extraerPerfilVivo } from '@/lib/profile/perfil-vivo';
import { recomendarSiguientesSkills } from '@/lib/learning/graph';
import { DOMINIOS, getSkillBySlug, getSkillsDeDominio } from '@/lib/data/skills';
import { crearMapaProgresoLite } from '@/lib/skills/progress';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface DashboardNinoData {
  /** Tendencia de comprension: ultimas 7 sesiones */
  tendenciaComprension: Array<{
    sessionId: string;
    fecha: string;
    porcentajeAcierto: number;
    topicEmoji: string;
  }>;
  /** Ritmo lector */
  ritmoLector: {
    tiempoPromedioAnteriorMs: number;
    tiempoPromedioRecienteMs: number;
    mejorando: boolean;
  } | null;
  /** Nivel actual y progreso */
  nivelActual: {
    nivel: number;
    historiasParaSubir: number;
    sesionesRecientesAltas: number;
    sesionesNecesarias: number;
  };
  /** Topics fuertes y a reforzar */
  topicsResumen: {
    fuertes: Array<{ topicSlug: string; emoji: string; nombre: string; porcentaje: number }>;
    reforzar: { topicSlug: string; emoji: string; nombre: string; porcentaje: number } | null;
  };
  /** Racha de lectura */
  racha: {
    diasConsecutivos: number;
    ultimosDias: boolean[]; // ultimos 7 dias, L-D
  };
  /** Mensaje motivacional */
  mensajeMotivacional: string;
}

export interface DashboardPadreData {
  studentId: string;
  /** Evolucion semanal de comprension (4-8 semanas) */
  evolucionSemanal: Array<{
    semana: string;
    scoreMedio: number;
    totalSesiones: number;
  }>;
  /** Evolucion de dificultad asignada */
  evolucionDificultad: Array<{
    fecha: string;
    nivelAnterior: number;
    nivelNuevo: number;
    direccion: string;
    razon: string;
  }>;
  /** Desglose por tipo de pregunta */
  desgloseTipos: Record<string, { total: number; aciertos: number; porcentaje: number; elo: number }>;
  /** Comparativa por topics */
  comparativaTopics: Array<{
    topicSlug: string;
    emoji: string;
    nombre: string;
    scoreMedio: number;
    totalSesiones: number;
  }>;
  /** Historial de sesiones */
  historialSesiones: Array<{
    id: string;
    fecha: string;
    topicSlug: string;
    topicEmoji: string;
    topicNombre: string;
    scorePorcentaje: number;
    nivel: number;
    duracionMin: number;
    ajuste: string | null;
  }>;
  /** Recomendaciones offline */
  recomendaciones: Array<{
    tipo: string;
    mensaje: string;
    detalle: string;
  }>;
  /** Timeline de cambios de nivel */
  timelineCambiosNivel: Array<{
    fecha: string;
    nivelAnterior: number;
    nivelNuevo: number;
    razon: string;
    evidencia: {
      comprensionScore?: number;
      ajusteManual?: string | null;
    };
  }>;
  /** Nivel actual */
  nivelActual: number;
  /** Nombre del estudiante */
  nombreEstudiante: string;
  /** Elo ratings actuales */
  eloActual: {
    global: number;
    literal: number;
    inferencia: number;
    vocabulario: number;
    resumen: number;
    rd: number;
  };
  /** Evolucion Elo por sesion (ultimos 30 snapshots) */
  eloEvolucion: Array<{
    fecha: string;
    sessionId: string;
    global: number;
    literal: number;
    inferencia: number;
    vocabulario: number;
    resumen: number;
    rd: number;
  }>;
  /** Evolucion WPM */
  wpmEvolucion: Array<{
    fecha: string;
    wpm: number;
  }>;
  /** Tabla normativa y equivalencias para interpretacion por familias */
  normativa: {
    referenciaEdad: {
      edadAnos: number;
      cursoEsperado: string;
    };
    equivalenciaGlobal: {
      curso: string;
      percentil: number;
      estado: string;
      necesitaApoyo: boolean;
      recomendacion: string;
    };
    porTipo: Record<string, {
      curso: string;
      percentil: number;
      estado: string;
      necesitaApoyo: boolean;
      recomendacion: string;
    }>;
    tabla: Array<{
      curso: string;
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    }>;
  };
  perfilVivo: {
    contextoPersonal: string;
    personajesFavoritos: string;
    intereses: string[];
    temasEvitar: string[];
    hechosRecientes: Array<{
      id: string;
      texto: string;
      categoria: string;
      fuente: string;
      createdAt: string;
    }>;
    totalHechos: number;
    microPreguntaActiva: {
      id: string;
      categoria: string;
      pregunta: string;
      opciones: string[];
    } | null;
  };
  ajustes: {
    funMode: boolean;
    accesibilidad: {
      fuenteDislexia: boolean;
      modoTDAH: boolean;
      altoContraste: boolean;
      duracionSesionMin: number | null;
    };
  };
  techTree: {
    historialTopics: Array<{
      slug: string;
      nombre: string;
      emoji: string;
      dominio: string;
      fecha: string;
      veces: number;
    }>;
    dominiosTocados: Array<{
      dominio: string;
      nombre: string;
      emoji: string;
      tocados: number;
      total: number;
    }>;
    sugerencias: Array<{
      slug: string;
      nombre: string;
      emoji: string;
      dominio: string;
      tipo: 'profundizar' | 'conectar' | 'aplicar' | 'reforzar';
      motivo: string;
    }>;
  };
}

// ─────────────────────────────────────────────
// DASHBOARD NINO
// ─────────────────────────────────────────────

export async function obtenerDashboardNino(estudianteId: string): Promise<DashboardNinoData> {
  const db = await getDb();
  const { nivel } = await getStudentContext(estudianteId);

  // Obtener sesiones de lectura completadas
  const todasSesiones = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, estudianteId),
      eq(sessions.tipoActividad, 'lectura'),
      eq(sessions.completada, true),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  // Obtener respuestas, stories y topics en paralelo (todos dependen solo de sesiones)
  const sessionIds = todasSesiones.map(s => s.id);
  const storyIds = todasSesiones
    .map(s => s.storyId)
    .filter((id): id is string => id !== null);

  const [todasRespuestas, historias, allTopics] = await Promise.all([
    sessionIds.length > 0 ? obtenerRespuestasDeSesiones(sessionIds) : Promise.resolve([]),
    storyIds.length > 0 ? obtenerHistorias(storyIds) : Promise.resolve([]),
    db.query.topics.findMany({ where: eq(topics.activo, true) }),
  ]);

  const topicMap = new Map(allTopics.map(t => [t.slug, t]));
  const storyMap = new Map(historias.map(h => [h.id, h]));

  // Pre-build response lookup to avoid O(sessions * responses) quadratic scans.
  const respuestasPorSesion = new Map<string, typeof todasRespuestas>();
  for (const r of todasRespuestas) {
    const list = respuestasPorSesion.get(r.sessionId) ?? [];
    list.push(r);
    respuestasPorSesion.set(r.sessionId, list);
  }

  // ─── Tendencia comprension (ultimas 7 sesiones) ───
  const ultimas7 = todasSesiones.slice(0, 7).reverse();
  const tendenciaComprension = ultimas7.map(s => {
    const respsSesion = respuestasPorSesion.get(s.id) ?? [];
    const total = respsSesion.length;
    const aciertos = respsSesion.filter(r => r.correcta).length;
    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    const topic = story ? topicMap.get(story.topicSlug) : null;

    return {
      sessionId: s.id,
      fecha: s.iniciadaEn.toISOString().split('T')[0],
      porcentajeAcierto: porcentaje,
      topicEmoji: topic?.emoji ?? '📖',
    };
  });

  // ─── Ritmo lector ───
  const ritmoLector = calcularRitmoLector(todasSesiones);

  // ─── Nivel actual y progreso ───
  const nivelActual = calcularProgresoNivel(
    nivel,
    todasSesiones,
    todasRespuestas,
  );

  // ─── Topics fuertes y a reforzar ───
  const topicsResumen = calcularTopicsResumen(
    todasSesiones,
    respuestasPorSesion,
    storyMap,
    topicMap,
  );

  // ─── Racha de lectura ───
  const racha = calcularRachaDetallada(todasSesiones);

  // ─── Mensaje motivacional ───
  const mensajeMotivacional = generarMensajeMotivacional(tendenciaComprension);

  return {
    tendenciaComprension,
    ritmoLector,
    nivelActual,
    topicsResumen,
    racha,
    mensajeMotivacional,
  };
}

// ─────────────────────────────────────────────
// DASHBOARD PADRE
// ─────────────────────────────────────────────

export async function obtenerDashboardPadre(estudianteId: string): Promise<DashboardPadreData> {
  const db = await getDb();
  const { padre, estudiante, edadAnos, nivel } = await getStudentContext(estudianteId);

  // Sesiones completadas
  const todasSesiones = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, estudianteId),
      eq(sessions.tipoActividad, 'lectura'),
      eq(sessions.completada, true),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  // Obtener respuestas, stories, topics, skill progress, ajustes y elo en paralelo
  const sessionIds = todasSesiones.map(s => s.id);
  const storyIds = todasSesiones
    .map(s => s.storyId)
    .filter((id): id is string => id !== null);

  const [todasRespuestas, historias, allTopics, progresoSkillsTopic, ajustes, snapshots] = await Promise.all([
    sessionIds.length > 0 ? obtenerRespuestasDeSesiones(sessionIds) : Promise.resolve([]),
    storyIds.length > 0 ? obtenerHistorias(storyIds) : Promise.resolve([]),
    db.query.topics.findMany({ where: eq(topics.activo, true) }),
    db.query.skillProgress.findMany({
      where: and(
        eq(skillProgress.studentId, estudianteId),
        eq(skillProgress.categoria, 'topic'),
      ),
    }),
    db.query.difficultyAdjustments.findMany({
      where: eq(difficultyAdjustments.studentId, estudianteId),
      orderBy: [desc(difficultyAdjustments.creadoEn)],
    }),
    db.query.eloSnapshots.findMany({
      where: eq(eloSnapshots.studentId, estudianteId),
      orderBy: [asc(eloSnapshots.creadoEn)],
      limit: 30,
    }),
  ]);

  const topicMap = new Map(allTopics.map(t => [t.slug, t]));
  const storyMap = new Map(historias.map(h => [h.id, h]));
  const progresoMap = crearMapaProgresoLite(progresoSkillsTopic);

  // Pre-build response lookup to avoid O(sessions * responses) quadratic scans.
  const respuestasPorSesionPadre = new Map<string, typeof todasRespuestas>();
  for (const r of todasRespuestas) {
    const list = respuestasPorSesionPadre.get(r.sessionId) ?? [];
    list.push(r);
    respuestasPorSesionPadre.set(r.sessionId, list);
  }

  // ─── Evolucion semanal (8 semanas) ───
  const evolucionSemanal = calcularEvolucionSemanal(todasSesiones, respuestasPorSesionPadre, 8);

  // ─── Evolucion dificultad ───
  const evolucionDificultad = ajustes.slice(0, 20).reverse().map(a => ({
    fecha: a.creadoEn.toISOString().split('T')[0],
    nivelAnterior: a.nivelAnterior,
    nivelNuevo: a.nivelNuevo,
    direccion: a.direccion,
    razon: a.razon,
  }));

  // ─── Desglose por tipo de pregunta ───
  const desgloseTipos = calcularDesgloseTipos(todasRespuestas);

  // ─── Comparativa por topics ───
  const comparativaTopics = calcularComparativaTopics(
    todasSesiones,
    respuestasPorSesionPadre,
    storyMap,
    topicMap,
  );

  // ─── Historial de sesiones (ultimas 20) ───
  const historialSesiones = todasSesiones.slice(0, 20).map(s => {
    const respsSesion = respuestasPorSesionPadre.get(s.id) ?? [];
    const total = respsSesion.length;
    const aciertos = respsSesion.filter(r => r.correcta).length;
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    const topic = story ? topicMap.get(story.topicSlug) : null;
    const ajuste = ajustes.find(a => a.sessionId === s.id);

    return {
      id: s.id,
      fecha: s.iniciadaEn.toISOString().split('T')[0],
      topicSlug: story?.topicSlug ?? 'desconocido',
      topicEmoji: topic?.emoji ?? '📖',
      topicNombre: topic?.nombre ?? 'Desconocido',
      scorePorcentaje: total > 0 ? Math.round((aciertos / total) * 100) : 0,
      nivel: story?.nivel ?? 0,
      duracionMin: Math.round((s.duracionSegundos ?? 0) / 60),
      ajuste: ajuste ? ajuste.direccion : null,
    };
  });

  // ─── Recomendaciones offline ───
  const recomendaciones = generarRecomendaciones(desgloseTipos, comparativaTopics, todasSesiones);

  // ─── Timeline cambios de nivel ───
  const timelineCambiosNivel = ajustes
    .filter(a => a.nivelAnterior !== a.nivelNuevo)
    .slice(0, 15)
    .reverse()
    .map(a => {
      const evidencia = (a.evidencia ?? {}) as Record<string, unknown>;
      return {
        fecha: a.creadoEn.toISOString().split('T')[0],
        nivelAnterior: a.nivelAnterior,
        nivelNuevo: a.nivelNuevo,
        razon: a.razon,
        evidencia: {
          comprensionScore: typeof evidencia.comprensionScore === 'number'
            ? evidencia.comprensionScore
            : undefined,
          ajusteManual: typeof evidencia.ajusteManual === 'string'
            ? evidencia.ajusteManual
            : null,
        },
      };
    });

  // ─── Elo actual del estudiante ───
  const eloActual = {
    global: estudiante.eloGlobal,
    literal: estudiante.eloLiteral,
    inferencia: estudiante.eloInferencia,
    vocabulario: estudiante.eloVocabulario,
    resumen: estudiante.eloResumen,
    rd: estudiante.eloRd,
  };

  // ─── Evolucion Elo (ultimos 30 snapshots, cargados en paralelo arriba) ───
  const eloEvolucion = snapshots.map(s => ({
    fecha: s.creadoEn.toISOString().split('T')[0],
    sessionId: s.sessionId,
    global: s.eloGlobal,
    literal: s.eloLiteral,
    inferencia: s.eloInferencia,
    vocabulario: s.eloVocabulario,
    resumen: s.eloResumen,
    rd: s.rdGlobal,
  }));

  // ─── Evolucion WPM ───
  const wpmEvolucion = todasSesiones
    .filter(s => s.wpmPromedio != null && s.wpmPromedio > 0)
    .slice(0, 30)
    .reverse()
    .map(s => ({
      fecha: s.iniciadaEn.toISOString().split('T')[0],
      wpm: Math.round(s.wpmPromedio!),
    }));

  // ─── Desglose por tipo con Elo ───
  const desgloseTiposConElo: Record<string, { total: number; aciertos: number; porcentaje: number; elo: number }> = {};
  const eloTipoMap: Record<string, number> = {
    literal: eloActual.literal,
    inferencia: eloActual.inferencia,
    vocabulario: eloActual.vocabulario,
    resumen: eloActual.resumen,
  };
  for (const [tipo, datos] of Object.entries(desgloseTipos)) {
    desgloseTiposConElo[tipo] = {
      ...datos,
      elo: eloTipoMap[tipo] ?? 1000,
    };
  }

  const normativa = construirNormativaLectura({
    edadAnos,
    eloGlobal: eloActual.global,
    eloPorTipo: eloTipoMap,
  });

  const senales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
  const perfil = extraerPerfilVivo(senales.perfilVivo);
  const microPreguntaActiva = seleccionarPreguntaPerfilActiva({
    studentId: estudianteId,
    preguntasRespondidas: Object.keys(perfil.microRespuestas),
  });

  const historialTopics = construirHistorialTopics(todasSesiones, storyMap, topicMap);
  const recientes = historialTopics.slice(0, 8).map((t) => t.slug);
  const ultimoSlug = historialTopics[0]?.slug;
  const sugerencias = recomendarSiguientesSkills({
    edadAnos,
    intereses: estudiante.intereses ?? [],
    progresoMap,
    skillActualSlug: ultimoSlug,
    recientes,
    limite: 5,
    soloDesbloqueadas: true,
  }).map((s) => ({
    slug: s.slug,
    nombre: s.nombre,
    emoji: s.emoji,
    dominio: s.dominio,
    tipo: s.tipo,
    motivo: s.motivo,
  }));

  const dominiosTocados = DOMINIOS.map((d) => {
    const tocados = historialTopics.filter((t) => t.dominio === d.slug).length;
    const total = getSkillsDeDominio(d.slug).filter((s) => edadAnos >= s.edadMinima && edadAnos <= s.edadMaxima).length;
    return {
      dominio: d.slug,
      nombre: d.nombre,
      emoji: d.emoji,
      tocados,
      total: Math.max(total, tocados),
    };
  });

  const configPadre = (padre.config ?? {}) as ParentConfig;
  const accesibilidad = (estudiante.accesibilidad ?? {}) as AccesibilidadConfig;

  return {
    studentId: estudiante.id,
    evolucionSemanal,
    evolucionDificultad,
    desgloseTipos: desgloseTiposConElo,
    comparativaTopics,
    historialSesiones,
    recomendaciones,
    timelineCambiosNivel,
    nivelActual: nivel,
    nombreEstudiante: estudiante.nombre,
    eloActual,
    eloEvolucion,
    wpmEvolucion,
    normativa,
    perfilVivo: {
      contextoPersonal: estudiante.contextoPersonal ?? '',
      personajesFavoritos: estudiante.personajesFavoritos ?? '',
      intereses: estudiante.intereses ?? [],
      temasEvitar: estudiante.temasEvitar ?? [],
      hechosRecientes: perfil.hechos.slice(0, 8),
      totalHechos: perfil.hechos.length,
      microPreguntaActiva: microPreguntaActiva ? {
        id: microPreguntaActiva.id,
        categoria: microPreguntaActiva.categoria,
        pregunta: microPreguntaActiva.pregunta,
        opciones: microPreguntaActiva.opciones,
      } : null,
    },
    ajustes: {
      funMode: configPadre.funMode === true,
      accesibilidad: {
        fuenteDislexia: accesibilidad.fuenteDislexia === true,
        modoTDAH: accesibilidad.modoTDAH === true,
        altoContraste: accesibilidad.altoContraste === true,
        duracionSesionMin: accesibilidad.duracionSesionMin ?? null,
      },
    },
    techTree: {
      historialTopics: historialTopics.slice(0, 18),
      dominiosTocados,
      sugerencias,
    },
  };
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

type SessionRow = InferSelectModel<typeof sessions>;
type ResponseRow = InferSelectModel<typeof responses>;
type StoryRow = InferSelectModel<typeof generatedStories>;
type TopicRow = InferSelectModel<typeof topics>;

function construirHistorialTopics(
  sesiones: SessionRow[],
  storyMap: Map<string, StoryRow>,
  topicMap: Map<string, TopicRow>,
) {
  const bySlug = new Map<string, {
    slug: string;
    nombre: string;
    emoji: string;
    dominio: string;
    fecha: string;
    veces: number;
  }>();

  for (const s of sesiones) {
    if (!s.storyId) continue;
    const story = storyMap.get(s.storyId);
    if (!story) continue;
    const skill = getSkillBySlug(story.topicSlug);
    const topic = topicMap.get(story.topicSlug);
    const existente = bySlug.get(story.topicSlug);
    const fecha = s.iniciadaEn.toISOString().split('T')[0] ?? '';
    if (existente) {
      existente.veces += 1;
      if (fecha > existente.fecha) existente.fecha = fecha;
    } else {
      bySlug.set(story.topicSlug, {
        slug: story.topicSlug,
        nombre: topic?.nombre ?? skill?.nombre ?? story.topicSlug,
        emoji: topic?.emoji ?? skill?.emoji ?? '📖',
        dominio: skill?.dominio ?? topic?.categoria ?? 'general',
        fecha,
        veces: 1,
      });
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

async function obtenerRespuestasDeSesiones(sessionIds: string[]) {
  const db = await getDb();
  const CHUNK = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < sessionIds.length; i += CHUNK) {
    chunks.push(sessionIds.slice(i, i + CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      db.query.responses.findMany({
        where: inArray(responses.sessionId, chunk),
      }),
    ),
  );
  return results.flat();
}

async function obtenerHistorias(storyIds: string[]) {
  const db = await getDb();
  const uniqueIds = [...new Set(storyIds)];
  const CHUNK = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    chunks.push(uniqueIds.slice(i, i + CHUNK));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      db.query.generatedStories.findMany({
        where: inArray(generatedStories.id, chunk),
      }),
    ),
  );
  return results.flat();
}

/** Calcular ritmo lector comparando primeras vs ultimas sesiones */
function calcularRitmoLector(
  sesiones: SessionRow[],
): DashboardNinoData['ritmoLector'] {
  const conDuracion = sesiones.filter(s => s.duracionSegundos && s.duracionSegundos > 0);
  if (conDuracion.length < 4) return null;

  const mitad = Math.floor(conDuracion.length / 2);
  const recientes = conDuracion.slice(0, mitad);
  const anteriores = conDuracion.slice(mitad);

  const promedioReciente = recientes.reduce((a, s) => a + (s.duracionSegundos ?? 0), 0) / recientes.length;
  const promedioAnterior = anteriores.reduce((a, s) => a + (s.duracionSegundos ?? 0), 0) / anteriores.length;

  return {
    tiempoPromedioAnteriorMs: Math.round(promedioAnterior * 1000),
    tiempoPromedioRecienteMs: Math.round(promedioReciente * 1000),
    mejorando: promedioReciente < promedioAnterior,
  };
}

// calcularProgresoNivel importada de dashboard-utils.ts

/** Top 3 topics fuertes + 1 a reforzar */
function calcularTopicsResumen(
  sesiones: SessionRow[],
  respuestasPorSesion: Map<string, ResponseRow[]>,
  storyMap: Map<string, StoryRow>,
  topicMap: Map<string, TopicRow>,
) {
  const scoresPorTopic = new Map<string, { total: number; aciertos: number }>();

  for (const s of sesiones) {
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    if (!story) continue;

    const resps = respuestasPorSesion.get(s.id) ?? [];
    const existing = scoresPorTopic.get(story.topicSlug) ?? { total: 0, aciertos: 0 };
    existing.total += resps.length;
    existing.aciertos += resps.filter(r => r.correcta).length;
    scoresPorTopic.set(story.topicSlug, existing);
  }

  const topicsConScore = Array.from(scoresPorTopic.entries())
    .filter(([, v]) => v.total >= 2)
    .map(([slug, v]) => {
      const topic = topicMap.get(slug);
      return {
        topicSlug: slug,
        emoji: topic?.emoji ?? '📖',
        nombre: topic?.nombre ?? slug,
        porcentaje: Math.round((v.aciertos / v.total) * 100),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);

  const fuertes = topicsConScore.slice(0, 3);
  const debiles = topicsConScore.filter(t => t.porcentaje < 70);
  const reforzar = debiles.length > 0 ? debiles[debiles.length - 1] : null;

  return { fuertes, reforzar };
}

/** Racha detallada con calendario de 7 dias */
function calcularRachaDetallada(sesiones: SessionRow[]) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Dias con sesion (set de strings YYYY-MM-DD)
  const diasConSesion = new Set<string>();
  for (const s of sesiones) {
    const d = new Date(s.iniciadaEn);
    diasConSesion.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

  // Racha consecutiva
  let diasConsecutivos = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (diasConSesion.has(key)) {
      diasConsecutivos++;
    } else if (i > 0) {
      break;
    }
  }

  // Ultimos 7 dias (L-D de esta semana)
  const diaSemana = hoy.getDay();
  const diasDesdelunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunes = new Date(hoy);
  lunes.setDate(lunes.getDate() - diasDesdelunes);

  const ultimosDias: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    ultimosDias.push(diasConSesion.has(key));
  }

  return { diasConsecutivos, ultimosDias };
}

// generarMensajeMotivacional importada de dashboard-utils.ts

/** Evolucion semanal de comprension */
function calcularEvolucionSemanal(
  sesiones: SessionRow[],
  respuestasPorSesion: Map<string, ResponseRow[]>,
  numSemanas: number,
) {
  const hoy = new Date();
  const semanas: Array<{ semana: string; scoreMedio: number; totalSesiones: number }> = [];

  for (let i = numSemanas - 1; i >= 0; i--) {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - (i + 1) * 7);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(hoy);
    fin.setDate(fin.getDate() - i * 7);
    fin.setHours(23, 59, 59, 999);

    const sesionesSemana = sesiones.filter(s => {
      const f = new Date(s.iniciadaEn);
      return f >= inicio && f <= fin;
    });

    let scoreMedio = 0;
    if (sesionesSemana.length > 0) {
      const scores = sesionesSemana.map(s => {
        const resps = respuestasPorSesion.get(s.id) ?? [];
        const total = resps.length;
        const aciertos = resps.filter(r => r.correcta).length;
        return total > 0 ? (aciertos / total) * 100 : 0;
      });
      scoreMedio = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    const label = `${inicio.getDate()}/${inicio.getMonth() + 1}`;
    semanas.push({
      semana: label,
      scoreMedio,
      totalSesiones: sesionesSemana.length,
    });
  }

  return semanas;
}

// calcularDesgloseTipos importada de dashboard-utils.ts

/** Comparativa de score por topics */
function calcularComparativaTopics(
  sesiones: SessionRow[],
  respuestasPorSesion: Map<string, ResponseRow[]>,
  storyMap: Map<string, StoryRow>,
  topicMap: Map<string, TopicRow>,
) {
  const porTopic = new Map<string, { scores: number[]; totalSesiones: number }>();

  for (const s of sesiones) {
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    if (!story) continue;

    const resps = respuestasPorSesion.get(s.id) ?? [];
    const total = resps.length;
    const aciertos = resps.filter(r => r.correcta).length;
    const score = total > 0 ? Math.round((aciertos / total) * 100) : 0;

    const existing = porTopic.get(story.topicSlug) ?? { scores: [], totalSesiones: 0 };
    existing.scores.push(score);
    existing.totalSesiones++;
    porTopic.set(story.topicSlug, existing);
  }

  return Array.from(porTopic.entries()).map(([slug, data]) => {
    const topic = topicMap.get(slug);
    return {
      topicSlug: slug,
      emoji: topic?.emoji ?? '📖',
      nombre: topic?.nombre ?? slug,
      scoreMedio: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      totalSesiones: data.totalSesiones,
    };
  }).sort((a, b) => b.scoreMedio - a.scoreMedio);
}

// generarRecomendaciones importada de dashboard-utils.ts
