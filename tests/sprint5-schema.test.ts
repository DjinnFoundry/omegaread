/**
 * Tests de esquema y tipos para Sprint 5.
 * Verifica que los types de dashboard son correctos.
 */
import { describe, it, expect } from 'vitest';
import type {
  DashboardNinoData,
  DashboardPadreData,
} from '@/server/actions/dashboard-actions';

describe('Sprint 5: DashboardNinoData type shape', () => {
  it('tiene todas las propiedades requeridas', () => {
    // Verificacion en compile time + runtime shape check
    const datosEjemplo: DashboardNinoData = {
      tendenciaComprension: [],
      ritmoLector: null,
      nivelActual: {
        nivel: 2,
        historiasParaSubir: 1,
        sesionesRecientesAltas: 2,
        sesionesNecesarias: 3,
      },
      topicsResumen: {
        fuertes: [],
        reforzar: null,
      },
      racha: {
        diasConsecutivos: 0,
        ultimosDias: [false, false, false, false, false, false, false],
      },
      mensajeMotivacional: 'Test',
    };

    expect(datosEjemplo.tendenciaComprension).toBeDefined();
    expect(datosEjemplo.ritmoLector).toBeNull();
    expect(datosEjemplo.nivelActual.nivel).toBe(2);
    expect(datosEjemplo.topicsResumen).toBeDefined();
    expect(datosEjemplo.racha.ultimosDias).toHaveLength(7);
    expect(datosEjemplo.mensajeMotivacional).toBe('Test');
  });

  it('tendenciaComprension acepta datos de sesion', () => {
    const tendencia: DashboardNinoData['tendenciaComprension'] = [
      { sessionId: 's1', fecha: '2026-01-01', porcentajeAcierto: 80, topicEmoji: '🐱' },
      { sessionId: 's2', fecha: '2026-01-02', porcentajeAcierto: 65, topicEmoji: '🚀' },
    ];
    expect(tendencia).toHaveLength(2);
    expect(tendencia[0].porcentajeAcierto).toBe(80);
  });

  it('ritmoLector puede ser null (pocas sesiones)', () => {
    const data: DashboardNinoData['ritmoLector'] = null;
    expect(data).toBeNull();
  });

  it('ritmoLector tiene datos de mejora', () => {
    const ritmo: DashboardNinoData['ritmoLector'] = {
      tiempoPromedioAnteriorMs: 300000,
      tiempoPromedioRecienteMs: 240000,
      mejorando: true,
    };
    expect(ritmo?.mejorando).toBe(true);
  });
});

describe('Sprint 5: DashboardPadreData type shape', () => {
  it('tiene todas las propiedades requeridas', () => {
    const datosEjemplo: DashboardPadreData = {
      evolucionSemanal: [],
      evolucionDificultad: [],
      desgloseTipos: {
        literal: { total: 0, aciertos: 0, porcentaje: 0 },
        inferencia: { total: 0, aciertos: 0, porcentaje: 0 },
        vocabulario: { total: 0, aciertos: 0, porcentaje: 0 },
        resumen: { total: 0, aciertos: 0, porcentaje: 0 },
      },
      comparativaTopics: [],
      historialSesiones: [],
      recomendaciones: [],
      timelineCambiosNivel: [],
      nivelActual: 1,
      nombreEstudiante: 'Test',
    };

    expect(datosEjemplo.evolucionSemanal).toBeDefined();
    expect(datosEjemplo.desgloseTipos.literal).toBeDefined();
    expect(datosEjemplo.nivelActual).toBe(1);
    expect(datosEjemplo.nombreEstudiante).toBe('Test');
  });

  it('evolucionSemanal acepta datos semanales', () => {
    const semanas: DashboardPadreData['evolucionSemanal'] = [
      { semana: '1/1', scoreMedio: 75, totalSesiones: 3 },
      { semana: '8/1', scoreMedio: 80, totalSesiones: 4 },
    ];
    expect(semanas).toHaveLength(2);
    expect(semanas[1].scoreMedio).toBe(80);
  });

  it('recomendaciones tienen tipo, mensaje y detalle', () => {
    const recs: DashboardPadreData['recomendaciones'] = [
      {
        tipo: 'inferencia',
        mensaje: 'Practicar inferencias',
        detalle: 'Detalle largo...',
      },
    ];
    expect(recs[0].tipo).toBe('inferencia');
    expect(recs[0].mensaje).toBeDefined();
    expect(recs[0].detalle).toBeDefined();
  });

  it('timelineCambiosNivel tiene evidencia', () => {
    const timeline: DashboardPadreData['timelineCambiosNivel'] = [
      {
        fecha: '2026-01-15',
        nivelAnterior: 2,
        nivelNuevo: 2.5,
        razon: 'Comprension 85%',
        evidencia: {
          comprensionScore: 0.85,
          ajusteManual: null,
        },
      },
    ];
    expect(timeline[0].evidencia.comprensionScore).toBe(0.85);
  });

  it('historialSesiones incluye datos de ajuste', () => {
    const historial: DashboardPadreData['historialSesiones'] = [
      {
        id: 's1',
        fecha: '2026-01-20',
        topicSlug: 'animales',
        topicEmoji: '🐱',
        topicNombre: 'Animales',
        scorePorcentaje: 75,
        nivel: 3,
        duracionMin: 5,
        ajuste: 'subir',
      },
    ];
    expect(historial[0].ajuste).toBe('subir');
  });
});
