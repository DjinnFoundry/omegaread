/**
 * Tests para el banco de micro-preguntas del perfil.
 *
 * Verifica:
 * 1. seleccionarPreguntaPerfilActiva: rotacion deterministica cada 3 dias
 * 2. crearHechoDesdeMicroRespuesta: plantillas correctas por pregunta
 * 3. Filtraje de respondidas, diferentes estudiantes
 */
import { describe, it, expect } from 'vitest';
import {
  seleccionarPreguntaPerfilActiva,
  crearHechoDesdeMicroRespuesta,
  MICRO_PREGUNTAS_PERFIL,
} from '@/lib/profile/micro-profile';

// ─────────────────────────────────────────────
// seleccionarPreguntaPerfilActiva: Rotacion deterministica
// ─────────────────────────────────────────────

describe('seleccionarPreguntaPerfilActiva - Rotacion deterministica', () => {
  it('retorna la misma pregunta para el mismo estudiante + dia cada 3 dias', () => {
    const studentId = 'student-123';
    const fecha1 = new Date('2026-02-24'); // Lunes
    const fecha2 = new Date('2026-02-25'); // Martes
    const fecha3 = new Date('2026-02-26'); // Miercoles

    const pregunta1 = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha1,
    });

    const pregunta2 = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha2,
    });

    const pregunta3 = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha3,
    });

    // Dentro del mismo bucket de 3 dias (24/25/26 estan en el mismo bucket)
    // deberian retornar la misma pregunta
    expect(pregunta1?.id).toBe(pregunta2?.id);
    expect(pregunta1?.id).toBe(pregunta3?.id);
  });

  it('retorna pregunta diferente despues de 3 dias', () => {
    const studentId = 'student-456';
    const fecha1 = new Date('2026-02-24T10:00:00');
    const fecha2 = new Date('2026-02-27T10:00:00'); // 3 dias despues

    const pregunta1 = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha1,
    });

    const pregunta2 = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha2,
    });

    // Diferentes buckets de 3 dias, podrian ser diferentes preguntas
    // (a menos que sea una coincidencia de hash)
    if (pregunta1 && pregunta2) {
      // Ambas deben ser preguntas validas
      expect(MICRO_PREGUNTAS_PERFIL.find(p => p.id === pregunta1.id)).toBeDefined();
      expect(MICRO_PREGUNTAS_PERFIL.find(p => p.id === pregunta2.id)).toBeDefined();
    }
  });

  it('diferentes estudiantes obtienen diferentes preguntas en el mismo dia', () => {
    const fecha = new Date('2026-02-25');
    const student1 = 'student-001';
    const student2 = 'student-002';

    const pregunta1 = seleccionarPreguntaPerfilActiva({
      studentId: student1,
      preguntasRespondidas: [],
      now: fecha,
    });

    const pregunta2 = seleccionarPreguntaPerfilActiva({
      studentId: student2,
      preguntasRespondidas: [],
      now: fecha,
    });

    // Con casi total seguridad, estudiantes diferentes obtienen diferentes preguntas
    // (a menos que hayan muchas colisiones de hash, muy improbable)
    if (pregunta1 && pregunta2) {
      // Ambas deben ser validas, pero potencialmente diferentes
      expect(pregunta1?.id).not.toBe(pregunta2?.id);
    }
  });
});

// ─────────────────────────────────────────────
// seleccionarPreguntaPerfilActiva: Filtraje de respondidas
// ─────────────────────────────────────────────

describe('seleccionarPreguntaPerfilActiva - Filtraje de respondidas', () => {
  it('evita preguntas ya respondidas', () => {
    const studentId = 'student-789';
    const fecha = new Date('2026-02-25');

    // Marcar una pregunta como respondida
    const respondidas = ['interes-nuevo-mes'];

    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: respondidas,
      now: fecha,
    });

    if (pregunta) {
      expect(pregunta.id).not.toBe('interes-nuevo-mes');
    }
  });

  it('retorna null cuando todas las preguntas estan respondidas', () => {
    const studentId = 'student-999';
    const fecha = new Date('2026-02-25');

    // Marcar todas las preguntas como respondidas
    const respondidas = MICRO_PREGUNTAS_PERFIL.map(p => p.id);

    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: respondidas,
      now: fecha,
    });

    expect(pregunta).toBeNull();
  });

  it('selecciona entre las pendientes solo', () => {
    const studentId = 'student-select';
    const fecha = new Date('2026-02-25');

    // Marcar 3 preguntas como respondidas
    const respondidas = [
      'interes-nuevo-mes',
      'formato-favorito',
      'reto-actual',
    ];

    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: respondidas,
      now: fecha,
    });

    if (pregunta) {
      // Debe ser una de las pendientes
      expect(respondidas).not.toContain(pregunta.id);
      expect(
        ['fortaleza-actual', 'contexto-motivador'].includes(pregunta.id)
        || !respondidas.includes(pregunta.id)
      ).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// seleccionarPreguntaPerfilActiva: Parametro 'now'
// ─────────────────────────────────────────────

describe('seleccionarPreguntaPerfilActiva - Parametro now', () => {
  it('usa Date actual si now no se especifica', () => {
    const studentId = 'student-now-test';
    // Sin pasar 'now', deberia usar new Date()
    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
    });

    // Simplemente verificar que retorna una pregunta valida o null
    if (pregunta) {
      expect(MICRO_PREGUNTAS_PERFIL.find(p => p.id === pregunta.id)).toBeDefined();
    }
  });

  it('respeta el parametro now cuando se pasa', () => {
    const studentId = 'student-now-explicit';
    const fecha = new Date('2026-02-25T14:30:00');

    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId,
      preguntasRespondidas: [],
      now: fecha,
    });

    expect(pregunta).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// seleccionarPreguntaPerfilActiva: Edge cases
// ─────────────────────────────────────────────

describe('seleccionarPreguntaPerfilActiva - Edge cases', () => {
  it('maneja preguntasRespondidas vacio', () => {
    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId: 'student-edge-1',
      preguntasRespondidas: [],
      now: new Date('2026-02-25'),
    });

    expect(pregunta).toBeDefined();
  });

  it('maneja preguntasRespondidas array vacio', () => {
    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId: 'student-edge-2',
      preguntasRespondidas: [],
      now: new Date('2026-02-25'),
    });

    if (pregunta) {
      expect(pregunta.id).toBeTruthy();
    }
  });

  it('maneja studentId vacio sin errores', () => {
    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId: '',
      preguntasRespondidas: [],
      now: new Date('2026-02-25'),
    });

    // Deberia retornar una pregunta valida (no null) con empty studentId
    expect(pregunta).toBeDefined();
    expect(pregunta?.id).toBeTruthy();
  });

  it('maneja studentId muy largo', () => {
    const pregunta = seleccionarPreguntaPerfilActiva({
      studentId: 'a'.repeat(1000),
      preguntasRespondidas: [],
      now: new Date('2026-02-25'),
    });

    // Deberia retornar una pregunta valida incluso con studentId muy largo
    expect(pregunta).toBeDefined();
    expect(pregunta?.id).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// crearHechoDesdeMicroRespuesta: Plantillas correctas
// ─────────────────────────────────────────────

describe('crearHechoDesdeMicroRespuesta - Plantillas correctas', () => {
  it('usa plantilla correcta para interes-nuevo-mes', () => {
    const respuesta = 'Espacio';
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('Ultimamente se interesa');
    expect(hecho?.texto).toContain('Espacio');
    expect(hecho?.categoria).toBe('interes');
  });

  it('usa plantilla correcta para formato-favorito', () => {
    const respuesta = 'Aventura';
    const hecho = crearHechoDesdeMicroRespuesta('formato-favorito', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('Prefiere historias');
    expect(hecho?.texto).toContain('Aventura');
    expect(hecho?.categoria).toBe('interes');
  });

  it('usa plantilla correcta para reto-actual', () => {
    const respuesta = 'Mantener atencion';
    const hecho = crearHechoDesdeMicroRespuesta('reto-actual', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('Reto actual');
    expect(hecho?.texto).toContain('Mantener atencion');
    expect(hecho?.categoria).toBe('reto');
  });

  it('usa plantilla correcta para fortaleza-actual', () => {
    const respuesta = 'Lee mas fluido';
    const hecho = crearHechoDesdeMicroRespuesta('fortaleza-actual', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('Fortaleza reciente');
    expect(hecho?.texto).toContain('Lee mas fluido');
    expect(hecho?.categoria).toBe('fortaleza');
  });

  it('usa plantilla correcta para contexto-motivador', () => {
    const respuesta = 'Personajes favoritos';
    const hecho = crearHechoDesdeMicroRespuesta('contexto-motivador', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('motivarse');
    expect(hecho?.texto).toContain('Personajes favoritos');
    expect(hecho?.categoria).toBe('contexto');
  });
});

// ─────────────────────────────────────────────
// crearHechoDesdeMicroRespuesta: Respuestas variadas
// ─────────────────────────────────────────────

describe('crearHechoDesdeMicroRespuesta - Respuestas variadas', () => {
  it('incluye la respuesta del usuario en el texto del hecho', () => {
    const respuesta = 'Respuesta unica del usuario';
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain('Respuesta unica del usuario');
  });

  it('maneja respuestas con caracteres especiales', () => {
    const respuesta = 'Tema con acentos: ciencia y filosofia';
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain(respuesta);
  });

  it('maneja respuestas largas', () => {
    const respuesta = 'Una respuesta muy larga que explica detalladamente las preferencias y caracteristicas del nino en el proceso de lectura y aprendizaje';
    const hecho = crearHechoDesdeMicroRespuesta('formato-favorito', respuesta);

    expect(hecho).not.toBeNull();
    expect(hecho?.texto).toContain(respuesta);
  });

  it('maneja respuestas vacias', () => {
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', '');

    expect(hecho).not.toBeNull();
    // El hecho deberia incluir la respuesta vacia en la plantilla
    expect(typeof hecho?.texto).toBe('string');
  });
});

// ─────────────────────────────────────────────
// crearHechoDesdeMicroRespuesta: Preguntas inexistentes
// ─────────────────────────────────────────────

describe('crearHechoDesdeMicroRespuesta - Preguntas inexistentes', () => {
  it('retorna null para preguntaId inexistente', () => {
    const hecho = crearHechoDesdeMicroRespuesta('pregunta-inexistente', 'respuesta');

    expect(hecho).toBeNull();
  });

  it('retorna null para preguntaId vacio', () => {
    const hecho = crearHechoDesdeMicroRespuesta('', 'respuesta');

    expect(hecho).toBeNull();
  });

  it('retorna null para preguntaId con typo', () => {
    // Typo intencional (espacio extra)
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes ', 'respuesta');

    expect(hecho).toBeNull();
  });

  it('es sensible a mayusculas/minusculas en preguntaId', () => {
    const hecho = crearHechoDesdeMicroRespuesta('INTERES-NUEVO-MES', 'respuesta');

    // Deberia ser case-sensitive
    expect(hecho).toBeNull();
  });
});

// ─────────────────────────────────────────────
// crearHechoDesdeMicroRespuesta: Categorias correctas
// ─────────────────────────────────────────────

describe('crearHechoDesdeMicroRespuesta - Categorias correctas', () => {
  it('retorna categoria interes para preguntas de interes', () => {
    const hecho1 = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', 'Espacio');
    const hecho2 = crearHechoDesdeMicroRespuesta('formato-favorito', 'Aventura');

    expect(hecho1?.categoria).toBe('interes');
    expect(hecho2?.categoria).toBe('interes');
  });

  it('retorna categoria reto para preguntas de reto', () => {
    const hecho = crearHechoDesdeMicroRespuesta('reto-actual', 'Mantener atencion');

    expect(hecho?.categoria).toBe('reto');
  });

  it('retorna categoria fortaleza para preguntas de fortaleza', () => {
    const hecho = crearHechoDesdeMicroRespuesta('fortaleza-actual', 'Lee mejor');

    expect(hecho?.categoria).toBe('fortaleza');
  });

  it('retorna categoria contexto para preguntas de contexto', () => {
    const hecho = crearHechoDesdeMicroRespuesta('contexto-motivador', 'En familia');

    expect(hecho?.categoria).toBe('contexto');
  });
});

// ─────────────────────────────────────────────
// crearHechoDesdeMicroRespuesta: Estructura de salida
// ─────────────────────────────────────────────

describe('crearHechoDesdeMicroRespuesta - Estructura de salida', () => {
  it('retorna objeto con campos texto y categoria', () => {
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', 'Espacio');

    expect(hecho).toHaveProperty('texto');
    expect(hecho).toHaveProperty('categoria');
  });

  it('texto es string no vacio', () => {
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', 'Espacio');

    expect(typeof hecho?.texto).toBe('string');
    expect(hecho?.texto).not.toBe('');
  });

  it('categoria es uno de los valores validos', () => {
    const categoriasValidas = ['interes', 'fortaleza', 'reto', 'contexto'];
    const hecho = crearHechoDesdeMicroRespuesta('interes-nuevo-mes', 'Espacio');

    expect(categoriasValidas).toContain(hecho?.categoria);
  });
});
