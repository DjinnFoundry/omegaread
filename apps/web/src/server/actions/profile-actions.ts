'use server';

/**
 * Server Actions para gestion de perfil enriquecido del estudiante.
 * Sprint 1: capturar identidad, contexto e intereses.
 */
import { getDb } from '@/server/db';
import {
  parents,
  students,
  eq,
  and,
  type ParentConfig,
  type AccesibilidadConfig,
} from '@omegaread/db';
import { requireAuth, requireStudentOwnership } from '../auth';
import {
  actualizarPerfilSchema,
  guardarInteresesSchema,
  guardarContextoPersonalSchema,
  guardarPerfilVivoSchema,
  responderMicroPreguntaPerfilSchema,
  guardarAjustesLecturaSchema,
} from '../validation';
import {
  MICRO_PREGUNTAS_PERFIL,
  crearHechoDesdeMicroRespuesta,
} from '@/lib/profile/micro-profile';
import { extraerPerfilVivo } from '@/lib/profile/perfil-vivo';


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

  const senalesActuales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
  const perfilVivo = extraerPerfilVivo(senalesActuales.perfilVivo);
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
 * Guarda ajustes de lectura:
 * - Fun mode (nivel familia / parent.config)
 * - Accesibilidad por estudiante (students.accesibilidad)
 */
export async function guardarAjustesLectura(datos: {
  studentId: string;
  funMode?: boolean;
  accesibilidad?: {
    fuenteDislexia?: boolean;
    modoTDAH?: boolean;
    altoContraste?: boolean;
    duracionSesionMin?: number;
  };
}) {
  const db = await getDb();
  const validado = guardarAjustesLecturaSchema.parse(datos);
  const { padre, estudiante } = await requireStudentOwnership(validado.studentId);

  const parentConfigActual = (padre.config ?? {}) as ParentConfig;
  const accesibilidadActual = (estudiante.accesibilidad ?? {}) as AccesibilidadConfig;
  let parentConfigFinal = parentConfigActual;
  let accesibilidadFinal = accesibilidadActual;

  if (validado.funMode !== undefined) {
    parentConfigFinal = {
      ...parentConfigActual,
      funMode: validado.funMode,
    };

    await db
      .update(parents)
      .set({
        config: parentConfigFinal,
        actualizadoEn: new Date(),
      })
      .where(eq(parents.id, padre.id));
  }

  if (validado.accesibilidad) {
    accesibilidadFinal = { ...accesibilidadActual };
    if (validado.accesibilidad.fuenteDislexia !== undefined) {
      accesibilidadFinal.fuenteDislexia = validado.accesibilidad.fuenteDislexia;
    }
    if (validado.accesibilidad.modoTDAH !== undefined) {
      accesibilidadFinal.modoTDAH = validado.accesibilidad.modoTDAH;
    }
    if (validado.accesibilidad.altoContraste !== undefined) {
      accesibilidadFinal.altoContraste = validado.accesibilidad.altoContraste;
    }
    if (validado.accesibilidad.duracionSesionMin !== undefined) {
      accesibilidadFinal.duracionSesionMin = validado.accesibilidad.duracionSesionMin;
    }

    await db
      .update(students)
      .set({
        accesibilidad: accesibilidadFinal,
        actualizadoEn: new Date(),
      })
      .where(eq(students.id, estudiante.id));
  }

  return {
    ok: true as const,
    ajustes: {
      funMode: parentConfigFinal.funMode === true,
      accesibilidad: {
        fuenteDislexia: accesibilidadFinal.fuenteDislexia === true,
        modoTDAH: accesibilidadFinal.modoTDAH === true,
        altoContraste: accesibilidadFinal.altoContraste === true,
        duracionSesionMin: accesibilidadFinal.duracionSesionMin ?? null,
      },
    },
  };
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

  const senalesActuales = (estudiante.senalesDificultad ?? {}) as Record<string, unknown>;
  const perfilVivo = extraerPerfilVivo(senalesActuales.perfilVivo);
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
