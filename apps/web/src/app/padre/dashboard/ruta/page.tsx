'use client';

/**
 * Dashboard del padre - Pagina de Ruta de Aprendizaje.
 * Full-screen tech tree map. Heading removed to maximize map space;
 * the bottom tab bar already identifies this as "Ruta".
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

  return <SeccionRutaAprendizaje data={dashboard} />;
}
