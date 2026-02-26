'use client';

/**
 * Dashboard del padre - Pagina de Ruta de Aprendizaje.
 * Tech tree SVG + topics recientes + dominios + sugerencias.
 */
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { SeccionRutaAprendizaje } from '@/components/dashboard/SeccionRutaAprendizaje';

export default function RutaPage() {
  const { dashboard } = useDashboardData();

  if (!dashboard) {
    return (
      <div className="rounded-3xl bg-superficie p-6 text-center shadow-sm">
        <p className="text-texto-suave">
          Aun no hay datos suficientes para mostrar la ruta de aprendizaje.
          El nino necesita completar algunas sesiones de lectura.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-texto">
          Ruta de {dashboard.nombreEstudiante}
        </h1>
        <p className="text-sm text-texto-suave">
          Mapa de aprendizaje, topics explorados y siguientes pasos
        </p>
      </div>

      <SeccionRutaAprendizaje data={dashboard} />
    </>
  );
}
