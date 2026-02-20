'use server';

/**
 * Server Actions para gestión de estudiantes (niños).
 *
 * Funciones de padre: crear estudiante, obtener lista, obtener resumen.
 * TODAS verifican autenticación y ownership.
 */
import { db, students, sessions, achievements, skillProgress } from '@omegaread/db';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requireStudentOwnership } from '../auth';
import { calcularEdad } from '@/lib/utils/fecha';
import type { DiagnosticoNivel } from '@omegaread/db/schema';

/** Crear perfil de niño */
export async function crearEstudiante(formData: FormData) {
  const padre = await requireAuth();

  const nombre = formData.get('nombre') as string;
  const fechaNacStr = formData.get('fechaNacimiento') as string;
  const mascotaTipo = (formData.get('mascotaTipo') as string) || 'gato';
  const mascotaNombre = (formData.get('mascotaNombre') as string) || 'Luna';

  if (!nombre || !fechaNacStr) {
    return { ok: false, error: 'Nombre y fecha de nacimiento son obligatorios' };
  }

  // Validar edad (3-10 años)
  const fechaNac = new Date(fechaNacStr);
  const edad = calcularEdad(fechaNac);
  if (edad < 3 || edad > 10) {
    return { ok: false, error: 'La edad debe estar entre 3 y 10 años' };
  }

  const [estudiante] = await db
    .insert(students)
    .values({
      parentId: padre.id,
      nombre: nombre.trim(),
      fechaNacimiento: fechaNac,
      mascotaTipo,
      mascotaNombre: mascotaNombre.trim(),
    })
    .returning();

  return { ok: true, estudiante };
}

/** Obtener estudiantes del padre actual */
export async function obtenerEstudiantes() {
  const padre = await requireAuth();

  return db.query.students.findMany({
    where: eq(students.parentId, padre.id),
    orderBy: [students.creadoEn],
  });
}

/** Obtener un estudiante por ID (verificando pertenencia al padre) */
export async function obtenerEstudiante(studentId: string) {
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });

  return estudiante;
}

/** Guardar resultado de diagnóstico invisible */
export async function guardarDiagnostico(studentId: string, resultado: DiagnosticoNivel) {
  // Verificar ownership
  await requireStudentOwnership(studentId);

  await db
    .update(students)
    .set({
      nivelDiagnostico: resultado,
      diagnosticoCompletado: true,
      actualizadoEn: new Date(),
    })
    .where(eq(students.id, studentId));

  return { ok: true };
}

/** Obtener resumen de progreso para dashboard de padre */
export async function obtenerResumenProgreso(studentId: string) {
  const padre = await requireAuth();

  // Verificar que el estudiante pertenece al padre
  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) return null;

  // Obtener progreso de habilidades
  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, studentId),
    orderBy: [skillProgress.categoria, skillProgress.skillId],
  });

  // Todas las sesiones (sin limit para total de estrellas correcto)
  const todasSesiones = await db.query.sessions.findMany({
    where: eq(sessions.studentId, studentId),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  // Logros / stickers
  const logros = await db.query.achievements.findMany({
    where: eq(achievements.studentId, studentId),
    orderBy: [desc(achievements.ganadoEn)],
  });

  // Estadísticas de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const sesionesHoy = todasSesiones.filter(
    (s) => new Date(s.iniciadaEn) >= hoy
  );
  const tiempoHoyMin = sesionesHoy.reduce(
    (acc, s) => acc + (s.duracionSegundos ?? 0),
    0
  ) / 60;

  // Calcular racha
  const racha = calcularRacha(todasSesiones);

  // Vocales dominadas
  const vocalesDominadas = habilidades
    .filter((h) => h.categoria === 'vocales' && h.dominada)
    .map((h) => h.skillId.replace('vocal-', '').toUpperCase());

  // Próxima meta: primera vocal no dominada
  const ORDEN_VOCALES = ['A', 'E', 'I', 'O', 'U'];
  const proximaMeta = ORDEN_VOCALES.find((v) => !vocalesDominadas.includes(v));

  // Días de uso esta semana (L-D)
  const inicioSemana = new Date();
  const diaSemana = inicioSemana.getDay(); // 0=dom, 1=lun...
  const diasDesdelunes = diaSemana === 0 ? 6 : diaSemana - 1;
  inicioSemana.setDate(inicioSemana.getDate() - diasDesdelunes);
  inicioSemana.setHours(0, 0, 0, 0);

  const diasUsoSemana: boolean[] = Array(7).fill(false); // [L, M, X, J, V, S, D]
  for (const s of todasSesiones) {
    const fechaSesion = new Date(s.iniciadaEn);
    if (fechaSesion >= inicioSemana) {
      const dia = fechaSesion.getDay(); // 0=dom, 1=lun...
      const idx = dia === 0 ? 6 : dia - 1; // Convertir a L=0, M=1... D=6
      diasUsoSemana[idx] = true;
    }
  }

  // Sugerencia personalizada basada en progreso (pool variado)
  const vocalParaSugerencia = proximaMeta ?? vocalesDominadas[vocalesDominadas.length - 1] ?? 'A';
  const SUGERENCIAS_POOL: Array<(vocal: string) => string> = [
    (v) => `Busquen objetos en casa que empiecen con la ${v}. ¡A ver cuantos encuentran!`,
    (v) => `Dibujen juntos la letra ${v} bien grande con crayones de colores.`,
    (v) => `Inventen una cancion donde todas las palabras empiecen con ${v}.`,
    (v) => `Con plastilina, moldeen la forma de la ${v}. ¡Pueden decorarla!`,
    (v) => `Lean un cuento y pidan al nino que diga "¡${v}!" cada vez que escuche esa vocal.`,
    (v) => `Jueguen "Veo veo" buscando cosas que tengan la vocal ${v} en su nombre.`,
    (v) => `Tracen la ${v} con el dedo en la espalda del otro. ¡A ver si adivinan!`,
    (v) => `Aplaudan cada vez que escuchen la vocal ${v} en una conversacion. ¡Es muy divertido!`,
  ];
  const idxSugerencia = Math.floor(Date.now() / 86400000) % SUGERENCIAS_POOL.length;
  const sugerenciaOffline = SUGERENCIAS_POOL[idxSugerencia](vocalParaSugerencia);

  return {
    estudiante,
    habilidades,
    sesionesHoy: sesionesHoy.length,
    tiempoHoyMin: Math.round(tiempoHoyMin),
    totalEstrellas: todasSesiones.reduce((acc, s) => acc + s.estrellasGanadas, 0),
    stickers: logros.filter((l) => l.tipo === 'sticker'),
    vocalesDominadas,
    racha,
    sesionesRecientes: todasSesiones.slice(0, 10),
    proximaMeta: proximaMeta ? `aprender la letra ${proximaMeta}` : null,
    diasUsoSemana,
    sugerenciaOffline,
  };
}

/** Calcula días consecutivos con al menos 1 sesión */
function calcularRacha(sesiones: Array<{ iniciadaEn: Date }>): number {
  if (sesiones.length === 0) return 0;

  const dias = new Set(
    sesiones.map((s) => {
      const d = new Date(s.iniciadaEn);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let racha = 0;
  const hoy = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dias.has(key)) {
      racha++;
    } else if (i > 0) {
      break;
    }
  }

  return racha;
}
