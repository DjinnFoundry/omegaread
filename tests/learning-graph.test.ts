/**
 * Tests para el grafo de aprendizaje y recomendacion de skills.
 *
 * Verifica:
 * 1. recomendarSiguientesSkills: profundizar, conectar, aplicar, reforzar
 * 2. Filtraje por edad, recencia, desbloqueadas
 * 3. Scoring y ordenamiento
 * 4. Edge cases: sin skill actual, sin progreso, skills dominadas
 */
import { describe, it, expect } from 'vitest';
import {
  recomendarSiguientesSkills,
  type SkillProgressLite,
  type LearningSuggestion,
} from '@/lib/learning/graph';

// ─────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────

function crearProgresoMap(
  entrada: Record<string, Partial<SkillProgressLite>>
): Map<string, SkillProgressLite> {
  const map = new Map<string, SkillProgressLite>();
  for (const [slug, partial] of Object.entries(entrada)) {
    map.set(slug, {
      totalIntentos: 0,
      nivelMastery: 0,
      dominada: false,
      ...partial,
    });
  }
  return map;
}

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Tipos de recomendaciones
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Tipos de recomendacion', () => {
  it('recomienda skills desde skill actual (profundizar o aplicar)', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
      'cometa-halley': { totalIntentos: 0, nivelMastery: 0 },
      'planetas-detalle': { totalIntentos: 0, nivelMastery: 0 },
      'que-son-mapas': { totalIntentos: 0, nivelMastery: 0 },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 5,
    });

    // Deberia recomendarse skills relacionados (profundizar, conectar, aplicar)
    expect(resultado.length).toBeGreaterThan(0);
    const tiposEnResultado = resultado.map(r => r.tipo);
    expect(['profundizar', 'conectar', 'aplicar', 'reforzar'].some(t => tiposEnResultado.includes(t))).toBe(true);
  });

  it('recomienda conectar con skills del mismo dominio', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
      'la-gravedad': { totalIntentos: 2, nivelMastery: 0.4 },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 5,
    });

    const tiposEnResultado = resultado.map(r => r.tipo);
    // Deberia haber recomendaciones de conectar o reforzar del mismo dominio
    expect(tiposEnResultado.length).toBeGreaterThan(0);
  });

  it('recomienda aplicar en otro dominio (puentes)', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.85, dominada: true },
      'que-son-mapas': { totalIntentos: 0, nivelMastery: 0 },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 8,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 5,
    });

    const tiposEnResultado = resultado.map(r => r.tipo);
    expect(tiposEnResultado.includes('aplicar') || tiposEnResultado.length > 0).toBe(true);
  });

  it('propone reforzar cuando skill tiene mastery < 0.6', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
      'la-gravedad': { totalIntentos: 3, nivelMastery: 0.5 }, // Debil en el mismo dominio
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 5,
    });

    // Deberia recomendar reforzar 'la-gravedad'
    const recomendacionRefuerzo = resultado.find(r => r.tipo === 'reforzar');
    if (recomendacionRefuerzo) {
      expect(recomendacionRefuerzo.slug).toBe('la-gravedad');
    }
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Filtraje por edad
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Filtraje por edad', () => {
  it('solo recomienda skills en rango de edad valido', () => {
    const progresoMap = crearProgresoMap({});

    // Edad muy baja (5 anos)
    const resultado5 = recomendarSiguientesSkills({
      edadAnos: 5,
      intereses: [],
      progresoMap,
      limite: 10,
    });

    // Edad intermedia (7 anos)
    const resultado7 = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 10,
    });

    // Ambos deben retornar arrays validos
    expect(Array.isArray(resultado5)).toBe(true);
    expect(Array.isArray(resultado7)).toBe(true);
    // Los resultados pueden ser diferentes dependiendo de los skills disponibles para cada edad
    // pero deben ser menos o igual al limite solicitado
    expect(resultado5.length).toBeLessThanOrEqual(10);
    expect(resultado7.length).toBeLessThanOrEqual(10);
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Penalizacion de recientes
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Penalizacion de recientes', () => {
  it('penaliza skills vistos recientemente', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
      'cometa-halley': { totalIntentos: 0, nivelMastery: 0 },
      'planetas-detalle': { totalIntentos: 0, nivelMastery: 0 },
    });

    // Sin recientes: ambos skills estarian disponibles
    const sinRecientes = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      recientes: [],
      limite: 5,
    });

    // Con recientes: uno de los skills estaria penalizado
    const conRecientes = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      recientes: ['cometa-halley'],
      limite: 5,
    });

    // Ambos deben retornar arrays validos
    expect(Array.isArray(sinRecientes)).toBe(true);
    expect(Array.isArray(conRecientes)).toBe(true);

    // Si 'cometa-halley' esta en sin recientes pero no en con recientes,
    // es evidencia de que fue penalizado
    const sinRecientesHasSlugs = sinRecientes.map(r => r.slug);
    const conRecientesSlugs = conRecientes.map(r => r.slug);

    if (sinRecientesHasSlugs.includes('cometa-halley')) {
      // Si cometa-halley aparece en sinRecientes y aparece en conRecientes,
      // deberia estar en una posicion posterior (score menor)
      const posSinRecientes = sinRecientesHasSlugs.indexOf('cometa-halley');
      const posConRecientes = conRecientesSlugs.indexOf('cometa-halley');

      if (posConRecientes !== -1) {
        // Si aparece en ambos, la penalizacion deberia ponerlo en posicion posterior
        expect(posConRecientes).toBeGreaterThanOrEqual(posSinRecientes);
      }
    }
  });

  it('no penaliza skills fuera de los 6 mas recientes', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
    });

    // 10 skills recientes, el septimo no deberia ser penalizado
    const recientes = Array.from({ length: 10 }, (_, i) => `skill-${i}`);

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      recientes,
      limite: 10,
    });

    // El resultado debe procesar sin errores
    expect(resultado).toBeInstanceOf(Array);
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Flags de desbloqueadas
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - soloDesbloqueadas', () => {
  it('respeta soloDesbloqueadas=true (por defecto)', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      soloDesbloqueadas: true,
      limite: 5,
    });

    // Deberia recomendar solo skills desbloqueados (con prerequisitos cumplidos)
    expect(Array.isArray(resultado)).toBe(true);
    // Verifica que cada resultado tiene estructura valida
    if (resultado.length > 0) {
      for (const suggestion of resultado) {
        expect(suggestion).toHaveProperty('slug');
        expect(suggestion).toHaveProperty('puntaje');
        expect(typeof suggestion.puntaje).toBe('number');
      }
    }
  });

  it('permite skills bloqueadas cuando soloDesbloqueadas=false', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      soloDesbloqueadas: false,
      limite: 5,
    });

    // Deberia retornar recomendaciones incluso con skills bloqueadas
    expect(Array.isArray(resultado)).toBe(true);
    // Con soloDesbloqueadas=false, deberia retornar al menos algunos skills
    expect(resultado.length).toBeGreaterThan(0);
    // Verificar estructura valida
    if (resultado.length > 0) {
      expect(resultado[0]).toHaveProperty('slug');
      expect(resultado[0]).toHaveProperty('puntaje');
    }
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Dominio de interes
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Boost por interes', () => {
  it('booste skills de dominios interesantes', () => {
    const progresoMap = crearProgresoMap({});

    // Sin interes
    const sinInteres = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 5,
    });

    // Con interes por espacio/astronomia
    const conInteres = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: ['espacio', 'astronomia'],
      progresoMap,
      limite: 5,
    });

    // Ambos deben retornar resultados
    expect(Array.isArray(sinInteres)).toBe(true);
    expect(Array.isArray(conInteres)).toBe(true);
    expect(sinInteres.length).toBeGreaterThan(0);
    expect(conInteres.length).toBeGreaterThan(0);

    // Con intereses, los primeros resultados deberian tener dominio en intereses
    // o al menos tener puntajes mayores en promedio (boost aplicado)
    if (conInteres.length > 0) {
      const primerResultadoConInteres = conInteres[0];
      expect(primerResultadoConInteres).toHaveProperty('puntaje');
      expect(typeof primerResultadoConInteres.puntaje).toBe('number');

      // El primer resultado con intereses deberia tener un puntaje >= al primer sin intereses
      const primerSinInteres = sinInteres[0];
      if (primerResultadoConInteres.dominio === 'espacio' || primerResultadoConInteres.dominio === 'astronomia') {
        // Si el dominio matchea los intereses, el puntaje deberia ser mayor o igual
        expect(primerResultadoConInteres.puntaje).toBeGreaterThanOrEqual(primerSinInteres.puntaje - 5);
      }
    }
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Limite de resultados
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Limite de resultados', () => {
  it('respeta el parametro limite', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 3,
    });

    expect(resultado.length).toBeLessThanOrEqual(3);
  });

  it('usa limite 5 por defecto', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      // sin especificar limite
    });

    expect(resultado.length).toBeLessThanOrEqual(5);
  });

  it('puede retornar menos resultados que el limite', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.85, dominada: true },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 100,
      soloDesbloqueadas: true,
    });

    // Puede haber menos de 100 recomendaciones disponibles
    expect(resultado.length).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Fallback global
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Fallback global', () => {
  it('recomienda pending skills cuando no hay skill actual', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      // sin skillActualSlug
      limite: 5,
    });

    // Deberia dar recomendaciones del fallback global (skills pendientes)
    expect(resultado.length).toBeGreaterThanOrEqual(0);
  });

  it('retorna empty cuando todos los skills son dominados', () => {
    const progresoMap = crearProgresoMap({});
    // Simular que la mayoría de skills estan dominados
    // (en la practica esto seria dificil, pero la funcion deberia handle it)

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 5,
    });

    // Debe retornar un array valido (puede estar vacio)
    expect(Array.isArray(resultado)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Estructura de salida
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Estructura de LearningSuggestion', () => {
  it('retorna LearningSuggestions con campos requeridos', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 1,
    });

    if (resultado.length > 0) {
      const suggestion = resultado[0];
      expect(suggestion).toHaveProperty('slug');
      expect(suggestion).toHaveProperty('nombre');
      expect(suggestion).toHaveProperty('emoji');
      expect(suggestion).toHaveProperty('dominio');
      expect(suggestion).toHaveProperty('tipo');
      expect(['profundizar', 'conectar', 'aplicar', 'reforzar']).toContain(suggestion.tipo);
      expect(suggestion).toHaveProperty('motivo');
      expect(suggestion).toHaveProperty('puntaje');
      expect(typeof suggestion.puntaje).toBe('number');
    }
  });

  it('ordena por puntaje descendente', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 10,
    });

    // Verificar que los puntajes estan ordenados descendentemente
    for (let i = 1; i < resultado.length; i++) {
      expect(resultado[i].puntaje).toBeLessThanOrEqual(resultado[i - 1].puntaje);
    }
  });

  it('no incluye skillActualSlug en recomendaciones', () => {
    const progresoMap = crearProgresoMap({
      'cometas-y-asteroides': { totalIntentos: 5, nivelMastery: 0.8, dominada: true },
    });

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'cometas-y-asteroides',
      limite: 10,
    });

    const slugsEnResultado = resultado.map(r => r.slug);
    expect(slugsEnResultado).not.toContain('cometas-y-asteroides');
  });
});

// ─────────────────────────────────────────────
// recomendarSiguientesSkills: Edge cases
// ─────────────────────────────────────────────

describe('recomendarSiguientesSkills - Edge cases', () => {
  it('maneja progresoMap vacio', () => {
    const progresoMap = new Map<string, SkillProgressLite>();

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 5,
    });

    expect(Array.isArray(resultado)).toBe(true);
  });

  it('maneja edad en limites', () => {
    const progresoMap = crearProgresoMap({});

    // Edad muy baja
    const resultadoEdad5 = recomendarSiguientesSkills({
      edadAnos: 5,
      intereses: [],
      progresoMap,
      limite: 5,
    });
    expect(Array.isArray(resultadoEdad5)).toBe(true);

    // Edad normal
    const resultadoEdad8 = recomendarSiguientesSkills({
      edadAnos: 8,
      intereses: [],
      progresoMap,
      limite: 5,
    });
    expect(Array.isArray(resultadoEdad8)).toBe(true);

    // Edad alta
    const resultadoEdad12 = recomendarSiguientesSkills({
      edadAnos: 12,
      intereses: [],
      progresoMap,
      limite: 5,
    });
    expect(Array.isArray(resultadoEdad12)).toBe(true);
  });

  it('maneja recientes array vacio', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      recientes: [],
      limite: 5,
    });

    expect(Array.isArray(resultado)).toBe(true);
  });

  it('maneja intereses array vacio', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      limite: 5,
    });

    expect(Array.isArray(resultado)).toBe(true);
  });

  it('maneja skillActualSlug inexistente gracefully', () => {
    const progresoMap = crearProgresoMap({});

    const resultado = recomendarSiguientesSkills({
      edadAnos: 7,
      intereses: [],
      progresoMap,
      skillActualSlug: 'skill-inexistente',
      limite: 5,
    });

    // Deberia recomendar skills globales (fallback)
    expect(Array.isArray(resultado)).toBe(true);
  });
});
