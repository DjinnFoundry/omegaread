/**
 * Funciones puras de calculo para dashboards.
 * Separadas de dashboard-actions.ts porque 'use server' solo permite exports async.
 * Tests importan directamente de este archivo.
 */

import type { DashboardNinoData, DashboardPadreData } from './dashboard-actions';
import type { WpmTrendResult } from '@/lib/wpm';

// Tipos minimos para las rows de la DB (evita dependencia directa del ORM)
export interface SessionRow {
  id: string;
  iniciadaEn: Date;
  duracionSegundos: number | null;
  storyId: string | null;
  [key: string]: unknown;
}

export interface ResponseRow {
  sessionId: string;
  tipoEjercicio: string;
  correcta: boolean;
  [key: string]: unknown;
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

/** Desglose por tipo de pregunta (sin elo, se agrega en dashboard-actions) */
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

// ─────────────────────────────────────────────
// RECOMENDACIONES
// ─────────────────────────────────────────────

type Rec = DashboardPadreData['recomendaciones'][number];
type RecWithPriority = Rec & { prioridad: 'high' | 'medium' | 'low' };

export interface RecomendacionesOpciones {
  nivelActual?: number;
  wpmEvolucion?: WpmTrendResult;
  historialSesiones?: Array<{ scorePorcentaje: number; nivel: number; duracionMin: number }>;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// --- Individual heuristic functions ---

function heuristicTipoDebil(
  desglose: Record<string, { total: number; aciertos: number; porcentaje: number }>,
): RecWithPriority | null {
  const tiposOrdenados = Object.entries(desglose)
    .filter(([, v]) => v.total >= 3)
    .sort(([, a], [, b]) => a.porcentaje - b.porcentaje);

  if (tiposOrdenados.length === 0) return null;

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
    return { tipo: tipoDebil, ...consejos[tipoDebil], prioridad: 'high' };
  }
  return null;
}

function heuristicTopicDebil(
  topicsComp: Array<{ topicSlug: string; nombre: string; scoreMedio: number }>,
): RecWithPriority | null {
  const topicDebil = topicsComp.filter(t => t.scoreMedio < 60).pop();
  if (!topicDebil) return null;

  return {
    tipo: 'topic',
    mensaje: `Explorar mas sobre "${topicDebil.nombre}" fuera de la app`,
    detalle: `El score en ${topicDebil.nombre} es ${topicDebil.scoreMedio}%. Busquen libros, videos o actividades sobre este tema para que el nino gane familiaridad y vocabulario especifico.`,
    prioridad: 'medium',
  };
}

function heuristicFrecuencia(sesiones: SessionRow[]): RecWithPriority | null {
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const sesionesUltimaSemana = sesiones.filter(s => new Date(s.iniciadaEn) >= hace7);

  if (sesionesUltimaSemana.length < 3) {
    return {
      tipo: 'frecuencia',
      mensaje: 'Establecer una rutina diaria de lectura',
      detalle: 'La practica frecuente es clave. Intenten leer al menos 10 minutos al dia, idealmente a la misma hora (antes de dormir funciona muy bien).',
      prioridad: 'medium',
    };
  }
  return null;
}

function heuristicRachaPositiva(
  sesiones: SessionRow[],
  historial?: Array<{ scorePorcentaje: number }>,
): RecWithPriority | null {
  if (!historial || historial.length < 5) return null;

  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const sesionesUltimaSemana = sesiones.filter(s => new Date(s.iniciadaEn) >= hace7);
  if (sesionesUltimaSemana.length < 5) return null;

  const avgScore = historial.slice(0, 7).reduce((a, s) => a + s.scorePorcentaje, 0) / Math.min(historial.length, 7);
  if (avgScore < 75) return null;

  return {
    tipo: 'racha-positiva',
    mensaje: 'Excelente racha de lectura!',
    detalle: `Ha leido ${sesionesUltimaSemana.length} veces esta semana con un promedio de ${Math.round(avgScore)}%. Aprovechen este impulso para explorar temas nuevos o subir de nivel.`,
    prioridad: 'high',
  };
}

function heuristicComprensionBajando(
  historial?: Array<{ scorePorcentaje: number }>,
): RecWithPriority | null {
  if (!historial || historial.length < 6) return null;

  const ultimas3 = historial.slice(0, 3);
  const previas3 = historial.slice(3, 6);
  const avgReciente = ultimas3.reduce((a, s) => a + s.scorePorcentaje, 0) / 3;
  const avgPrevio = previas3.reduce((a, s) => a + s.scorePorcentaje, 0) / 3;

  if (avgPrevio - avgReciente >= 15) {
    return {
      tipo: 'comprension-bajando',
      mensaje: 'La comprension ha bajado en las ultimas sesiones',
      detalle: `El promedio reciente (${Math.round(avgReciente)}%) es menor que el anterior (${Math.round(avgPrevio)}%). Puede ser cansancio o un salto de dificultad. Prueben releer historias favoritas o bajar el nivel temporalmente.`,
      prioridad: 'high',
    };
  }
  return null;
}

function heuristicSesionesCortas(
  historial?: Array<{ duracionMin: number }>,
): RecWithPriority | null {
  if (!historial || historial.length < 5) return null;

  const ultimas5 = historial.slice(0, 5);
  const avgDuracion = ultimas5.reduce((a, s) => a + s.duracionMin, 0) / 5;

  // 120s = 2min
  if (avgDuracion < 2) {
    return {
      tipo: 'sesiones-cortas',
      mensaje: 'Las sesiones de lectura son muy cortas',
      detalle: `El promedio de las ultimas 5 sesiones es de ${Math.round(avgDuracion * 60)} segundos. Intenten crear un ambiente tranquilo y sin distracciones para que pueda concentrarse mas tiempo.`,
      prioridad: 'medium',
    };
  }
  return null;
}

function heuristicWpmBajando(wpm?: WpmTrendResult): RecWithPriority | null {
  if (!wpm || wpm.puntos.length < 3) return null;

  const last3 = wpm.puntos.slice(-3);
  const declining = last3[1].wpmSuavizado <= last3[0].wpmSuavizado * 0.95
    && last3[2].wpmSuavizado <= last3[1].wpmSuavizado * 0.95;

  if (declining) {
    return {
      tipo: 'wpm-bajando',
      mensaje: 'La velocidad de lectura esta bajando',
      detalle: 'La velocidad ha ido disminuyendo en las ultimas sesiones. Esto puede ser normal si subio de nivel recientemente. Si persiste, prueben con textos mas sencillos para recuperar fluidez.',
      prioridad: 'medium',
    };
  }
  return null;
}

function heuristicWpmMejorando(wpm?: WpmTrendResult): RecWithPriority | null {
  if (!wpm || wpm.puntos.length < 3) return null;

  const last3 = wpm.puntos.slice(-3);
  const rising = last3[1].wpmSuavizado >= last3[0].wpmSuavizado * 1.05
    && last3[2].wpmSuavizado >= last3[1].wpmSuavizado * 1.05;

  if (rising) {
    return {
      tipo: 'wpm-mejorando',
      mensaje: 'La velocidad de lectura esta mejorando!',
      detalle: 'La fluidez lectora ha mejorado consistentemente. Es un gran indicador de progreso. Sigan con la rutina actual, esta funcionando muy bien.',
      prioridad: 'medium',
    };
  }
  return null;
}

function heuristicNivelEstancado(
  historial?: Array<{ nivel: number }>,
): RecWithPriority | null {
  if (!historial || historial.length < 8) return null;

  const ultimas8 = historial.slice(0, 8);
  const mismoNivel = ultimas8.every(s => s.nivel === ultimas8[0].nivel);

  if (mismoNivel) {
    return {
      tipo: 'nivel-estancado',
      mensaje: 'Lleva varias sesiones en el mismo nivel',
      detalle: `Las ultimas ${ultimas8.length} sesiones han sido en nivel ${ultimas8[0].nivel}. Pueden reforzar los tipos de pregunta mas debiles para desbloquear el siguiente nivel.`,
      prioridad: 'low',
    };
  }
  return null;
}

function heuristicVariedadTemas(
  topicsComp: Array<{ topicSlug: string }>,
  sesiones: SessionRow[],
): RecWithPriority | null {
  if (sesiones.length < 5 || topicsComp.length === 0) return null;

  const uniqueTopics = new Set(topicsComp.map(t => t.topicSlug));
  if (uniqueTopics.size <= 2) {
    return {
      tipo: 'variedad-temas',
      mensaje: 'Explorar temas mas variados',
      detalle: `Solo se han explorado ${uniqueTopics.size} tema(s) diferentes. Probar temas nuevos amplia vocabulario y conocimiento general. Dejen que elija algo que le llame la atencion!`,
      prioridad: 'low',
    };
  }
  return null;
}

/** Recomendaciones offline basadas en datos reales */
export function generarRecomendaciones(
  desglose: Record<string, { total: number; aciertos: number; porcentaje: number }>,
  topicsComp: Array<{ topicSlug: string; nombre: string; scoreMedio: number }>,
  sesiones: SessionRow[],
  opciones?: RecomendacionesOpciones,
): DashboardPadreData['recomendaciones'] {
  const historial = opciones?.historialSesiones;
  const wpm = opciones?.wpmEvolucion;

  // Collect all candidate recommendations
  const candidates: RecWithPriority[] = [];

  const tipoDebil = heuristicTipoDebil(desglose);
  if (tipoDebil) candidates.push(tipoDebil);

  const topicDebil = heuristicTopicDebil(topicsComp);
  if (topicDebil) candidates.push(topicDebil);

  const frecuencia = heuristicFrecuencia(sesiones);
  if (frecuencia) candidates.push(frecuencia);

  const rachaPos = heuristicRachaPositiva(sesiones, historial);
  if (rachaPos) candidates.push(rachaPos);

  const compBajando = heuristicComprensionBajando(historial);
  if (compBajando) candidates.push(compBajando);

  const sesCortas = heuristicSesionesCortas(historial);
  if (sesCortas) candidates.push(sesCortas);

  const wpmBaj = heuristicWpmBajando(wpm);
  if (wpmBaj) candidates.push(wpmBaj);

  const wpmMej = heuristicWpmMejorando(wpm);
  if (wpmMej) candidates.push(wpmMej);

  const nivelEst = heuristicNivelEstancado(historial);
  if (nivelEst) candidates.push(nivelEst);

  const variedad = heuristicVariedadTemas(topicsComp, sesiones);
  if (variedad) candidates.push(variedad);

  // Mutual exclusions
  const tipos = new Set(candidates.map(c => c.tipo));
  const filtered = candidates.filter(c => {
    if (c.tipo === 'wpm-mejorando' && tipos.has('wpm-bajando')) return false;
    if (c.tipo === 'racha-positiva' && tipos.has('comprension-bajando')) return false;
    if (c.tipo === 'comprension-bajando' && tipos.has('racha-positiva')) return false;
    return true;
  });

  // Sort by priority, then return top 6
  filtered.sort((a, b) => PRIORITY_ORDER[a.prioridad] - PRIORITY_ORDER[b.prioridad]);

  return filtered.slice(0, 6).map(({ prioridad: _, ...rec }) => rec);
}

// ─────────────────────────────────────────────
// NORMATIVA ELO (ESTIMADA)
// ─────────────────────────────────────────────

type NormaCurso = {
  curso: string;
  edadRef: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

const NORMAS_ELO: NormaCurso[] = [
  { curso: 'Infantil 5', edadRef: 5, p10: 740, p25: 820, p50: 920, p75: 1000, p90: 1080 },
  { curso: '1o Primaria', edadRef: 6, p10: 820, p25: 900, p50: 1000, p75: 1090, p90: 1180 },
  { curso: '2o Primaria', edadRef: 7, p10: 900, p25: 980, p50: 1080, p75: 1170, p90: 1260 },
  { curso: '3o Primaria', edadRef: 8, p10: 980, p25: 1060, p50: 1160, p75: 1250, p90: 1340 },
  { curso: '4o Primaria', edadRef: 9, p10: 1060, p25: 1140, p50: 1240, p75: 1330, p90: 1420 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function interpolarPercentil(elo: number, norma: NormaCurso): number {
  const tramos = [
    { eloA: norma.p10 - 120, pA: 1, eloB: norma.p10, pB: 10 },
    { eloA: norma.p10, pA: 10, eloB: norma.p25, pB: 25 },
    { eloA: norma.p25, pA: 25, eloB: norma.p50, pB: 50 },
    { eloA: norma.p50, pA: 50, eloB: norma.p75, pB: 75 },
    { eloA: norma.p75, pA: 75, eloB: norma.p90, pB: 90 },
    { eloA: norma.p90, pA: 90, eloB: norma.p90 + 120, pB: 99 },
  ];

  for (const t of tramos) {
    if (elo <= t.eloB) {
      const ratio = (elo - t.eloA) / Math.max(1, (t.eloB - t.eloA));
      const p = t.pA + (clamp(ratio, 0, 1) * (t.pB - t.pA));
      return Math.round(clamp(p, 1, 99));
    }
  }
  return 99;
}

function cursoEsperadoPorEdad(edadAnos: number): NormaCurso {
  return NORMAS_ELO.reduce((best, current) => {
    const diffBest = Math.abs(best.edadRef - edadAnos);
    const diffCurrent = Math.abs(current.edadRef - edadAnos);
    return diffCurrent < diffBest ? current : best;
  });
}

function cursoEquivalentePorElo(elo: number): NormaCurso {
  return NORMAS_ELO.reduce((best, current) => {
    const diffBest = Math.abs(best.p50 - elo);
    const diffCurrent = Math.abs(current.p50 - elo);
    return diffCurrent < diffBest ? current : best;
  });
}

function estadoDesdePercentil(percentil: number): {
  estado: string;
  necesitaApoyo: boolean;
} {
  if (percentil < 25) {
    return { estado: 'Por debajo del rango esperado', necesitaApoyo: true };
  }
  if (percentil < 40) {
    return { estado: 'Algo por debajo, requiere refuerzo', necesitaApoyo: true };
  }
  if (percentil <= 75) {
    return { estado: 'En rango esperado', necesitaApoyo: false };
  }
  if (percentil <= 90) {
    return { estado: 'Por encima del rango esperado', necesitaApoyo: false };
  }
  return { estado: 'Muy por encima del rango esperado', necesitaApoyo: false };
}

function recomendacionCatchup(tipo: string, percentil: number): string {
  if (percentil >= 40) {
    return 'Mantener rutina de lectura diaria y conversacion breve sobre lo leido.';
  }

  const recomendacionesTipo: Record<string, string> = {
    literal: 'Hacer pausas cada parrafo y preguntar que paso exactamente, volviendo al texto si hace falta.',
    inferencia: 'Practicar preguntas de por que/que pasara despues para entrenar deduccion con pistas del texto.',
    vocabulario: 'Crear un mini-glosario semanal con 5 palabras nuevas y usar cada palabra en una frase.',
    resumen: 'Al terminar, pedir un resumen en 3 pasos (inicio, nudo y final) con sus propias palabras.',
  };

  return recomendacionesTipo[tipo] ?? 'Refuerzo guiado 10-15 minutos al dia con relectura y preguntas cortas.';
}

export function construirNormativaLectura(params: {
  edadAnos: number;
  eloGlobal: number;
  eloPorTipo: Record<string, number>;
}): DashboardPadreData['normativa'] {
  const cursoEsperado = cursoEsperadoPorEdad(params.edadAnos);
  const cursoEqGlobal = cursoEquivalentePorElo(params.eloGlobal);
  const percentilGlobal = interpolarPercentil(params.eloGlobal, cursoEsperado);
  const estadoGlobal = estadoDesdePercentil(percentilGlobal);

  const porTipo: DashboardPadreData['normativa']['porTipo'] = {};
  for (const [tipo, elo] of Object.entries(params.eloPorTipo)) {
    const percentil = interpolarPercentil(elo, cursoEsperado);
    const estado = estadoDesdePercentil(percentil);
    porTipo[tipo] = {
      curso: cursoEsperado.curso,
      percentil,
      estado: estado.estado,
      necesitaApoyo: estado.necesitaApoyo,
      recomendacion: recomendacionCatchup(tipo, percentil),
    };
  }

  return {
    referenciaEdad: {
      edadAnos: params.edadAnos,
      cursoEsperado: cursoEsperado.curso,
    },
    equivalenciaGlobal: {
      curso: cursoEqGlobal.curso,
      percentil: percentilGlobal,
      estado: estadoGlobal.estado,
      necesitaApoyo: estadoGlobal.necesitaApoyo,
      recomendacion: recomendacionCatchup('global', percentilGlobal),
    },
    porTipo,
    tabla: NORMAS_ELO.map(n => ({
      curso: n.curso,
      p10: n.p10,
      p25: n.p25,
      p50: n.p50,
      p75: n.p75,
      p90: n.p90,
    })),
  };
}
