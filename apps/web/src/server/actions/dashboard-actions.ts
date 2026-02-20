'use server';

/**
 * Server Actions para dashboards de nino y padre.
 * Sprint 5: Agregan datos de sesiones, respuestas, ajustes de dificultad.
 */
import {
  db,
  sessions,
  responses,
  difficultyAdjustments,
  generatedStories,
  topics,
} from '@omegaread/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireStudentOwnership } from '../auth';

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
  desgloseTipos: Record<string, { total: number; aciertos: number; porcentaje: number }>;
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
}

// ─────────────────────────────────────────────
// DASHBOARD NINO
// ─────────────────────────────────────────────

export async function obtenerDashboardNino(estudianteId: string): Promise<DashboardNinoData> {
  const { estudiante } = await requireStudentOwnership(estudianteId);

  // Obtener sesiones de lectura completadas
  const todasSesiones = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, estudianteId),
      eq(sessions.tipoActividad, 'lectura'),
      eq(sessions.completada, true),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  // Obtener todas las respuestas de las sesiones
  const sessionIds = todasSesiones.map(s => s.id);
  const todasRespuestas = sessionIds.length > 0
    ? await obtenerRespuestasDeSesiones(sessionIds)
    : [];

  // Obtener stories para topic info
  const storyIds = todasSesiones
    .map(s => s.storyId)
    .filter((id): id is string => id !== null);
  const historias = storyIds.length > 0
    ? await obtenerHistorias(storyIds)
    : [];

  // Obtener topics para emojis/nombres
  const allTopics = await db.query.topics.findMany({
    where: eq(topics.activo, true),
  });
  const topicMap = new Map(allTopics.map(t => [t.slug, t]));

  // Mapear session -> story -> topic
  const storyMap = new Map(historias.map(h => [h.id, h]));

  // ─── Tendencia comprension (ultimas 7 sesiones) ───
  const ultimas7 = todasSesiones.slice(0, 7).reverse();
  const tendenciaComprension = ultimas7.map(s => {
    const respsSesion = todasRespuestas.filter(r => r.sessionId === s.id);
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
    estudiante.nivelLectura ?? 1,
    todasSesiones,
    todasRespuestas,
  );

  // ─── Topics fuertes y a reforzar ───
  const topicsResumen = calcularTopicsResumen(
    todasSesiones,
    todasRespuestas,
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
  const { estudiante } = await requireStudentOwnership(estudianteId);

  // Sesiones completadas
  const todasSesiones = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, estudianteId),
      eq(sessions.tipoActividad, 'lectura'),
      eq(sessions.completada, true),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  const sessionIds = todasSesiones.map(s => s.id);
  const todasRespuestas = sessionIds.length > 0
    ? await obtenerRespuestasDeSesiones(sessionIds)
    : [];

  // Stories + topics
  const storyIds = todasSesiones
    .map(s => s.storyId)
    .filter((id): id is string => id !== null);
  const historias = storyIds.length > 0
    ? await obtenerHistorias(storyIds)
    : [];
  const allTopics = await db.query.topics.findMany({
    where: eq(topics.activo, true),
  });
  const topicMap = new Map(allTopics.map(t => [t.slug, t]));
  const storyMap = new Map(historias.map(h => [h.id, h]));

  // Ajustes de dificultad
  const ajustes = await db.query.difficultyAdjustments.findMany({
    where: eq(difficultyAdjustments.studentId, estudianteId),
    orderBy: [desc(difficultyAdjustments.creadoEn)],
  });

  // ─── Evolucion semanal (8 semanas) ───
  const evolucionSemanal = calcularEvolucionSemanal(todasSesiones, todasRespuestas, 8);

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
    todasRespuestas,
    storyMap,
    topicMap,
  );

  // ─── Historial de sesiones (ultimas 20) ───
  const historialSesiones = todasSesiones.slice(0, 20).map(s => {
    const respsSesion = todasRespuestas.filter(r => r.sessionId === s.id);
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

  return {
    evolucionSemanal,
    evolucionDificultad,
    desgloseTipos,
    comparativaTopics,
    historialSesiones,
    recomendaciones,
    timelineCambiosNivel,
    nivelActual: estudiante.nivelLectura ?? 1,
    nombreEstudiante: estudiante.nombre,
  };
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────

type SessionRow = Awaited<ReturnType<typeof db.query.sessions.findMany>>[number];
type ResponseRow = Awaited<ReturnType<typeof db.query.responses.findMany>>[number];
type StoryRow = Awaited<ReturnType<typeof db.query.generatedStories.findMany>>[number];
type TopicRow = Awaited<ReturnType<typeof db.query.topics.findMany>>[number];

async function obtenerRespuestasDeSesiones(sessionIds: string[]) {
  const allResponses: ResponseRow[] = [];
  // Batch in chunks to avoid huge IN clauses
  const CHUNK = 50;
  for (let i = 0; i < sessionIds.length; i += CHUNK) {
    const chunk = sessionIds.slice(i, i + CHUNK);
    for (const sid of chunk) {
      const resps = await db.query.responses.findMany({
        where: eq(responses.sessionId, sid),
      });
      allResponses.push(...resps);
    }
  }
  return allResponses;
}

async function obtenerHistorias(storyIds: string[]) {
  const all: StoryRow[] = [];
  for (const id of storyIds) {
    const story = await db.query.generatedStories.findFirst({
      where: eq(generatedStories.id, id),
    });
    if (story) all.push(story);
  }
  return all;
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

/** Progreso de nivel: cuantas sesiones faltan para subir */
export function calcularProgresoNivel(
  nivelActual: number,
  sesiones: SessionRow[],
  respuestas: ResponseRow[],
) {
  const SESIONES_NECESARIAS = 3;
  const ultimas = sesiones.slice(0, SESIONES_NECESARIAS);
  let sesionesAltas = 0;

  for (const s of ultimas) {
    const resps = respuestas.filter(r => r.sessionId === s.id);
    const total = resps.length;
    const aciertos = resps.filter(r => r.correcta).length;
    if (total > 0 && (aciertos / total) >= 0.80) {
      sesionesAltas++;
    }
  }

  return {
    nivel: nivelActual,
    historiasParaSubir: Math.max(0, SESIONES_NECESARIAS - sesionesAltas),
    sesionesRecientesAltas: sesionesAltas,
    sesionesNecesarias: SESIONES_NECESARIAS,
  };
}

/** Top 3 topics fuertes + 1 a reforzar */
function calcularTopicsResumen(
  sesiones: SessionRow[],
  respuestas: ResponseRow[],
  storyMap: Map<string, StoryRow>,
  topicMap: Map<string, TopicRow>,
) {
  const scoresPorTopic = new Map<string, { total: number; aciertos: number }>();

  for (const s of sesiones) {
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    if (!story) continue;

    const resps = respuestas.filter(r => r.sessionId === s.id);
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

/** Mensaje motivacional basado en tendencia */
export function generarMensajeMotivacional(
  tendencia: DashboardNinoData['tendenciaComprension'],
): string {
  if (tendencia.length < 2) {
    return 'Cada historia que lees te hace mas fuerte. A leer!';
  }

  const ultimos3 = tendencia.slice(-3);
  const promedioReciente = ultimos3.reduce((a, t) => a + t.porcentajeAcierto, 0) / ultimos3.length;

  // Comparar con los anteriores
  const anteriores = tendencia.slice(0, -3);
  if (anteriores.length === 0) {
    if (promedioReciente >= 80) return 'Vas genial! Tu comprension es super buena!';
    if (promedioReciente >= 60) return 'Muy bien! Sigue leyendo y cada vez entenderas mas!';
    return 'Sigue practicando, cada historia cuenta!';
  }

  const promedioAnterior = anteriores.reduce((a, t) => a + t.porcentajeAcierto, 0) / anteriores.length;

  if (promedioReciente > promedioAnterior + 5) {
    return 'Vas genial! Tu comprension sube cada semana!';
  }
  if (promedioReciente >= promedioAnterior - 5) {
    return 'Muy bien! Estas manteniendote fuerte. Sigue asi!';
  }
  return 'Sigue practicando, cada historia cuenta. Tu puedes!';
}

/** Evolucion semanal de comprension */
function calcularEvolucionSemanal(
  sesiones: SessionRow[],
  respuestas: ResponseRow[],
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
        const resps = respuestas.filter(r => r.sessionId === s.id);
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

/** Desglose por tipo de pregunta */
export function calcularDesgloseTipos(respuestas: ResponseRow[]) {
  const tipos: Record<string, { total: number; aciertos: number; porcentaje: number }> = {
    literal: { total: 0, aciertos: 0, porcentaje: 0 },
    inferencia: { total: 0, aciertos: 0, porcentaje: 0 },
    vocabulario: { total: 0, aciertos: 0, porcentaje: 0 },
    resumen: { total: 0, aciertos: 0, porcentaje: 0 },
  };

  for (const r of respuestas) {
    const tipo = r.tipoEjercicio;
    if (tipo in tipos) {
      tipos[tipo].total++;
      if (r.correcta) tipos[tipo].aciertos++;
    }
  }

  for (const tipo of Object.values(tipos)) {
    tipo.porcentaje = tipo.total > 0 ? Math.round((tipo.aciertos / tipo.total) * 100) : 0;
  }

  return tipos;
}

/** Comparativa de score por topics */
function calcularComparativaTopics(
  sesiones: SessionRow[],
  respuestas: ResponseRow[],
  storyMap: Map<string, StoryRow>,
  topicMap: Map<string, TopicRow>,
) {
  const porTopic = new Map<string, { scores: number[]; totalSesiones: number }>();

  for (const s of sesiones) {
    const story = s.storyId ? storyMap.get(s.storyId) : null;
    if (!story) continue;

    const resps = respuestas.filter(r => r.sessionId === s.id);
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

/** Recomendaciones offline basadas en datos reales */
export function generarRecomendaciones(
  desglose: Record<string, { total: number; aciertos: number; porcentaje: number }>,
  topicsComp: Array<{ topicSlug: string; nombre: string; scoreMedio: number }>,
  sesiones: SessionRow[],
): DashboardPadreData['recomendaciones'] {
  const recs: DashboardPadreData['recomendaciones'] = [];

  // Recomendacion por tipo de pregunta debil
  const tiposOrdenados = Object.entries(desglose)
    .filter(([, v]) => v.total >= 3)
    .sort(([, a], [, b]) => a.porcentaje - b.porcentaje);

  if (tiposOrdenados.length > 0) {
    const [tipoDebil, datos] = tiposOrdenados[0];
    const consejos: Record<string, { mensaje: string; detalle: string }> = {
      inferencia: {
        mensaje: 'Practicar inferencias leyendo juntos',
        detalle: 'Cuando lean juntos, hagan preguntas tipo "Por que crees que el personaje hizo eso?" o "Que crees que pasara despues?". Esto entrena la capacidad de inferir.',
      },
      vocabulario: {
        mensaje: 'Ampliar vocabulario con juegos de palabras',
        detalle: 'Cuando encuentren una palabra nueva, jueguen a usarla en 3 frases diferentes. Tambien pueden hacer un "diccionario personal" con dibujos.',
      },
      literal: {
        mensaje: 'Reforzar comprension literal con relectura',
        detalle: 'Despues de leer una pagina, pregunten "Que acaba de pasar?". Si no recuerda, relean juntos sin prisa. La relectura fortalece la comprension.',
      },
      resumen: {
        mensaje: 'Practicar resumenes cortos despues de leer',
        detalle: 'Al terminar un cuento, pidan que cuente la historia en 3 frases. Pueden usar "Primero..., luego..., al final..." como estructura.',
      },
    };

    if (datos.porcentaje < 70 && tipoDebil in consejos) {
      recs.push({
        tipo: tipoDebil,
        ...consejos[tipoDebil],
      });
    }
  }

  // Recomendacion por topic debil
  const topicDebil = topicsComp.filter(t => t.scoreMedio < 60).pop();
  if (topicDebil) {
    recs.push({
      tipo: 'topic',
      mensaje: `Explorar mas sobre "${topicDebil.nombre}" fuera de la app`,
      detalle: `El score en ${topicDebil.nombre} es ${topicDebil.scoreMedio}%. Busquen libros, videos o actividades sobre este tema para que el nino gane familiaridad y vocabulario especifico.`,
    });
  }

  // Recomendacion por frecuencia
  const sesionesUltimaSemana = sesiones.filter(s => {
    const hace7 = new Date();
    hace7.setDate(hace7.getDate() - 7);
    return new Date(s.iniciadaEn) >= hace7;
  });

  if (sesionesUltimaSemana.length < 3) {
    recs.push({
      tipo: 'frecuencia',
      mensaje: 'Establecer una rutina diaria de lectura',
      detalle: 'La practica frecuente es clave. Intenten leer al menos 10 minutos al dia, idealmente a la misma hora (antes de dormir funciona muy bien).',
    });
  }

  return recs.slice(0, 3);
}
