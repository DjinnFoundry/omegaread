/**
 * Banco de micro-preguntas para enriquecer el perfil del nino en el tiempo.
 * Se muestran de forma dosificada para evitar fatiga.
 */

export interface MicroPreguntaPerfil {
  id: string;
  categoria: 'interes' | 'fortaleza' | 'reto' | 'contexto';
  pregunta: string;
  opciones: string[];
}

export const MICRO_PREGUNTAS_PERFIL: MicroPreguntaPerfil[] = [
  {
    id: 'interes-nuevo-mes',
    categoria: 'interes',
    pregunta: 'Que tema le esta enganchando mas estas semanas?',
    opciones: ['Espacio', 'Animales', 'Historia', 'Inventos', 'Cuerpo humano', 'Otro'],
  },
  {
    id: 'formato-favorito',
    categoria: 'interes',
    pregunta: 'Que tipo de historia le gusta mas?',
    opciones: ['Aventura', 'Humor', 'Misterio', 'Personajes reales', 'Experimentos', 'Mezcla'],
  },
  {
    id: 'reto-actual',
    categoria: 'reto',
    pregunta: 'Que le cuesta mas ahora mismo al leer?',
    opciones: ['Mantener atencion', 'Palabras nuevas', 'Inferir', 'Resumir', 'Nada en especial'],
  },
  {
    id: 'fortaleza-actual',
    categoria: 'fortaleza',
    pregunta: 'En que notas que ha mejorado recientemente?',
    opciones: ['Lee mas fluido', 'Entiende mejor', 'Pregunta mas', 'Recuerda mejor', 'Tiene mas confianza'],
  },
  {
    id: 'contexto-motivador',
    categoria: 'contexto',
    pregunta: 'Que suele motivarle mas para empezar a leer?',
    opciones: ['Personajes favoritos', 'Tema concreto', 'Leer en familia', 'Juego/reto', 'Escuchar y luego leer'],
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Selecciona una pregunta activa semialeatoria:
 * - rota cada 3 dias
 * - evita preguntas ya respondidas
 */
export function seleccionarPreguntaPerfilActiva(params: {
  studentId: string;
  preguntasRespondidas: string[];
  now?: Date;
}): MicroPreguntaPerfil | null {
  const { studentId, preguntasRespondidas } = params;
  const now = params.now ?? new Date();
  const pendientes = MICRO_PREGUNTAS_PERFIL.filter(
    (p) => !preguntasRespondidas.includes(p.id),
  );
  if (pendientes.length === 0) return null;

  const bucket3dias = Math.floor(now.getTime() / (1000 * 60 * 60 * 24 * 3));
  const seed = hashString(`${studentId}:${bucket3dias}`);
  const idx = seed % pendientes.length;
  return pendientes[idx] ?? pendientes[0] ?? null;
}

export function crearHechoDesdeMicroRespuesta(
  preguntaId: string,
  respuesta: string,
): { texto: string; categoria: MicroPreguntaPerfil['categoria'] } | null {
  const pregunta = MICRO_PREGUNTAS_PERFIL.find((p) => p.id === preguntaId);
  if (!pregunta) return null;

  const plantillas: Record<string, string> = {
    'interes-nuevo-mes': `Ultimamente se interesa especialmente por: ${respuesta}.`,
    'formato-favorito': `Prefiere historias de estilo: ${respuesta}.`,
    'reto-actual': `Reto actual detectado por la familia: ${respuesta}.`,
    'fortaleza-actual': `Fortaleza reciente observada: ${respuesta}.`,
    'contexto-motivador': `Suele motivarse mas cuando: ${respuesta}.`,
  };

  return {
    texto: plantillas[preguntaId] ?? `${pregunta.pregunta} Respuesta: ${respuesta}.`,
    categoria: pregunta.categoria,
  };
}
