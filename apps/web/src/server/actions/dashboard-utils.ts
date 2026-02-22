/**
 * Funciones puras de calculo para dashboards.
 * Separadas de dashboard-actions.ts porque 'use server' solo permite exports async.
 * Tests importan directamente de este archivo.
 */

import type { DashboardNinoData, DashboardPadreData } from './dashboard-actions';

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
