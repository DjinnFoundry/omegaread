'use client';

/**
 * Seccion de velocidad de lectura (WPM chart).
 * Uses robust WPM trend (EWA-smoothed) from the server.
 */
import { lazy, Suspense } from 'react';
import { Zap } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';

const LineaEvolucion = lazy(() =>
  import('@/components/charts/LineaEvolucion').then(m => ({ default: m.LineaEvolucion }))
);

function ChartFallback() {
  return <div className="h-32 rounded-xl bg-neutro/10 animate-pulse" />;
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionWpm({ data }: Props) {
  const { wpmEvolucion } = data;

  // Hide section if fewer than 3 usable sessions
  if (wpmEvolucion.sesionesUsadas < 3) return null;

  const { puntos, wpmActual } = wpmEvolucion;

  return (
    <SeccionCard titulo="Velocidad de lectura" icon={<Zap size={18} className="text-montana" />}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-extrabold font-datos text-texto">
          {wpmActual}
        </span>
        <span className="text-xs text-texto-suave">palabras/min</span>
        <span className="ml-auto text-[10px] text-texto-suave font-datos">
          {wpmEvolucion.sesionesUsadas} sesiones
        </span>
      </div>
      <Suspense fallback={<ChartFallback />}>
        <LineaEvolucion
          datos={puntos.map((p, i) => ({
            label: i === 0 || i === puntos.length - 1
              ? p.fecha.slice(5)
              : '',
            valor: p.wpmSuavizado,
          }))}
          color="#A28BD4"
          maxValor={Math.max(200, ...puntos.map(p => p.wpmSuavizado + 20))}
        />
      </Suspense>
      <p className="mt-1 text-[10px] text-texto-suave text-center">
        Evolucion de palabras por minuto (suavizada)
      </p>
    </SeccionCard>
  );
}
