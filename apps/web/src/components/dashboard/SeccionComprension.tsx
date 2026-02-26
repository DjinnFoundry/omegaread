'use client';

/**
 * Seccion de comprension lectora: ELO global + chart de evolucion.
 * Extraida de DashboardPadreDetalle.
 */
import { lazy, Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { clasificarElo } from '@/lib/elo';
import { SeccionCard } from './SeccionCard';

const LineaEvolucion = lazy(() =>
  import('@/components/charts/LineaEvolucion').then(m => ({ default: m.LineaEvolucion }))
);

function ChartFallback() {
  return <div className="h-32 rounded-xl bg-neutro/10 animate-pulse" />;
}

const RANGOS_COMPRENSION = [
  { rango: '<800', nivel: 'Principiante', color: '#FF6B6B' },
  { rango: '800-1100', nivel: 'En desarrollo', color: '#D4880B' },
  { rango: '1100-1400', nivel: 'Competente', color: '#4ECDC4' },
  { rango: '>1400', nivel: 'Avanzado', color: '#7BC67E' },
];

function getEloColor(elo: number): string {
  if (elo < 800) return '#FF6B6B';
  if (elo < 1100) return '#D4880B';
  if (elo < 1400) return '#4ECDC4';
  return '#7BC67E';
}

function getEloTendencia(eloEvolucion: DashboardPadreData['eloEvolucion'], currentElo: number): 'up' | 'down' | 'stable' {
  if (eloEvolucion.length < 5) return 'stable';
  const hace5 = eloEvolucion[Math.max(0, eloEvolucion.length - 6)]?.global ?? currentElo;
  const diff = currentElo - hace5;
  if (diff > 15) return 'up';
  if (diff < -15) return 'down';
  return 'stable';
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionComprension({ data }: Props) {
  const tendencia = getEloTendencia(data.eloEvolucion, data.eloActual.global);
  const mostrandoPuntoInicial = data.eloEvolucion.length === 0;
  const eloSerie = mostrandoPuntoInicial
    ? [{
        fecha: new Date().toISOString().split('T')[0] ?? 'inicio',
        sessionId: 'inicio',
        global: data.eloActual.global,
        literal: data.eloActual.literal,
        inferencia: data.eloActual.inferencia,
        vocabulario: data.eloActual.vocabulario,
        resumen: data.eloActual.resumen,
        rd: data.eloActual.rd,
      }]
    : data.eloEvolucion;

  return (
    <SeccionCard titulo="Comprension lectora" icon={<TrendingUp size={18} className="text-turquesa" />}>
      <div className="rounded-2xl bg-turquesa/10 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-turquesa">Nivel de comprension</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-4xl font-extrabold font-datos" style={{ color: getEloColor(data.eloActual.global) }}>
                {Math.round(data.eloActual.global)}
              </p>
              <span className="text-lg">
                {tendencia === 'up' ? '↑' : tendencia === 'down' ? '↓' : ''}
              </span>
            </div>
            <p className="text-xs text-texto-suave mt-0.5">
              {clasificarElo(data.eloActual.global)}
              {data.eloActual.rd > 150 && ' (calibrando...)'}
            </p>
          </div>
          <p className="max-w-md text-[11px] leading-relaxed text-texto-suave">
            Se ajusta por comprension real (Glicko/Elo): cuanto mejor asimila preguntas de distinta
            dificultad y mas consistencia muestra, mayor dificultad recibe.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {RANGOS_COMPRENSION.map((rango) => (
          <div key={rango.rango} className="rounded-xl bg-fondo p-2">
            <p className="text-[10px] text-texto-suave">{rango.rango}</p>
            <p className="text-xs font-semibold" style={{ color: rango.color }}>{rango.nivel}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Suspense fallback={<ChartFallback />}>
          <LineaEvolucion
            datos={eloSerie.map((e, i) => ({
              label: eloSerie.length === 1
                ? 'Inicio'
                : i === 0 || i === eloSerie.length - 1
                  ? e.fecha.slice(5)
                  : '',
              valor: e.global,
              banda: e.rd,
            }))}
            color="#4ECDC4"
            maxValor={Math.max(1600, ...eloSerie.map(e => e.global + e.rd + 50))}
            minValor={Math.max(0, Math.min(...eloSerie.map(e => e.global - e.rd - 50)))}
            mostrarValores={false}
            sufijo=""
          />
        </Suspense>
      </div>
      <p className="mt-1 text-[10px] text-texto-suave text-center">
        {mostrandoPuntoInicial
          ? 'Punto inicial de calibracion (base 1000) hasta completar sesiones.'
          : 'La banda se estrecha a medida que tenemos mas datos.'}
      </p>
    </SeccionCard>
  );
}
