'use client';

/**
 * Dashboard del padre - Pagina de Resumen.
 * Muestra tarjetas de resumen por hijo + recomendaciones.
 * Los datos llegan via DashboardDataContext (fetched en layout.tsx).
 */
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { DashboardHijo } from '@/components/dashboard/DashboardHijo';
import { SeccionRecomendaciones } from '@/components/dashboard/SeccionRecomendaciones';

export default function ResumenPage() {
  const { resumenes, dashboard, nombrePadre } = useDashboardData();

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-texto">
          Hola, {nombrePadre}
        </h1>
        <p className="text-sm text-texto-suave">
          Panel de seguimiento familiar
        </p>
      </div>

      {/* Resumen rapido de hijos */}
      <div className="space-y-4 mb-6">
        {resumenes.map(({ hijo, resumen }) => (
          <DashboardHijo
            key={hijo.id}
            nombre={hijo.nombre}
            fechaNacimiento={hijo.fechaNacimiento}
            resumen={resumen}
          />
        ))}
      </div>

      {/* Recomendaciones para casa */}
      {dashboard && <SeccionRecomendaciones data={dashboard} />}

      {/* Empty state when no dashboard data */}
      {!dashboard && resumenes.length > 0 && (
        <div className="mt-4 rounded-3xl bg-superficie p-6 text-center shadow-sm">
          <p className="mt-2 text-texto-suave">
            Aun no hay datos suficientes para mostrar el dashboard detallado.
            El nino necesita completar algunas sesiones de lectura.
          </p>
        </div>
      )}
    </>
  );
}
