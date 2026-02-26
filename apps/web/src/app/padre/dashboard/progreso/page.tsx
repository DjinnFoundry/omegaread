'use client';

/**
 * Dashboard del padre - Pagina de Progreso.
 * Comprension Lectora + Comprension por Tipo + Normativa + Velocidad Lectura.
 */
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { SeccionComprension } from '@/components/dashboard/SeccionComprension';
import { SeccionTipos } from '@/components/dashboard/SeccionTipos';
import { SeccionNormativa } from '@/components/dashboard/SeccionNormativa';
import { SeccionWpm } from '@/components/dashboard/SeccionWpm';

export default function ProgresoPage() {
  const { dashboard } = useDashboardData();

  if (!dashboard) {
    return (
      <div className="rounded-3xl bg-superficie p-6 text-center shadow-sm">
        <p className="text-texto-suave">
          Aun no hay datos suficientes para mostrar el progreso.
          El nino necesita completar algunas sesiones de lectura.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-texto">
          Progreso de {dashboard.nombreEstudiante}
        </h1>
        <p className="text-sm text-texto-suave">
          Comprension, desglose por tipo, normativa y velocidad
        </p>
      </div>

      <div className="space-y-6">
        <SeccionComprension data={dashboard} />
        <SeccionTipos data={dashboard} />
        <SeccionNormativa data={dashboard} />
        <SeccionWpm data={dashboard} />
      </div>
    </>
  );
}
