'use client';

/**
 * Seccion de recomendaciones para casa (tips para padres).
 * Extraida de DashboardPadreDetalle.
 */
import { Lightbulb } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';

interface Props {
  data: DashboardPadreData;
}

export function SeccionRecomendaciones({ data }: Props) {
  if (data.recomendaciones.length === 0) return null;

  return (
    <SeccionCard titulo="Recomendaciones para casa" icon={<Lightbulb size={18} className="text-ambar" />}>
      <div className="space-y-3">
        {data.recomendaciones.map((rec, i) => (
          <div key={i} className="rounded-2xl bg-amarillo/15 p-3">
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
