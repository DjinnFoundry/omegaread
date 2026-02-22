'use server';

/**
 * Server Actions para gestion de estudiantes (ninos).
 * TODAS verifican autenticacion y ownership.
 */
import { getDb } from '@/server/db';
import { students, sessions, achievements, skillProgress, eq, desc, and } from '@omegaread/db';
import { requireAuth } from '../auth';
import { calcularEdad } from '@/lib/utils/fecha';

function nivelPorEdad(edad: number): number {
  if (edad <= 4) return 1.0;
  if (edad <= 5) return 1.4;
  if (edad <= 6) return 2.0;
  if (edad <= 7) return 2.6;
  if (edad <= 8) return 3.2;
  return 3.6;
}

/** Crear perfil de nino */
export async function crearEstudiante(formData: FormData) {
  const db = await getDb();
  const padre = await requireAuth();

  const nombre = formData.get('nombre') as string;
  const fechaNacStr = formData.get('fechaNacimiento') as string;

  if (!nombre || !fechaNacStr) {
    return { ok: false, error: 'Nombre y fecha de nacimiento son obligatorios' };
  }

  const fechaNac = new Date(fechaNacStr);
  const edad = calcularEdad(fechaNac);
  if (edad < 3 || edad > 10) {
    return { ok: false, error: 'La edad debe estar entre 3 y 10 anos' };
  }

  const [estudiante] = await db
    .insert(students)
    .values({
      parentId: padre.id,
      nombre: nombre.trim(),
      fechaNacimiento: fechaNac,
      nivelLectura: nivelPorEdad(edad),
      baselineCompletado: true,
      baselineConfianza: 'bajo',
    })
    .returning();

  return { ok: true, estudiante };
}

/** Obtener estudiantes del padre actual (sin campos sensibles) */
export async function obtenerEstudiantes() {
  const db = await getDb();
  const padre = await requireAuth();
  const resultados = await db.query.students.findMany({
    where: eq(students.parentId, padre.id),
    orderBy: [students.creadoEn],
    columns: {
      id: true,
      nombre: true,
      fechaNacimiento: true,
      idioma: true,
      dialecto: true,
      curso: true,
      nivelLectura: true,
      comprensionScore: true,
      baselineCompletado: true,
      baselineConfianza: true,
      perfilCompleto: true,
      intereses: true,
      creadoEn: true,
      actualizadoEn: true,
    },
  });

  return resultados;
}

/** Obtener un estudiante por ID (verificando pertenencia al padre) */
export async function obtenerEstudiante(studentId: string) {
  const db = await getDb();
  const padre = await requireAuth();

  return db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });
}

/** Obtener resumen de progreso para dashboard de padre */
export async function obtenerResumenProgreso(studentId: string) {
  const db = await getDb();
  const padre = await requireAuth();

  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) return null;

  const habilidades = await db.query.skillProgress.findMany({
    where: eq(skillProgress.studentId, studentId),
    orderBy: [skillProgress.categoria, skillProgress.skillId],
  });

  const todasSesiones = await db.query.sessions.findMany({
    where: eq(sessions.studentId, studentId),
    orderBy: [desc(sessions.iniciadaEn)],
  });

  const logros = await db.query.achievements.findMany({
    where: eq(achievements.studentId, studentId),
    orderBy: [desc(achievements.ganadoEn)],
  });

  // Estadisticas de hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const sesionesHoy = todasSesiones.filter(
    (s) => new Date(s.iniciadaEn) >= hoy
  );
  const tiempoHoyMin = sesionesHoy.reduce(
    (acc, s) => acc + (s.duracionSegundos ?? 0),
    0
  ) / 60;

  const racha = calcularRacha(todasSesiones);

  // Actividad del mes actual (dia -> num sesiones) para heatmap tipo GitHub
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const actividadMes: Record<string, number> = {};
  for (const s of todasSesiones) {
    const fechaSesion = new Date(s.iniciadaEn);
    if (fechaSesion >= inicioMes) {
      const key = fechaSesion.toISOString().slice(0, 10);
      actividadMes[key] = (actividadMes[key] ?? 0) + 1;
    }
  }

  // Sugerencia personalizada de lectura
  const SUGERENCIAS_LECTURA = [
    'Lean juntos un cuento corto antes de dormir. Pregunten: "Que crees que pasara despues?"',
    'Busquen carteles y letreros en la calle. El nino puede leer las palabras que reconozca.',
    'Inventen juntos un final alternativo para el ultimo cuento que leyeron.',
    'Pidan al nino que les cuente con sus palabras lo que leyo hoy. Escuchen sin corregir.',
    'Visiten la biblioteca o libreria y dejen que elija un libro que le llame la atencion.',
    'Lean una receta juntos y cocinen algo sencillo siguiendo los pasos.',
    'Jueguen a buscar palabras que rimen en un cuento o cancion.',
    'Escriban juntos una carta o mensaje para un familiar o amigo.',
  ];
  const idxSugerencia = Math.floor(Date.now() / 86400000) % SUGERENCIAS_LECTURA.length;
  const sugerenciaOffline = SUGERENCIAS_LECTURA[idxSugerencia];

  return {
    estudiante,
    habilidades,
    sesionesHoy: sesionesHoy.length,
    tiempoHoyMin: Math.round(tiempoHoyMin),
    totalEstrellas: todasSesiones.reduce((acc, s) => acc + s.estrellasGanadas, 0),
    stickers: logros.filter((l) => l.tipo === 'sticker'),
    racha,
    sesionesRecientes: todasSesiones.slice(0, 10),
    actividadMes,
    sugerenciaOffline,
    totalSesiones: todasSesiones.length,
  };
}

/** Calcula dias consecutivos con al menos 1 sesion */
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
