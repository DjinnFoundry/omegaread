'use client';

/**
 * Dashboard del padre - Pagina de Perfil.
 * Perfil vivo del lector + Ajustes de lectura.
 */
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { SeccionPerfilVivo } from '@/components/dashboard/SeccionPerfilVivo';
import { SeccionAjustesLectura } from '@/components/dashboard/SeccionAjustesLectura';

export default function PerfilPage() {
  const { dashboard } = useDashboardData();

  if (!dashboard) {
    return (
      <div className="rounded-3xl bg-superficie p-6 text-center shadow-sm">
        <p className="text-texto-suave">
          Aun no hay datos suficientes para mostrar el perfil.
          El nino necesita completar algunas sesiones de lectura.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-texto">
          Perfil de {dashboard.nombreEstudiante}
        </h1>
        <p className="text-sm text-texto-suave">
          Personalidad, preferencias y ajustes de lectura
        </p>
      </div>

      <div className="space-y-6">
        <SeccionPerfilVivo data={dashboard} />
        <SeccionAjustesLectura data={dashboard} />
      </div>
    </>
  );
}
