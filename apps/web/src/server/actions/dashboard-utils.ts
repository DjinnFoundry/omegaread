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
