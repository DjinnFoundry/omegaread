'use server';

/**
 * Server Actions para generacion de historias y finalizacion de sesiones.
 * Sprint 2: pipeline LLM + QA + adaptacion de dificultad.
 */
import { getDb } from '@/server/db';
import {
  generatedStories,
  storyQuestions,
  sessions,
  responses,
  skillProgress,
  students,
  eloSnapshots,
  manualAdjustments,
  eq,
  and,
  gte,
  desc,
  sql,
  type InferSelectModel,
} from '@omegaread/db';
import { requireStudentOwnership } from '../auth';
import {
  generarHistoriaSchema,
  finalizarSesionLecturaSchema,
  reescribirHistoriaSchema,
  analizarLecturaAudioSchema,
  generarPreguntasSesionSchema,
  obtenerProgresoGeneracionHistoriaSchema,
} from '../validation';
import { rewriteStory, generateStoryOnly, generateQuestions } from '@/lib/ai/story-generator';
import { getOpenAIClient, hasOpenAIKey, OpenAIKeyMissingError } from '@/lib/ai/openai';
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
import { recomendarSiguientesSkills, type SkillProgressLite } from '@/lib/learning/graph';

const MAX_HISTORIAS_DIA = 20;
const UMBRAL_SKILL_DOMINADA = 0.85;
const INTENTOS_MIN_REFORZAR = 3;

type SkillProgressRow = InferSelectModel<typeof skillProgress>;

type StoryGenerationStageId =
  | 'validaciones'
  | 'ruta'
  | 'cache'
  | 'prompt'
  | 'llm'
  | 'persistencia'
  | 'sesion';

type StoryGenerationStageStatus = 'pending' | 'running' | 'done' | 'error';

interface StoryGenerationStage {
  id: StoryGenerationStageId;
  label: string;
  progressTarget: number;
  status: StoryGenerationStageStatus;
  detail?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
}

export interface StoryGenerationTrace {
  status: 'running' | 'done' | 'error';
  progress: number;
  stageCurrent: StoryGenerationStageId;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  totalMs?: number;
  error?: string;
  stages: StoryGenerationStage[];
}

const STORY_GENERATION_STAGE_BLUEPRINT: Array<{
  id: StoryGenerationStageId;
  label: string;
  progressTarget: number;
}> = [
  { id: 'validaciones', label: 'Validando perfil y limites', progressTarget: 10 },
  { id: 'ruta', label: 'Seleccionando topic y ruta de aprendizaje', progressTarget: 25 },
  { id: 'cache', label: 'Buscando historia cacheada', progressTarget: 40 },
  { id: 'prompt', label: 'Preparando prompt narrativo', progressTarget: 55 },
  { id: 'llm', label: 'Generando historia con IA', progressTarget: 82 },
  { id: 'persistencia', label: 'Guardando historia', progressTarget: 92 },
  { id: 'sesion', label: 'Creando sesion de lectura', progressTarget: 98 },
];

function nowIsoString(): string {
  return new Date().toISOString();
}

function crearStoryGenerationTrace(): StoryGenerationTrace {
  const now = nowIsoString();
  return {
    status: 'running',
    progress: 0,
    stageCurrent: 'validaciones',
    startedAt: now,
    updatedAt: now,
    stages: STORY_GENERATION_STAGE_BLUEPRINT.map((s) => ({
      id: s.id,
      label: s.label,
      progressTarget: s.progressTarget,
      status: 'pending',
    })),
  };
}

function buscarStage(trace: StoryGenerationTrace, stageId: StoryGenerationStageId): StoryGenerationStage {
  const stage = trace.stages.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`Etapa de traza no encontrada: ${stageId}`);
  }
  return stage;
}

function marcarStageRunning(trace: StoryGenerationTrace, stageId: StoryGenerationStageId, detail?: string) {
  const now = nowIsoString();
  const stage = buscarStage(trace, stageId);
  if (!stage.startedAt) {
    stage.startedAt = now;
  }
  stage.status = 'running';
  stage.detail = detail;
  trace.stageCurrent = stageId;
  trace.updatedAt = now;
  trace.progress = Math.max(trace.progress, Math.max(stage.progressTarget - 12, 1));
}

function marcarStageDone(trace: StoryGenerationTrace, stageId: StoryGenerationStageId, detail?: string) {
  const now = nowIsoString();
  const stage = buscarStage(trace, stageId);
  if (!stage.startedAt) {
    stage.startedAt = now;
  }
  stage.status = 'done';
  stage.detail = detail;
  stage.endedAt = now;
  stage.durationMs = Math.max(0, new Date(now).getTime() - new Date(stage.startedAt).getTime());
  trace.progress = Math.max(trace.progress, stage.progressTarget);
  trace.updatedAt = now;
}

function marcarStageError(trace: StoryGenerationTrace, stageId: StoryGenerationStageId, error: string) {
  const now = nowIsoString();
  const stage = buscarStage(trace, stageId);
  if (!stage.startedAt) {
    stage.startedAt = now;
  }
  stage.status = 'error';
  stage.detail = error;
  stage.endedAt = now;
  stage.durationMs = Math.max(0, new Date(now).getTime() - new Date(stage.startedAt).getTime());
  trace.status = 'error';
  trace.error = error;
  trace.finishedAt = now;
  trace.updatedAt = now;
  trace.totalMs = Math.max(0, new Date(now).getTime() - new Date(trace.startedAt).getTime());
}

function finalizarTraceOk(trace: StoryGenerationTrace, detail?: string) {
  const now = nowIsoString();
  const stageSesion = buscarStage(trace, 'sesion');
  if (stageSesion.status !== 'done') {
    marcarStageDone(trace, 'sesion', detail ?? stageSesion.detail);
  }
  trace.status = 'done';
  trace.progress = 100;
  trace.finishedAt = now;
  trace.updatedAt = now;
  trace.totalMs = Math.max(0, new Date(now).getTime() - new Date(trace.startedAt).getTime());
}

function completarEtapasRestantesComoOmitidas(
  trace: StoryGenerationTrace,
  stageIds: StoryGenerationStageId[],
  detail: string,
) {
  for (const stageId of stageIds) {
    const stage = buscarStage(trace, stageId);
    if (stage.status === 'pending') {
      marcarStageDone(trace, stageId, detail);
    }
  }
}

function extraerTraceMetadata(metadata: unknown): StoryGenerationTrace | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const root = metadata as Record<string, unknown>;
  const traceRaw = root.generationTrace;
  if (!traceRaw || typeof traceRaw !== 'object') return null;
  const trace = traceRaw as Record<string, unknown>;
  if (!Array.isArray(trace.stages)) return null;
  if (typeof trace.status !== 'string') return null;
  if (typeof trace.progress !== 'number') return null;
  if (typeof trace.stageCurrent !== 'string') return null;
  if (typeof trace.startedAt !== 'string') return null;
  if (typeof trace.updatedAt !== 'string') return null;
  return traceRaw as StoryGenerationTrace;
}

async function persistirStoryGenerationTrace(params: {
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
  const duracionSegundos = trace.totalMs !== undefined
    ? Math.max(0, Math.round(trace.totalMs / 1000))
    : null;

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

interface PalabraTimestamp {
  palabra: string;
  inicioSeg?: number;
  finSeg?: number;
}

export interface AudioAnalisisLectura {
  wpmUtil: number;
  precisionLectura: number;
  coberturaTexto: number;
  pauseRatio: number;
  tiempoVozActivaMs: number;
  totalPalabrasTranscritas: number;
  totalPalabrasAlineadas: number;
  qualityScore: number;
  confiable: boolean;
  motivoNoConfiable: string | null;
  motor: string;
}

function normalizarToken(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]+/g, '')
    .trim();
}

function tokenizarTexto(valor: string): string[] {
  return valor.split(/\s+/).map(normalizarToken).filter(Boolean);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function alinearPalabrasAlTexto(params: { textoObjetivo: string; palabrasTranscritas: string[] }) {
  const objetivo = tokenizarTexto(params.textoObjetivo);
  const habladas = params.palabrasTranscritas.map(normalizarToken).filter(Boolean);

  let cursor = 0;
  let totalAlineadas = 0;
  const indicesUnicos = new Set<number>();

  for (const palabra of habladas) {
    let match = -1;
    const lookAhead = 8;
    const lookBehind = 3;
    const inicio = Math.max(0, cursor - lookBehind);
    const fin = Math.min(objetivo.length, cursor + lookAhead);

    for (let i = inicio; i < fin; i++) {
      if (objetivo[i] === palabra) {
        match = i;
        break;
      }
    }

    if (match === -1) continue;
    totalAlineadas++;
    indicesUnicos.add(match);
    if (match >= cursor) cursor = match + 1;
  }

  const totalObjetivo = objetivo.length;
  const coberturaTexto = totalObjetivo > 0 ? indicesUnicos.size / totalObjetivo : 0;
  const precisionLectura = habladas.length > 0 ? totalAlineadas / habladas.length : 0;

  return {
    totalObjetivo,
    totalHabladas: habladas.length,
    totalAlineadas,
    totalUnicasAlineadas: indicesUnicos.size,
    coberturaTexto: clamp01(coberturaTexto),
    precisionLectura: clamp01(precisionLectura),
  };
}

/**
 * Verifica cuantas historias ha generado un estudiante hoy.
 */
async function contarHistoriasHoy(studentId: string): Promise<number> {
  const db = await getDb();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(generatedStories)
    .where(and(eq(generatedStories.studentId, studentId), gte(generatedStories.creadoEn, hoy)));

  return Number(result[0]?.count ?? 0);
}

/**
 * Analiza lectura en voz alta:
 * - Transcribe audio
 * - Alinea palabras con el texto objetivo
 * - Calcula metrica robusta de fluidez (WPM util por voz activa)
 */
export async function analizarLecturaAudio(datos: {
  sessionId: string;
  studentId: string;
  storyId?: string;
  audioBase64: string;
  mimeType?: string;
  tiempoVozActivaMs: number;
  tiempoTotalMs: number;
}) {
  const db = await getDb();
  const validado = analizarLecturaAudioSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
    with: {
      story: {
        columns: {
          id: true,
          contenido: true,
        },
      },
    },
  });

  if (!sesion || !sesion.story) {
    return {
      ok: false as const,
      error: 'Sesion o historia no encontrada para analisis de audio',
      code: 'GENERATION_FAILED' as const,
    };
  }

  if (validado.storyId && validado.storyId !== sesion.story.id) {
    return {
      ok: false as const,
      error: 'El audio no corresponde a la historia activa de la sesion',
      code: 'GENERATION_FAILED' as const,
    };
  }

  const raw = validado.audioBase64.includes(',')
    ? validado.audioBase64.split(',')[1]
    : validado.audioBase64;
  const audioBuffer = Buffer.from(raw, 'base64');

  if (audioBuffer.length < 8_000) {
    return {
      ok: false as const,
      error: 'Audio insuficiente para medir fluidez',
      code: 'GENERATION_FAILED' as const,
    };
  }

  if (audioBuffer.length > 12_000_000) {
    return {
      ok: false as const,
      error: 'Audio demasiado grande para analizar en una sola peticion',
      code: 'GENERATION_FAILED' as const,
    };
  }

  const palabrasObjetivo = tokenizarTexto(sesion.story.contenido);
  const totalPalabrasObjetivo = palabrasObjetivo.length;

  let transcripcionTexto = '';
  let palabrasConTiempo: PalabraTimestamp[] = [];
  let errorTranscripcion: string | null = null;
  const transcribeModel = process.env.LLM_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

  if (await hasOpenAIKey()) {
    try {
      const client = await getOpenAIClient();
      const mimeType = validado.mimeType || 'audio/webm';
      const extension = mimeType.includes('wav')
        ? 'wav'
        : mimeType.includes('mp4')
          ? 'mp4'
          : 'webm';
      const file = new File([audioBuffer], `lectura.${extension}`, { type: mimeType });

      try {
        const verbose = await client.audio.transcriptions.create({
          file,
          model: transcribeModel,
          language: 'es',
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        });

        transcripcionTexto = String((verbose as { text?: string }).text ?? '').trim();
        const words = (
          verbose as { words?: Array<{ word?: string; start?: number; end?: number }> }
        ).words;
        if (Array.isArray(words) && words.length > 0) {
          palabrasConTiempo = words.map((w) => ({
            palabra: String(w.word ?? ''),
            inicioSeg: typeof w.start === 'number' ? w.start : undefined,
            finSeg: typeof w.end === 'number' ? w.end : undefined,
          }));
        }
      } catch {
        // Fallback cuando el proveedor no soporta verbose_json/timestamps.
        const simple = await client.audio.transcriptions.create({
          file,
          model: transcribeModel,
          language: 'es',
        });
        transcripcionTexto = String((simple as { text?: string }).text ?? '').trim();
      }
    } catch (error) {
      if (error instanceof OpenAIKeyMissingError) {
        errorTranscripcion = error.message;
      } else {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        errorTranscripcion = `Fallo al transcribir audio: ${msg}`;
      }
    }
  } else {
    errorTranscripcion = 'Sin API key de transcripcion; usando analisis de senal.';
  }

  const palabrasTranscritas =
    palabrasConTiempo.length > 0
      ? palabrasConTiempo.map((p) => p.palabra)
      : tokenizarTexto(transcripcionTexto);

  const minutosVozActiva = validado.tiempoVozActivaMs / 60_000;
  const pauseRatio = clamp01(
    (validado.tiempoTotalMs - validado.tiempoVozActivaMs) / validado.tiempoTotalMs,
  );

  let analisis: AudioAnalisisLectura;

  if (palabrasTranscritas.length >= 12) {
    const alineacion = alinearPalabrasAlTexto({
      textoObjetivo: sesion.story.contenido,
      palabrasTranscritas,
    });
    const wpmUtil =
      minutosVozActiva > 0
        ? Math.round((alineacion.totalUnicasAlineadas / minutosVozActiva) * 10) / 10
        : 0;
    const scoreVoz = clamp01(validado.tiempoVozActivaMs / 25_000);
    const scorePrecision = clamp01(alineacion.precisionLectura / 0.75);
    const scoreCobertura = clamp01(alineacion.coberturaTexto / 0.65);
    const qualityScore =
      Math.round((scoreVoz * 0.35 + scorePrecision * 0.4 + scoreCobertura * 0.25) * 100) / 100;

    const motivos: string[] = [];
    if (validado.tiempoVozActivaMs < 20_000) motivos.push('poca voz activa');
    if (alineacion.totalHabladas < 25) motivos.push('muy pocas palabras transcritas');
    if (alineacion.precisionLectura < 0.35) motivos.push('baja precision de alineacion');
    if (alineacion.coberturaTexto < 0.2) motivos.push('cobertura de texto baja');
    if (errorTranscripcion) motivos.push('transcripcion parcial');

    const confiable =
      qualityScore >= 0.55 && motivos.filter((m) => m !== 'transcripcion parcial').length === 0;

    analisis = {
      wpmUtil,
      precisionLectura: Math.round(alineacion.precisionLectura * 1000) / 1000,
      coberturaTexto: Math.round(alineacion.coberturaTexto * 1000) / 1000,
      pauseRatio: Math.round(pauseRatio * 1000) / 1000,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      totalPalabrasTranscritas: alineacion.totalHabladas,
      totalPalabrasAlineadas: alineacion.totalAlineadas,
      qualityScore,
      confiable,
      motivoNoConfiable: confiable ? null : motivos.join(', '),
      motor: transcribeModel,
    };
  } else {
    // Fallback puro por senal de audio (sin transcripcion util).
    const wpmEstimadoPorSenal =
      minutosVozActiva > 0 && totalPalabrasObjetivo > 0
        ? Math.round((totalPalabrasObjetivo / minutosVozActiva) * 10) / 10
        : 0;
    const duracionEsperadaMs =
      totalPalabrasObjetivo > 0 ? (totalPalabrasObjetivo / 85) * 60_000 : 0;
    const coberturaProxy =
      duracionEsperadaMs > 0 ? clamp01(validado.tiempoVozActivaMs / duracionEsperadaMs) : 0;
    const precisionProxy = wpmEstimadoPorSenal >= 35 && wpmEstimadoPorSenal <= 220 ? 0.6 : 0.35;
    const scoreVoz = clamp01(validado.tiempoVozActivaMs / 20_000);
    const scoreCobertura = clamp01(coberturaProxy / 0.6);
    const scoreRitmo =
      wpmEstimadoPorSenal > 0 ? clamp01(1 - Math.abs(wpmEstimadoPorSenal - 95) / 120) : 0;
    const qualityScore =
      Math.round((scoreVoz * 0.35 + scoreCobertura * 0.35 + scoreRitmo * 0.3) * 100) / 100;

    const motivos: string[] = [];
    if (validado.tiempoVozActivaMs < 15_000) motivos.push('poca voz activa');
    if (wpmEstimadoPorSenal > 0 && (wpmEstimadoPorSenal < 25 || wpmEstimadoPorSenal > 260))
      motivos.push('ritmo fuera de rango');
    if (coberturaProxy < 0.25) motivos.push('voz activa insuficiente para el texto');
    if (pauseRatio > 0.85) motivos.push('muchas pausas');
    if (errorTranscripcion) motivos.push('sin transcripcion util');

    const confiable =
      qualityScore >= 0.55 && motivos.filter((m) => m !== 'sin transcripcion util').length === 0;

    analisis = {
      wpmUtil: wpmEstimadoPorSenal,
      precisionLectura: Math.round(precisionProxy * 1000) / 1000,
      coberturaTexto: Math.round(coberturaProxy * 1000) / 1000,
      pauseRatio: Math.round(pauseRatio * 1000) / 1000,
      tiempoVozActivaMs: validado.tiempoVozActivaMs,
      totalPalabrasTranscritas: palabrasTranscritas.length,
      totalPalabrasAlineadas: 0,
      qualityScore,
      confiable,
      motivoNoConfiable: confiable ? null : motivos.join(', '),
      motor: 'signal-only',
    };
  }

  return {
    ok: true as const,
    analisis,
    transcripcionPreview: transcripcionTexto.slice(0, 180),
  };
}

function normalizarSkillSlug(skillId: string): string | null {
  return skillId.startsWith('topic-') ? skillId.slice('topic-'.length) : null;
}

function extraerHechosPerfilVivo(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const senales = raw as Record<string, unknown>;
  const perfil = senales.perfilVivo as Record<string, unknown> | undefined;
  if (!perfil || typeof perfil !== 'object') return [];
  const hechos = perfil.hechos;
  if (!Array.isArray(hechos)) return [];

  return hechos
    .filter((h) => h && typeof h === 'object')
    .map((h) => (h as Record<string, unknown>).texto)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .slice(0, 6);
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
  return skill.prerequisitos.every((req) => skillDominada(req, map));
}

function ordenarSkillsPorRuta(a: SkillDef, b: SkillDef): number {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel;
  return a.orden - b.orden;
}

function elegirSiguienteSkillTechTree(params: {
  edadAnos: number;
  intereses: string[];
  progresoMap: Map<string, SkillProgressRow>;
  skillActualSlug?: string;
  historialReciente?: string[];
}): SkillDef | undefined {
  const { edadAnos, intereses, progresoMap, skillActualSlug, historialReciente } = params;
  const skillsEdad = getSkillsPorEdad(edadAnos).sort(ordenarSkillsPorRuta);

  const progresoLite = new Map<string, SkillProgressLite>();
  for (const [slug, row] of progresoMap.entries()) {
    progresoLite.set(slug, {
      totalIntentos: row.totalIntentos,
      nivelMastery: row.nivelMastery,
      dominada: row.dominada,
    });
  }

  // Prioridad 1: recomendaciones del grafo (profundizar/conectar/aplicar/reforzar)
  const sugeridas = recomendarSiguientesSkills({
    edadAnos,
    intereses,
    progresoMap: progresoLite,
    skillActualSlug,
    recientes: historialReciente,
    limite: 5,
    soloDesbloqueadas: true,
  });
  for (const s of sugeridas) {
    const skill = getSkillBySlug(s.slug);
    if (!skill) continue;
    if (!skillsEdad.some((x) => x.slug === skill.slug)) continue;
    if (!skillDesbloqueada(skill, progresoMap)) continue;
    if (skillDominada(skill.slug, progresoMap)) continue;
    return skill;
  }

  const poolIntereses = skillsEdad.filter((s) => intereses.includes(s.dominio));
  const pools = poolIntereses.length > 0 ? [poolIntereses, skillsEdad] : [skillsEdad];

  for (const pool of pools) {
    const desbloqueadasPendientes = pool
      .filter((skill) => skillDesbloqueada(skill, progresoMap))
      .filter((skill) => !skillDominada(skill.slug, progresoMap))
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
    .filter((req) => skillDominada(req, progresoMap))
    .map((req) => getSkillBySlug(req)?.nombre ?? req);

  const prerequisitosPendientes = skill.prerequisitos
    .filter((req) => !skillDominada(req, progresoMap))
    .map((req) => getSkillBySlug(req)?.nombre ?? req);

  const skillsDominadasRelacionadas = skillsDominio
    .filter((s) => s.slug !== skill.slug && skillDominada(s.slug, progresoMap))
    .slice(0, 3)
    .map((s) => s.nombre);

  const skillsEnProgresoRelacionadas = skillsDominio
    .filter((s) => s.slug !== skill.slug)
    .filter((s) => {
      const row = progresoMap.get(s.slug);
      return (
        !!row &&
        row.totalIntentos > 0 &&
        !skillDominada(s.slug, progresoMap) &&
        row.nivelMastery >= 0.6
      );
    })
    .slice(0, 3)
    .map((s) => s.nombre);

  const skillsAReforzarRelacionadas = skillsDominio
    .filter((s) => s.slug !== skill.slug)
    .filter((s) => {
      const row = progresoMap.get(s.slug);
      return !!row && row.totalIntentos >= INTENTOS_MIN_REFORZAR && row.nivelMastery < 0.6;
    })
    .slice(0, 3)
    .map((s) => s.nombre);

  const siguienteSkillSugerida = skillsDominio
    .filter((s) => s.slug !== skill.slug)
    .filter((s) => skillDesbloqueada(s, progresoMap))
    .filter((s) => !skillDominada(s.slug, progresoMap))
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
  progressTraceId?: string;
}) {
  const db = await getDb();
  const validado = generarHistoriaSchema.parse(datos);
  const { estudiante } = await requireStudentOwnership(validado.studentId);
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
  ) => {
    marcarStageRunning(trace, stageId, detail);
    await persistirTrace();
  };

  const completarEtapa = async (
    stageId: StoryGenerationStageId,
    detail: string,
  ) => {
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
    await avanzarEtapa('validaciones', 'Comprobando API key y limites de uso');

    if (!(await hasOpenAIKey())) {
      return await finalizarConError(
        'validaciones',
        'Para generar historias personalizadas necesitas configurar una API key de OpenAI. Anade OPENAI_API_KEY en el archivo .env.local y reinicia la app.',
        'NO_API_KEY',
      );
    }

    const historiasHoy = await contarHistoriasHoy(validado.studentId);
    if (historiasHoy >= MAX_HISTORIAS_DIA) {
      return await finalizarConError(
        'validaciones',
        `Has alcanzado el limite de ${MAX_HISTORIAS_DIA} historias por dia. Vuelve manana para seguir leyendo.`,
        'RATE_LIMIT',
      );
    }
    await completarEtapa('validaciones', 'Validaciones completadas');

    await avanzarEtapa('ruta', 'Analizando nivel, historial e intereses');
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
    const historiasRecientesNodos = await db.query.generatedStories.findMany({
      where: eq(generatedStories.studentId, validado.studentId),
      orderBy: [desc(generatedStories.creadoEn)],
      limit: 8,
      columns: { topicSlug: true },
    });
    const historialReciente = historiasRecientesNodos.map((h) => h.topicSlug);
    const skillActualSlug = historialReciente[0];

    let topicSlug = validado.topicSlug;
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
        'como-funciona-corazon';
    }

    const topic = TOPICS_SEED.find((t) => t.slug === topicSlug);
    if (!topic) {
      return await finalizarConError('ruta', 'Topic no encontrado', 'GENERATION_FAILED');
    }
    await completarEtapa('ruta', `Topic seleccionado: ${topic.nombre}`);

    await avanzarEtapa(
      'cache',
      validado.forceRegenerate
        ? 'Regeneracion forzada, se omite cache'
        : 'Buscando historia reutilizable',
    );
    if (!validado.forceRegenerate) {
      const ttlDate = new Date();
      ttlDate.setDate(ttlDate.getDate() - 7);
      const cached = await db.query.generatedStories.findFirst({
        where: and(
          eq(generatedStories.studentId, validado.studentId),
          eq(generatedStories.topicSlug, topicSlug),
          eq(generatedStories.nivel, nivel),
          eq(generatedStories.reutilizable, true),
          eq(generatedStories.aprobadaQA, true),
          gte(generatedStories.creadoEn, ttlDate),
        ),
        orderBy: [desc(generatedStories.creadoEn)],
        with: { questions: true },
      });

      if (cached && cached.questions.length > 0) {
        await completarEtapa('cache', 'Cache hit, se reutiliza historia');
        completarEtapasRestantesComoOmitidas(
          trace,
          ['prompt', 'llm', 'persistencia'],
          'Omitida por reutilizacion de cache',
        );
        await persistirTrace();

        await avanzarEtapa('sesion', 'Creando sesion de lectura');
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
            topicEmoji: topic.emoji,
            topicNombre: topic.nombre,
            tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
          },
          preguntas: cached.questions
            .sort((a, b) => a.orden - b.orden)
            .map((p) => ({
              id: p.id,
              tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
              pregunta: p.pregunta,
              opciones: p.opciones,
              respuestaCorrecta: p.respuestaCorrecta,
              explicacion: p.explicacion,
            })),
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

    const skill = getSkillBySlug(topicSlug);
    const dominio = skill ? DOMINIOS.find((d) => d.slug === skill.dominio) : undefined;
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
        .map((slug) => CATEGORIAS.find((c) => c.slug === slug)?.nombre)
        .filter((n): n is string => !!n)
        .slice(0, 3),
      personajesFavoritos: estudiante.personajesFavoritos ?? undefined,
      contextoPersonal: (() => {
        const base = (estudiante.contextoPersonal ?? '').trim();
        const hechos = extraerHechosPerfilVivo(estudiante.senalesDificultad);
        if (hechos.length === 0) return base || undefined;
        const memoria = `Hechos recientes del nino: ${hechos.join(' | ')}`;
        return [base, memoria].filter(Boolean).join('\n');
      })(),
      historiasAnteriores: titulosPrevios.length > 0 ? titulosPrevios : undefined,
      techTreeContext,
    };
    await completarEtapa('prompt', 'Prompt listo');

    await avanzarEtapa('llm', 'Llamando al modelo para generar la narrativa');
    const result = await generateStoryOnly(promptInput);
    if (!result.ok) {
      return await finalizarConError('llm', result.error, result.code);
    }
    const { story } = result;
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
        metadata: story.metadata,
        modeloGeneracion: story.modelo,
        promptVersion: 'v3-split',
        aprobadaQA: story.aprobadaQA,
        motivoRechazo: story.motivoRechazo ?? null,
      })
      .returning();
    await completarEtapa('persistencia', 'Historia guardada');

    await avanzarEtapa('sesion', 'Creando sesion de lectura');
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
        topicEmoji: topic.emoji,
        topicNombre: topic.nombre,
        tiempoEsperadoMs: nivelConfig.tiempoEsperadoMs,
      },
      preguntas: undefined,
      generationTrace: trace,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno inesperado';
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
  await requireStudentOwnership(validado.studentId);

  // 1. Verificar sesion y consistencia session/story/student
  const sesion = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, validado.sessionId), eq(sessions.studentId, validado.studentId)),
    columns: {
      id: true,
      storyId: true,
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
      preguntas: historia.questions
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({
          id: p.id,
          tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
          pregunta: p.pregunta,
          opciones: p.opciones,
          respuestaCorrecta: p.respuestaCorrecta,
          explicacion: p.explicacion,
        })),
    };
  }

  // 4. Verificar API key
  if (!(await hasOpenAIKey())) {
    return { ok: false as const, error: 'API key no configurada', code: 'NO_API_KEY' as const };
  }

  // 5. Obtener estudiante para nivel y edad
  const estudiante = await db.query.students.findFirst({
    where: eq(students.id, validado.studentId),
  });

  if (!estudiante) {
    return {
      ok: false as const,
      error: 'Estudiante no encontrado',
      code: 'GENERATION_FAILED' as const,
    };
  }

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

  // 7. Revalidar por concurrencia (si otra llamada ya inserto preguntas)
  const preguntasExistentes = await db.query.storyQuestions.findMany({
    where: eq(storyQuestions.storyId, validado.storyId),
    orderBy: [storyQuestions.orden],
  });

  if (preguntasExistentes.length > 0) {
    return {
      ok: true as const,
      preguntas: preguntasExistentes.map((p) => ({
        id: p.id,
        tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
        pregunta: p.pregunta,
        opciones: p.opciones,
        respuestaCorrecta: p.respuestaCorrecta,
        explicacion: p.explicacion,
      })),
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
    preguntas: preguntasRows.map((p) => ({
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
  audioAnalisis?: AudioAnalisisLectura;
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
    const aciertosTotal = validado.respuestas.filter((r) => r.correcta).length;
    await actualizarProgresoInmediato({
      studentId: validado.studentId,
      skillId: `topic-${topicSlug}`,
      categoria: 'topic',
      correcto: aciertosTotal >= Math.ceil(validado.respuestas.length * 0.75),
    });
  }

  // 2. Calcular comprension
  const totalPreguntas = validado.respuestas.length;
  const aciertos = validado.respuestas.filter((r) => r.correcta).length;
  const comprensionScore = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;

  // 3. Marcar sesion como completada
  const duracionSegundos = Math.round(validado.tiempoLecturaMs / 1000);
  const ratioAciertos = totalPreguntas > 0 ? aciertos / totalPreguntas : 0;
  const estrellas = ratioAciertos >= 1 ? 3 : ratioAciertos >= 0.75 ? 2 : ratioAciertos > 0 ? 1 : 0;
  const usarAudioParaWpm =
    !!validado.audioAnalisis?.confiable && validado.audioAnalisis.wpmUtil > 0;
  const wpmPromedioFinal = usarAudioParaWpm
    ? (validado.audioAnalisis?.wpmUtil ?? null)
    : (validado.wpmPromedio ?? null);
  const fuenteWpm = usarAudioParaWpm ? 'audio' : 'pagina';

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
        ...(sesion.metadata as Record<string, unknown>),
        comprensionScore,
        aciertos,
        totalPreguntas,
        tiempoLecturaMs: validado.tiempoLecturaMs,
        fuenteWpm,
        audioAnalisis: validado.audioAnalisis
          ? {
              wpmUtil: validado.audioAnalisis.wpmUtil,
              precisionLectura: validado.audioAnalisis.precisionLectura,
              coberturaTexto: validado.audioAnalisis.coberturaTexto,
              pauseRatio: validado.audioAnalisis.pauseRatio,
              qualityScore: validado.audioAnalisis.qualityScore,
              confiable: validado.audioAnalisis.confiable,
              motivoNoConfiable: validado.audioAnalisis.motivoNoConfiable ?? null,
              motor: validado.audioAnalisis.motor,
              tiempoVozActivaMs: validado.audioAnalisis.tiempoVozActivaMs,
              totalPalabrasTranscritas: validado.audioAnalisis.totalPalabrasTranscritas,
              totalPalabrasAlineadas: validado.audioAnalisis.totalPalabrasAlineadas,
            }
          : null,
      },
    })
    .where(eq(sessions.id, validado.sessionId));

  // 4. Calcular ajuste de dificultad
  const tiempoEsperadoMs =
    ((sesion.metadata as Record<string, unknown>)?.tiempoEsperadoMs as number) ??
    getNivelConfig(((sesion.metadata as Record<string, unknown>)?.nivelTexto as number) ?? 2)
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
    const nivelMetadata = (sesion.metadata as Record<string, unknown>)?.nivelTexto;
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

  // Guardar sessionScore compuesto en metadata para futuras sesiones.
  const metadataActual = (
    await db.query.sessions.findFirst({
      where: eq(sessions.id, validado.sessionId),
      columns: { metadata: true },
    })
  )?.metadata as Record<string, unknown> | null;

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
        const eloActual: EloRatings = {
          global: estudianteElo.eloGlobal,
          literal: estudianteElo.eloLiteral,
          inferencia: estudianteElo.eloInferencia,
          vocabulario: estudianteElo.eloVocabulario,
          resumen: estudianteElo.eloResumen,
          rd: estudianteElo.eloRd,
        };

        const nivelTexto =
          ((sesion.metadata as Record<string, unknown>)?.nivelTexto as number) ?? 2;

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
  const db = await getDb();
  const validado = reescribirHistoriaSchema.parse(datos);
  const { estudiante } = await requireStudentOwnership(validado.studentId);

  // 1. Verificar API key
  if (!(await hasOpenAIKey())) {
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
  const edadAnos = calcularEdad(estudiante.fechaNacimiento);

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
    preguntas: preguntasRows.map((p) => ({
      id: p.id,
      tipo: p.tipo as 'literal' | 'inferencia' | 'vocabulario' | 'resumen',
      pregunta: p.pregunta,
      opciones: p.opciones,
      respuestaCorrecta: p.respuestaCorrecta,
      explicacion: p.explicacion,
    })),
  };
}
