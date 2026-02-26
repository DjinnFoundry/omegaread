'use client';

/**
 * Dashboard detallado del padre para un hijo especifico.
 * Elo-centric: muestra rating global, evolucion, desglose por tipo y WPM.
 *
 * NOTE: The route-based dashboard (apps/web/src/app/padre/dashboard/) composes
 * these same sections per-page. This component remains as a single-page fallback
 * that renders all sections together.
 */
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionComprension } from './SeccionComprension';
import { SeccionAjustesLectura } from './SeccionAjustesLectura';
import { SeccionPerfilVivo } from './SeccionPerfilVivo';
import { SeccionRutaAprendizaje } from './SeccionRutaAprendizaje';
import { SeccionNormativa } from './SeccionNormativa';
import { SeccionTipos } from './SeccionTipos';
import { SeccionWpm } from './SeccionWpm';
import { SeccionHistorial } from './SeccionHistorial';
import { SeccionRecomendaciones } from './SeccionRecomendaciones';

interface Props {
  data: DashboardPadreData;
}

export function DashboardPadreDetalle({ data }: Props) {
  return (
    <div className="space-y-6">
      <SeccionComprension data={data} />
      <SeccionAjustesLectura data={data} />
      <SeccionPerfilVivo data={data} />
      <SeccionRutaAprendizaje data={data} />
      <SeccionNormativa data={data} />
      <SeccionTipos data={data} />
      <SeccionWpm data={data} />
      <SeccionHistorial data={data} />
      <SeccionRecomendaciones data={data} />
    </div>
  );
}
