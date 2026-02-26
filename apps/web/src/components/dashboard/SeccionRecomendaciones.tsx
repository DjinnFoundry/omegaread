'use client';

/**
 * Seccion de recomendaciones para casa (tips para padres).
 * Extraida de DashboardPadreDetalle.
 */
import { Lightbulb, X } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';
import { useDismissedRecommendations } from '@/hooks/useDismissedRecommendations';

interface Props {
  data: DashboardPadreData;
}

export function SeccionRecomendaciones({ data }: Props) {
  const { isDismissed, dismiss } = useDismissedRecommendations(data.studentId);

  const visible = data.recomendaciones
    .filter(rec => !isDismissed(rec.tipo))
    .slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <SeccionCard titulo="Recomendaciones para casa" icon={<Lightbulb size={18} className="text-ambar" />}>
      <div className="space-y-3">
        {visible.map((rec, i) => (
          <div key={rec.tipo} className="relative rounded-2xl bg-amarillo/15 p-3 pr-8">
            <button
              type="button"
              onClick={() => dismiss(rec.tipo)}
              className="absolute right-2 top-2 rounded-full p-0.5 text-texto-suave/60 transition-colors hover:bg-negro/10 hover:text-texto"
              aria-label="Descartar recomendacion"
            >
              <X size={14} />
            </button>
            <p className="text-xs font-bold text-texto">{rec.mensaje}</p>
            <p className="mt-1 text-[11px] text-texto-suave leading-relaxed">
              {rec.detalle}
            </p>
          </div>
        ))}
      </div>
    </SeccionCard>
  );
}
