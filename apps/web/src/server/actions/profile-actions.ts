'use server';

/**
 * Server Actions para gestion de perfil enriquecido del estudiante.
 * Sprint 1: capturar identidad, contexto e intereses.
 */
import { getDb } from '@/server/db';
import { students, eq, and, type PerfilVivoState } from '@omegaread/db';
import { requireAuth } from '../auth';
import {
  actualizarPerfilSchema,
  guardarInteresesSchema,
  guardarContextoPersonalSchema,
  guardarPerfilVivoSchema,
  responderMicroPreguntaPerfilSchema,
} from '../validation';
import {
  MICRO_PREGUNTAS_PERFIL,
  crearHechoDesdeMicroRespuesta,
} from '@/lib/profile/micro-profile';

function crearPerfilVivoVacio(): PerfilVivoState {
  return {
    version: 1,
    hechos: [],
    microRespuestas: {},
  };
}

function extraerPerfilVivo(raw: unknown): PerfilVivoState {
  if (!raw || typeof raw !== 'object') return crearPerfilVivoVacio();
  const senales = raw as Record<string, unknown>;
  const pv = senales.perfilVivo as Record<string, unknown> | undefined;
  if (!pv || typeof pv !== 'object') return crearPerfilVivoVacio();

  const hechos = Array.isArray(pv.hechos)
    ? pv.hechos
      .filter((h) => h && typeof h === 'object')
      .map((h) => h as PerfilVivoState['hechos'][number])
      .slice(0, 80)
    : [];

  const microRespuestas = (pv.microRespuestas && typeof pv.microRespuestas === 'object')
    ? (pv.microRespuestas as PerfilVivoState['microRespuestas'])
    : {};

  return {
    version: 1,
    hechos,
    microRespuestas,
  };
}

/**
 * Actualizar perfil del estudiante con contexto (formulario del padre).
 * Marca perfilCompleto = true al completar.
 */
export async function actualizarPerfilEstudiante(datos: {
  studentId: string;
  curso: string;
  centroEscolar?: string;
  rutinaLectura: string;
  acompanamiento: string;
  senalesDificultad: {
    atencion?: boolean;
    vocabulario?: boolean;
    frustracion?: boolean;
    otroDetalle?: string;
  };
  personajesFavoritos?: string;
  temasEvitar?: string[];
}) {
  const db = await getDb();
  const validado = actualizarPerfilSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  await db
    .update(students)
    .set({
      curso: validado.curso,
      centroEscolar: validado.centroEscolar ?? null,
      rutinaLectura: validado.rutinaLectura,
      acompanamiento: validado.acompanamiento,
      senalesDificultad: validado.senalesDificultad,
      personajesFavoritos: validado.personajesFavoritos ?? null,
      temasEvitar: validado.temasEvitar ?? [],
      perfilCompleto: true,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}

/**
 * Guardar intereses del nino (seleccion visual del nino).
 */
export async function guardarIntereses(datos: {
  studentId: string;
  intereses: string[];
}) {
  const db = await getDb();
  const validado = guardarInteresesSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  await db
    .update(students)
    .set({
      intereses: validado.intereses,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}

/**
 * Guardar contexto personal del nino (texto libre del padre).
 * Se usa para personalizar las historias generadas.
 */
export async function guardarContextoPersonal(datos: {
  studentId: string;
  contextoPersonal?: string;
}) {
  const db = await getDb();
  const validado = guardarContextoPersonalSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false, error: 'Estudiante no encontrado' };
  }

  // Guardamos '' cuando el padre salta el paso (distinto de null = nunca mostrado)
  await db
    .update(students)
    .set({
      contextoPersonal: validado.contextoPersonal?.trim() || '',
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true };
}

/**
 * Guardado incremental del perfil vivo (dashboard de padre).
 */
export async function guardarPerfilVivo(datos: {
  studentId: string;
  contextoPersonal?: string;
  personajesFavoritos?: string;
  intereses?: string[];
  temasEvitar?: string[];
  nuevoHecho?: string;
  categoriaHecho?: 'interes' | 'fortaleza' | 'reto' | 'hito' | 'contexto';
}) {
  const db = await getDb();
  const validado = guardarPerfilVivoSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false as const, error: 'Estudiante no encontrado' };
  }

  const perfilVivo = extraerPerfilVivo(estudiante.senalesDificultad);
  if (validado.nuevoHecho?.trim()) {
    perfilVivo.hechos.unshift({
      id: crypto.randomUUID(),
      texto: validado.nuevoHecho.trim(),
      categoria: validado.categoriaHecho ?? 'contexto',
      fuente: 'padre',
      createdAt: new Date().toISOString(),
    });
    perfilVivo.hechos = perfilVivo.hechos.slice(0, 80);
  }

  const senalesActuales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
  const senalesNuevas = {
    ...senalesActuales,
    perfilVivo,
  };

  await db
    .update(students)
    .set({
      contextoPersonal: validado.contextoPersonal?.trim() ?? estudiante.contextoPersonal ?? '',
      personajesFavoritos: validado.personajesFavoritos?.trim() ?? estudiante.personajesFavoritos ?? null,
      intereses: validado.intereses ?? estudiante.intereses ?? [],
      temasEvitar: validado.temasEvitar ?? estudiante.temasEvitar ?? [],
      senalesDificultad: senalesNuevas,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true as const };
}

/**
 * Guarda la respuesta a una micro-pregunta del padre y la convierte en hecho util para prompts.
 */
export async function responderMicroPreguntaPerfil(datos: {
  studentId: string;
  preguntaId: string;
  respuesta: string;
}) {
  const db = await getDb();
  const validado = responderMicroPreguntaPerfilSchema.parse(datos);
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, validado.studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    return { ok: false as const, error: 'Estudiante no encontrado' };
  }

  const pregunta = MICRO_PREGUNTAS_PERFIL.find((p) => p.id === validado.preguntaId);
  if (!pregunta) {
    return { ok: false as const, error: 'Pregunta no valida' };
  }
  if (!pregunta.opciones.includes(validado.respuesta)) {
    return { ok: false as const, error: 'Respuesta no valida para esta pregunta' };
  }

  const perfilVivo = extraerPerfilVivo(estudiante.senalesDificultad);
  perfilVivo.microRespuestas[validado.preguntaId] = {
    preguntaId: validado.preguntaId,
    respuesta: validado.respuesta,
    answeredAt: new Date().toISOString(),
  };

  const hecho = crearHechoDesdeMicroRespuesta(validado.preguntaId, validado.respuesta);
  if (hecho) {
    perfilVivo.hechos.unshift({
      id: crypto.randomUUID(),
      texto: hecho.texto,
      categoria: hecho.categoria,
      fuente: 'micro-pregunta',
      createdAt: new Date().toISOString(),
    });
    perfilVivo.hechos = perfilVivo.hechos.slice(0, 80);
  }

  const senalesActuales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
  const senalesNuevas = {
    ...senalesActuales,
    perfilVivo,
  };

  await db
    .update(students)
    .set({
      senalesDificultad: senalesNuevas,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, validado.studentId));

  return { ok: true as const };
}
