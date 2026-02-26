'use client';

/**
 * Seccion de velocidad de lectura (WPM chart).
 * Extraida de DashboardPadreDetalle.
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

/**
 * Filters WPM data to remove outlier sessions where the child likely skipped
 * without reading. Uses median-based detection: sessions with WPM > median * 3
 * are considered fake fast and excluded. Returns null if fewer than 3 valid
 * sessions remain (not enough data to show the section).
 */
function filtrarWpmValidos(
  wpmEvolucion: DashboardPadreData['wpmEvolucion']
): DashboardPadreData['wpmEvolucion'] | null {
  if (wpmEvolucion.length === 0) return null;

  const valores = wpmEvolucion.map(w => w.wpm).sort((a, b) => a - b);
  const mid = Math.floor(valores.length / 2);
  const mediana =
    valores.length % 2 === 0
      ? ((valores[mid - 1] ?? 0) + (valores[mid] ?? 0)) / 2
      : (valores[mid] ?? 0);

  const umbral = mediana * 3;
  const validos = wpmEvolucion.filter(w => w.wpm <= umbral);

  if (validos.length < 3) return null;
  return validos;
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionWpm({ data }: Props) {
  const wpmValidos = filtrarWpmValidos(data.wpmEvolucion);

  if (wpmValidos === null) return null;

  return (
    <SeccionCard titulo="Velocidad de lectura" icon={<Zap size={18} className="text-montana" />}>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-extrabold font-datos text-texto">
          {wpmValidos[wpmValidos.length - 1]?.wpm ?? 0}
        </span>
        <span className="text-xs text-texto-suave">palabras/min</span>
      </div>
      <Suspense fallback={<ChartFallback />}>
        <LineaEvolucion
          datos={wpmValidos.map((w, i) => ({
            label: i === 0 || i === wpmValidos.length - 1
              ? w.fecha.slice(5)
              : '',
            valor: w.wpm,
          }))}
          color="#A28BD4"
          maxValor={Math.max(200, ...wpmValidos.map(w => w.wpm + 20))}
        />
      </Suspense>
      <p className="mt-1 text-[10px] text-texto-suave text-center">
        Evolucion de palabras por minuto
      </p>
    </SeccionCard>
  );
}
