/**
 * Tests para logica de dashboards Sprint 5.
 * Funciones puras de agregacion, mensajes motivacionales,
 * desglose de tipos, progreso de nivel, recomendaciones.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularProgresoNivel,
  generarMensajeMotivacional,
  calcularDesgloseTipos,
  generarRecomendaciones,
} from '@/server/actions/dashboard-utils';

// ─────────────────────────────────────────────
// calcularProgresoNivel
// ─────────────────────────────────────────────

describe('calcularProgresoNivel', () => {
  const makeSession = (id: string) => ({
    id,
    studentId: 'student-1',
    tipoActividad: 'lectura' as const,
    modulo: 'lectura-adaptativa' as const,
    duracionSegundos: 300,
    completada: true,
    estrellasGanadas: 2,
    stickerGanado: null,
    storyId: null,
    metadata: {},
    iniciadaEn: new Date(),
    finalizadaEn: new Date(),
  });

  const makeResponse = (sessionId: string, correcta: boolean) => ({
    id: `resp-${Math.random()}`,
    sessionId,
    ejercicioId: 'ej-1',
    tipoEjercicio: 'literal',
    pregunta: 'test',
    respuesta: '1',
    respuestaCorrecta: '1',
    correcta,
    tiempoRespuestaMs: 5000,
    intentoNumero: 1,
    metadata: {},
    creadaEn: new Date(),
  });

  it('calcula historias para subir cuando todas las sesiones son altas', () => {
    const sesiones = [makeSession('s1'), makeSession('s2'), makeSession('s3')];
    const respuestas = [
      // s1: 4/4 = 100%
      makeResponse('s1', true), makeResponse('s1', true),
      makeResponse('s1', true), makeResponse('s1', true),
      // s2: 4/4 = 100%
      makeResponse('s2', true), makeResponse('s2', true),
      makeResponse('s2', true), makeResponse('s2', true),
      // s3: 4/4 = 100%
      makeResponse('s3', true), makeResponse('s3', true),
      makeResponse('s3', true), makeResponse('s3', true),
    ];

    const result = calcularProgresoNivel(3, sesiones, respuestas);
    expect(result.nivel).toBe(3);
    expect(result.historiasParaSubir).toBe(0);
    expect(result.sesionesRecientesAltas).toBe(3);
    expect(result.sesionesNecesarias).toBe(3);
  });

  it('calcula historias para subir cuando hay sesiones bajas', () => {
    const sesiones = [makeSession('s1'), makeSession('s2'), makeSession('s3')];
    const respuestas = [
      // s1: 2/4 = 50% (baja)
      makeResponse('s1', true), makeResponse('s1', true),
      makeResponse('s1', false), makeResponse('s1', false),
      // s2: 4/4 = 100%
      makeResponse('s2', true), makeResponse('s2', true),
      makeResponse('s2', true), makeResponse('s2', true),
      // s3: 1/4 = 25% (baja)
      makeResponse('s3', true), makeResponse('s3', false),
      makeResponse('s3', false), makeResponse('s3', false),
    ];

    const result = calcularProgresoNivel(2, sesiones, respuestas);
    expect(result.historiasParaSubir).toBe(2);
    expect(result.sesionesRecientesAltas).toBe(1);
  });

  it('funciona con 0 sesiones', () => {
    const result = calcularProgresoNivel(1, [], []);
    expect(result.nivel).toBe(1);
    expect(result.historiasParaSubir).toBe(3);
    expect(result.sesionesRecientesAltas).toBe(0);
  });

  it('funciona con sesiones sin respuestas', () => {
    const sesiones = [makeSession('s1')];
    const result = calcularProgresoNivel(2, sesiones, []);
    expect(result.historiasParaSubir).toBe(3);
  });
});

// ─────────────────────────────────────────────
// generarMensajeMotivacional
// ─────────────────────────────────────────────

describe('generarMensajeMotivacional', () => {
  it('devuelve mensaje default con menos de 2 sesiones', () => {
    const msg = generarMensajeMotivacional([
      { sessionId: '1', fecha: '2026-01-01', porcentajeAcierto: 80, topicEmoji: '🐱' },
    ]);
    expect(msg).toContain('historia');
  });

  it('devuelve mensaje positivo con alta comprension', () => {
    const tendencia = [
      { sessionId: '1', fecha: '2026-01-01', porcentajeAcierto: 90, topicEmoji: '🐱' },
      { sessionId: '2', fecha: '2026-01-02', porcentajeAcierto: 85, topicEmoji: '🐱' },
      { sessionId: '3', fecha: '2026-01-03', porcentajeAcierto: 95, topicEmoji: '🐱' },
    ];
    const msg = generarMensajeMotivacional(tendencia);
    expect(msg.length).toBeGreaterThan(0);
    expect(typeof msg).toBe('string');
  });

  it('detecta tendencia mejorando', () => {
    const tendencia = [
      { sessionId: '1', fecha: '2026-01-01', porcentajeAcierto: 40, topicEmoji: '🐱' },
      { sessionId: '2', fecha: '2026-01-02', porcentajeAcierto: 50, topicEmoji: '🐱' },
      { sessionId: '3', fecha: '2026-01-03', porcentajeAcierto: 55, topicEmoji: '🐱' },
      { sessionId: '4', fecha: '2026-01-04', porcentajeAcierto: 70, topicEmoji: '🐱' },
      { sessionId: '5', fecha: '2026-01-05', porcentajeAcierto: 80, topicEmoji: '🐱' },
      { sessionId: '6', fecha: '2026-01-06', porcentajeAcierto: 85, topicEmoji: '🐱' },
    ];
    const msg = generarMensajeMotivacional(tendencia);
    expect(msg).toContain('sube');
  });

  it('detecta tendencia bajando', () => {
    const tendencia = [
      { sessionId: '1', fecha: '2026-01-01', porcentajeAcierto: 90, topicEmoji: '🐱' },
      { sessionId: '2', fecha: '2026-01-02', porcentajeAcierto: 85, topicEmoji: '🐱' },
      { sessionId: '3', fecha: '2026-01-03', porcentajeAcierto: 80, topicEmoji: '🐱' },
      { sessionId: '4', fecha: '2026-01-04', porcentajeAcierto: 50, topicEmoji: '🐱' },
      { sessionId: '5', fecha: '2026-01-05', porcentajeAcierto: 40, topicEmoji: '🐱' },
      { sessionId: '6', fecha: '2026-01-06', porcentajeAcierto: 35, topicEmoji: '🐱' },
    ];
    const msg = generarMensajeMotivacional(tendencia);
    expect(msg).toContain('practicando');
  });
});

// ─────────────────────────────────────────────
// calcularDesgloseTipos
// ─────────────────────────────────────────────

describe('calcularDesgloseTipos', () => {
  const makeResp = (tipo: string, correcta: boolean) => ({
    id: `r-${Math.random()}`,
    sessionId: 's1',
    ejercicioId: 'e1',
    tipoEjercicio: tipo,
    pregunta: 'test',
    respuesta: '1',
    respuestaCorrecta: '1',
    correcta,
    tiempoRespuestaMs: 5000,
    intentoNumero: 1,
    metadata: {},
    creadaEn: new Date(),
  });

  it('calcula porcentajes por tipo correctamente', () => {
    const respuestas = [
      makeResp('literal', true),
      makeResp('literal', true),
      makeResp('literal', false),
      makeResp('inferencia', true),
      makeResp('inferencia', false),
      makeResp('vocabulario', false),
      makeResp('vocabulario', false),
      makeResp('resumen', true),
    ];

    const result = calcularDesgloseTipos(respuestas);
    expect(result.literal.total).toBe(3);
    expect(result.literal.aciertos).toBe(2);
    expect(result.literal.porcentaje).toBe(67);
    expect(result.inferencia.porcentaje).toBe(50);
    expect(result.vocabulario.porcentaje).toBe(0);
    expect(result.resumen.porcentaje).toBe(100);
  });

  it('devuelve 0% sin respuestas', () => {
    const result = calcularDesgloseTipos([]);
    expect(result.literal.porcentaje).toBe(0);
    expect(result.inferencia.porcentaje).toBe(0);
    expect(result.vocabulario.porcentaje).toBe(0);
    expect(result.resumen.porcentaje).toBe(0);
  });

  it('ignora tipos desconocidos', () => {
    const respuestas = [
      makeResp('tipo-raro', true),
      makeResp('literal', true),
    ];
    const result = calcularDesgloseTipos(respuestas);
    expect(result.literal.total).toBe(1);
    expect(result.literal.aciertos).toBe(1);
    // tipo-raro no deberia aparecer en los tipos estandar
    expect('tipo-raro' in result).toBe(false);
  });

  it('inicializa los 4 tipos incluso sin datos', () => {
    const result = calcularDesgloseTipos([]);
    expect(Object.keys(result)).toEqual(['literal', 'inferencia', 'vocabulario', 'resumen']);
  });
});

// ─────────────────────────────────────────────
// generarRecomendaciones
// ─────────────────────────────────────────────

describe('generarRecomendaciones', () => {
  it('genera recomendacion por tipo debil', () => {
    const desglose = {
      literal: { total: 10, aciertos: 8, porcentaje: 80 },
      inferencia: { total: 10, aciertos: 4, porcentaje: 40 },
      vocabulario: { total: 10, aciertos: 7, porcentaje: 70 },
      resumen: { total: 10, aciertos: 9, porcentaje: 90 },
    };

    const recs = generarRecomendaciones(desglose, [], []);
    expect(recs.length).toBeGreaterThan(0);
    const inferRec = recs.find(r => r.tipo === 'inferencia');
    expect(inferRec).toBeDefined();
    expect(inferRec?.detalle).toContain('inferir');
  });

  it('genera recomendacion por topic debil', () => {
    const desglose = {
      literal: { total: 2, aciertos: 2, porcentaje: 100 },
      inferencia: { total: 2, aciertos: 2, porcentaje: 100 },
      vocabulario: { total: 2, aciertos: 2, porcentaje: 100 },
      resumen: { total: 2, aciertos: 2, porcentaje: 100 },
    };
    const topics = [
      { topicSlug: 'ciencia', nombre: 'Ciencia', scoreMedio: 45 },
    ];

    const recs = generarRecomendaciones(desglose, topics, []);
    const topicRec = recs.find(r => r.tipo === 'topic');
    expect(topicRec).toBeDefined();
    expect(topicRec?.mensaje).toContain('Ciencia');
  });

  it('genera recomendacion de frecuencia con pocas sesiones', () => {
    const desglose = {
      literal: { total: 1, aciertos: 1, porcentaje: 100 },
      inferencia: { total: 1, aciertos: 1, porcentaje: 100 },
      vocabulario: { total: 1, aciertos: 1, porcentaje: 100 },
      resumen: { total: 1, aciertos: 1, porcentaje: 100 },
    };

    // Solo 1 sesion en la ultima semana
    const sesiones = [{
      id: 's1',
      studentId: 'st1',
      tipoActividad: 'lectura' as const,
      modulo: 'lectura-adaptativa' as const,
      duracionSegundos: 300,
      completada: true,
      estrellasGanadas: 2,
      stickerGanado: null,
      storyId: null,
      metadata: {},
      iniciadaEn: new Date(),
      finalizadaEn: new Date(),
    }];

    const recs = generarRecomendaciones(desglose, [], sesiones);
    const freqRec = recs.find(r => r.tipo === 'frecuencia');
    expect(freqRec).toBeDefined();
    expect(freqRec?.mensaje).toContain('rutina');
  });

  it('maximo 3 recomendaciones', () => {
    const desglose = {
      literal: { total: 10, aciertos: 3, porcentaje: 30 },
      inferencia: { total: 10, aciertos: 3, porcentaje: 30 },
      vocabulario: { total: 10, aciertos: 3, porcentaje: 30 },
      resumen: { total: 10, aciertos: 3, porcentaje: 30 },
    };
    const topics = [
      { topicSlug: 'ciencia', nombre: 'Ciencia', scoreMedio: 20 },
      { topicSlug: 'arte', nombre: 'Arte', scoreMedio: 30 },
    ];

    const recs = generarRecomendaciones(desglose, topics, []);
    expect(recs.length).toBeLessThanOrEqual(3);
  });

  it('devuelve array vacio cuando todo esta bien', () => {
    const desglose = {
      literal: { total: 2, aciertos: 2, porcentaje: 100 },
      inferencia: { total: 2, aciertos: 2, porcentaje: 100 },
      vocabulario: { total: 2, aciertos: 2, porcentaje: 100 },
      resumen: { total: 2, aciertos: 2, porcentaje: 100 },
    };

    // 5 sesiones en la ultima semana
    const ahora = new Date();
    const sesiones = Array.from({ length: 5 }).map((_, i) => ({
      id: `s${i}`,
      studentId: 'st1',
      tipoActividad: 'lectura' as const,
      modulo: 'lectura-adaptativa' as const,
      duracionSegundos: 300,
      completada: true,
      estrellasGanadas: 2,
      stickerGanado: null,
      storyId: null,
      metadata: {},
      iniciadaEn: new Date(ahora.getTime() - i * 86400000),
      finalizadaEn: new Date(ahora.getTime() - i * 86400000),
    }));

    const recs = generarRecomendaciones(desglose, [], sesiones);
    expect(recs.length).toBe(0);
  });
});
