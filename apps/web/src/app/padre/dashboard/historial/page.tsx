'use client';

/**
 * Dashboard del padre - Pagina de Historial.
 * Lista de sesiones de lectura con detalle expandible.
 */
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { SeccionHistorial } from '@/components/dashboard/SeccionHistorial';

export default function HistorialPage() {
  const { dashboard } = useDashboardData();

  if (!dashboard) {
    return (
      <div className="rounded-3xl bg-superficie p-6 text-center shadow-sm">
        <p className="text-texto-suave">
          Aun no hay historial disponible.
          El nino necesita completar algunas sesiones de lectura.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-texto">
          Historial de {dashboard.nombreEstudiante}
        </h1>
        <p className="text-sm text-texto-suave">
          Ultimas sesiones de lectura completadas
        </p>
      </div>

      <SeccionHistorial data={dashboard} />
    </>
  );
}
