'use client';

/**
 * Seccion de comprension por tipo de pregunta con charts expandibles.
 * Extraida de DashboardPadreDetalle.
 */
import { useState, lazy, Suspense } from 'react';
import { Target, FileText, Eye, BookOpen, Lightbulb } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { clasificarElo } from '@/lib/elo';
import { SeccionCard } from './SeccionCard';

const LineaEvolucion = lazy(() =>
  import('@/components/charts/LineaEvolucion').then(m => ({ default: m.LineaEvolucion }))
);

function ChartFallback() {
  return <div className="h-32 rounded-xl bg-neutro/10 animate-pulse" />;
}

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  literal: { label: 'Literal', icon: <FileText size={16} className="text-turquesa" />, color: '#4ECDC4' },
  inferencia: { label: 'Inferencia', icon: <Eye size={16} className="text-montana" />, color: '#A28BD4' },
  vocabulario: { label: 'Vocabulario', icon: <BookOpen size={16} className="text-taller" />, color: '#FFB347' },
  resumen: { label: 'Idea principal', icon: <Lightbulb size={16} className="text-lago" />, color: '#64B5F6' },
};

function getEloColor(elo: number): string {
  if (elo < 800) return '#FF6B6B';
  if (elo < 1100) return '#D4880B';
  if (elo < 1400) return '#4ECDC4';
  return '#7BC67E';
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionTipos({ data }: Props) {
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);

  return (
    <SeccionCard titulo="Comprension por tipo" icon={<Target size={18} className="text-coral" />}>
      <div className="space-y-2">
        {Object.entries(TIPO_CONFIG).map(([tipo, config]) => {
          const datos = data.desgloseTipos[tipo];
          if (!datos) return null;
          const elo = datos.elo;
          const isExpanded = tipoExpandido === tipo;

          return (
            <div key={tipo}>
              <button
                onClick={() => setTipoExpandido(isExpanded ? null : tipo)}
                className="w-full flex items-center gap-2.5 rounded-xl bg-fondo p-2.5 text-left active:scale-[0.99] transition-transform"
              >
                <span className="shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-texto">{config.label}</span>
                    <span className="text-xs font-bold font-datos" style={{ color: getEloColor(elo) }}>
                      {Math.round(elo)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-texto-suave">
                      <span className="font-datos">{datos.porcentaje}%</span> acierto (<span className="font-datos">{datos.total}</span> preg.)
                    </span>
                    <span className="text-[9px] text-texto-suave">
                      {clasificarElo(elo)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-neutro">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Grafica expandida de evolucion Elo del tipo */}
              {isExpanded && data.eloEvolucion.length > 1 && (
                <div className="mt-1 ml-8 mr-2 rounded-lg bg-superficie p-2 border border-neutro/10">
                  <Suspense fallback={<ChartFallback />}>
                    <LineaEvolucion
                      datos={data.eloEvolucion.map((e, i) => ({
                        label: i === 0 || i === data.eloEvolucion.length - 1
                          ? e.fecha.slice(5)
                          : '',
                        valor: e[tipo as keyof typeof e] as number,
                      }))}
                      color={config.color}
                      maxValor={Math.max(1600, ...data.eloEvolucion.map(e => (e[tipo as keyof typeof e] as number) + 100))}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SeccionCard>
  );
}
