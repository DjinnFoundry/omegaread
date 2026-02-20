'use server';

/**
 * Server Actions para sesiones de lectura adaptativa.
 * Sprint 1: contrato de datos (tipos + acciones).
 * Sprint 2+: conectar con generacion de historias.
 */
import {
  db,
  sessions,
  responses,
  difficultyAdjustments,
  manualAdjustments,
  students,
} from '@omegaread/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireStudentOwnership } from '../auth';
import {
  crearSesionLecturaSchema,
  registrarRespuestaComprensionSchema,
} from '../validation';
import {
  calcularSessionScore,
  determinarAjuste,
  type DireccionAjuste,
} from '@/lib/types/reading';

/**
 * Crear una sesion de lectura adaptativa.
 */
export async function crearSesionLectura(datos: {
  studentId: string;
  textoId?: string;
  nivelTexto?: number;
  topicId?: string;
}) {
  const validado = crearSesionLecturaSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const [sesion] = await db
    .insert(sessions)
    .values({
      studentId: validado.studentId,
      tipoActividad: 'lectura',
      modulo: 'lectura-adaptativa',
      completada: false,
      estrellasGanadas: 0,
      metadata: {
        textoId: validado.textoId,
        nivelTexto: validado.nivelTexto,
        topicId: validado.topicId,
      },
    })
    .returning();

  return { ok: true, sessionId: sesion.id };
}

/**
 * Registrar respuesta de comprension dentro de una sesion de lectura.
 */
export async function registrarRespuestaComprension(datos: {
  sessionId: string;
  studentId: string;
  preguntaId: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  respuestaSeleccionada: number;
  correcta: boolean;
  tiempoMs: number;
}) {
  const validado = registrarRespuestaComprensionSchema.parse(datos);
  await requireStudentOwnership(validado.studentId);

  const sesion = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, validado.sessionId),
      eq(sessions.studentId, validado.studentId),
    ),
  });
  if (!sesion) {
    throw new Error('Sesion no encontrada o no pertenece al estudiante');
  }

  await db.insert(responses).values({
    sessionId: validado.sessionId,
    ejercicioId: validado.preguntaId,
    tipoEjercicio: validado.tipo,
    pregunta: validado.preguntaId,
    respuesta: String(validado.respuestaSeleccionada),
    respuestaCorrecta: 'N/A', // La opcion correcta esta en la pregunta
    correcta: validado.correcta,
    tiempoRespuestaMs: validado.tiempoMs,
  });

  return { ok: true };
}

/**
 * Calcular ajuste de dificultad tras una sesion.
 * Registra la decision con trazabilidad (por que).
 *
 * Formula v1:
 *   session_score = 0.65 * comprension + 0.25 * ritmo_normalizado + 0.10 * estabilidad
 *
 * Reglas:
 *   - comprension >= 80%: subir
 *   - comprension 60-79%: mantener
 *   - comprension < 60%: bajar
 */
export async function calcularAjusteDificultad(datos: {
  studentId: string;
  sessionId: string;
  comprensionScore: number;
  tiempoLecturaMs: number;
  tiempoEsperadoMs: number;
}) {
  const { estudiante } = await requireStudentOwnership(datos.studentId);

  // Clamp nivel anterior a [1, 4] (corrige datos legacy donde nivel > 4)
  const nivelAnterior = Math.max(1, Math.min(4, estudiante.nivelLectura ?? 1));

  // Calcular ritmo normalizado (1.0 = optimo, decrece si muy rapido o muy lento)
  const ratio = datos.tiempoLecturaMs / datos.tiempoEsperadoMs;
  const ritmoNormalizado = Math.max(0, 1 - Math.abs(1 - ratio) * 0.5);

  // Calcular estabilidad (consistencia en ultimas sesiones)
  const sesionesRecientes = await db.query.sessions.findMany({
    where: and(
      eq(sessions.studentId, datos.studentId),
      eq(sessions.tipoActividad, 'lectura'),
    ),
    orderBy: [desc(sessions.iniciadaEn)],
    limit: 5,
  });

  let estabilidad = 0.5; // Default para pocas sesiones
  if (sesionesRecientes.length >= 3) {
    const scores = sesionesRecientes
      .filter(s => s.metadata && typeof (s.metadata as Record<string, unknown>).comprensionScore === 'number')
      .map(s => (s.metadata as Record<string, unknown>).comprensionScore as number);
    if (scores.length >= 2) {
      const varianza = scores.reduce((sum, s) => {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        return sum + Math.pow(s - mean, 2);
      }, 0) / scores.length;
      estabilidad = Math.max(0, 1 - varianza * 4);
    }
  }

  // Sprint 4: Buscar si hubo ajuste manual en esta sesion
  const ajusteManual = await db.query.manualAdjustments.findFirst({
    where: and(
      eq(manualAdjustments.sessionId, datos.sessionId),
      eq(manualAdjustments.studentId, datos.studentId),
    ),
  });

  // Calcular modificador por ajuste manual
  let modificadorManual = 0;
  let ajusteManualTipo: 'mas_facil' | 'mas_desafiante' | null = null;

  if (ajusteManual) {
    ajusteManualTipo = ajusteManual.tipo as 'mas_facil' | 'mas_desafiante';
    if (ajusteManualTipo === 'mas_facil') {
      // Si pidio "mas facil", penalizar score un 10% (senal de que el nivel era alto)
      modificadorManual = -0.10;
    } else if (ajusteManualTipo === 'mas_desafiante' && datos.comprensionScore >= 0.75) {
      // Si pidio "mas desafiante" y acerto >= 75%, bonificar un 10%
      modificadorManual = 0.10;
    }
  }

  const sessionScoreBase = calcularSessionScore({
    comprension: datos.comprensionScore,
    ritmoNormalizado,
    estabilidad,
  });

  // Aplicar modificador manual al score
  const sessionScore = Math.max(0, Math.min(1,
    Math.round((sessionScoreBase + modificadorManual) * 100) / 100
  ));

  // Determinar direccion candidata usando session_score compuesto (no comprension cruda)
  const direccionCandidata: DireccionAjuste = determinarAjuste(sessionScore);

  // Logica de sesiones consecutivas para evitar cambios bruscos de nivel.
  // Subir: requiere 3 sesiones consecutivas con score >= 0.80
  // Bajar: requiere 2 sesiones consecutivas con score < 0.60
  let direccion: DireccionAjuste = direccionCandidata;

  if (direccionCandidata === 'subir') {
    const scoresRecientes = sesionesRecientes
      .filter(s => s.metadata && typeof (s.metadata as Record<string, unknown>).comprensionScore === 'number')
      .slice(0, 2) // las 2 sesiones anteriores (la actual sera la 3ra)
      .map(s => {
        const meta = s.metadata as Record<string, unknown>;
        const comp = meta.comprensionScore as number;
        // Estimar sessionScore simplificado de sesiones previas usando comprension como proxy
        return comp;
      });
    // Necesitamos 2 sesiones previas con alta comprension + la actual = 3 consecutivas
    const sesionesAltasPrevias = scoresRecientes.filter(sc => sc >= 0.80).length;
    if (sesionesAltasPrevias < 2) {
      direccion = 'mantener'; // No hay suficientes sesiones consecutivas buenas
    }
  }

  if (direccionCandidata === 'bajar') {
    const scoresRecientes = sesionesRecientes
      .filter(s => s.metadata && typeof (s.metadata as Record<string, unknown>).comprensionScore === 'number')
      .slice(0, 1) // la sesion anterior (la actual sera la 2da)
      .map(s => {
        const meta = s.metadata as Record<string, unknown>;
        return meta.comprensionScore as number;
      });
    // Necesitamos 1 sesion previa con baja comprension + la actual = 2 consecutivas
    const sesionBajaPrevias = scoresRecientes.filter(sc => sc < 0.60).length;
    if (sesionBajaPrevias < 1) {
      direccion = 'mantener'; // Solo 1 mala sesion, no bajar aun
    }
  }

  // Clamp nivel a [1, 4] (solo hay configs de nivel 1-4)
  let nivelNuevo = nivelAnterior;
  if (direccion === 'subir') nivelNuevo = Math.min(nivelAnterior + 0.5, 4);
  if (direccion === 'bajar') nivelNuevo = Math.max(nivelAnterior - 0.5, 1);

  const scorePct = Math.round(sessionScore * 100);
  const RAZONES: Record<DireccionAjuste, string> = {
    subir: `Score ${scorePct}% (>=80%) en 3 sesiones consecutivas. Subimos dificultad.`,
    mantener: `Score ${scorePct}% (60-79%). Mantenemos nivel actual.`,
    bajar: `Score ${scorePct}% (<60%) en 2 sesiones consecutivas. Bajamos dificultad para consolidar.`,
  };

  const razonFinal = ajusteManualTipo
    ? `${RAZONES[direccion]} (Ajuste manual: ${ajusteManualTipo}, modificador: ${modificadorManual > 0 ? '+' : ''}${Math.round(modificadorManual * 100)}%)`
    : RAZONES[direccion];

  // Registrar ajuste con trazabilidad
  await db.insert(difficultyAdjustments).values({
    studentId: datos.studentId,
    sessionId: datos.sessionId,
    nivelAnterior,
    nivelNuevo,
    direccion,
    razon: razonFinal,
    evidencia: {
      comprensionScore: datos.comprensionScore,
      ritmoNormalizado: Math.round(ritmoNormalizado * 100) / 100,
      estabilidad: Math.round(estabilidad * 100) / 100,
      sessionScore,
      ajusteManual: ajusteManualTipo,
      modificadorManual: modificadorManual !== 0 ? modificadorManual : undefined,
    },
  });

  // Actualizar nivel del estudiante
  if (nivelNuevo !== nivelAnterior) {
    await db
      .update(students)
      .set({
        nivelLectura: nivelNuevo,
        actualizadoEn: new Date(),
      })
      .where(eq(students.id, datos.studentId));
  }

  return {
    ok: true,
    sessionScore,
    direccion,
    nivelAnterior,
    nivelNuevo,
    razon: RAZONES[direccion],
  };
}
