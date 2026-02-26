/**
 * Story generation trace: types, state machine functions, and fun-mode helpers.
 * No I/O, no DB, no server directives. Pure domain logic.
 */
import type { ParentConfig, StoryMetadata } from '@omegaread/db';

// ─── Fun mode helpers ───

export function extraerFunModeConfig(rawConfig: unknown): boolean {
  if (!rawConfig || typeof rawConfig !== 'object') return false;
  const config = rawConfig as ParentConfig;
  return config.funMode === true;
}

export function extraerFunModeHistoria(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const storyMetadata = metadata as StoryMetadata;
  return storyMetadata.generationFlags?.funMode === true;
}

// ─── Types ───

export type StoryGenerationStageId =
  | 'validaciones'
  | 'ruta'
  | 'cache'
  | 'prompt'
  | 'llm'
  | 'persistencia'
  | 'sesion';

export type StoryGenerationStageStatus = 'pending' | 'running' | 'done' | 'error';

export interface StoryGenerationStage {
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

// ─── Blueprint ───

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

// ─── State machine helpers ───

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function crearStoryGenerationTrace(): StoryGenerationTrace {
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

export function buscarStage(
  trace: StoryGenerationTrace,
  stageId: StoryGenerationStageId,
): StoryGenerationStage {
  const stage = trace.stages.find((s) => s.id === stageId);
  if (!stage) {
    throw new Error(`Etapa de traza no encontrada: ${stageId}`);
  }
  return stage;
}

export function marcarStageRunning(
  trace: StoryGenerationTrace,
  stageId: StoryGenerationStageId,
  detail?: string,
) {
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

export function marcarStageDone(
  trace: StoryGenerationTrace,
  stageId: StoryGenerationStageId,
  detail?: string,
) {
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

export function marcarStageError(
  trace: StoryGenerationTrace,
  stageId: StoryGenerationStageId,
  error: string,
) {
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

export function finalizarTraceOk(trace: StoryGenerationTrace, detail?: string) {
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

export function completarEtapasRestantesComoOmitidas(
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

export function extraerTraceMetadata(metadata: unknown): StoryGenerationTrace | null {
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
