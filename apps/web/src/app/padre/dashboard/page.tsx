import { requireAuth } from '@/server/auth';
import { obtenerResumenProgreso } from '@/server/actions/student-actions';
import { obtenerDashboardPadre } from '@/server/actions/dashboard-actions';
import Link from 'next/link';
import { DashboardHijo } from '@/components/dashboard/DashboardHijo';
import { DashboardPadreDetalle } from '@/components/dashboard/DashboardPadreDetalle';
import { SelectorHijoDashboard } from '@/components/dashboard/SelectorHijoDashboard';

/**
 * Dashboard del padre — Vista principal
 * Sprint 5: Muestra resumen + dashboard detallado por hijo.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hijo?: string }>;
}) {
  const padre = await requireAuth();
  const hijos = padre.students ?? [];
  const params = await searchParams;

  // Obtener resumen de cada hijo
  const resumenes = await Promise.all(
    hijos.map(async (hijo) => {
      const resumen = await obtenerResumenProgreso(hijo.id);
      return { hijo, resumen };
    })
  );

  // Hijo seleccionado para dashboard detallado
  const hijoSeleccionadoId = params.hijo ?? hijos[0]?.id;
  const dashboardDetalle = hijoSeleccionadoId
    ? await obtenerDashboardPadre(hijoSeleccionadoId).catch(() => null)
    : null;

  return (
    <main className="min-h-screen bg-fondo p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-texto">
            Hola, {padre.nombre}
          </h1>
          <p className="text-sm text-texto-suave">
            Panel de seguimiento familiar
          </p>
        </div>

        {/* Lista de hijos (resumen) */}
        {resumenes.length === 0 ? (
          <div className="rounded-3xl bg-superficie p-8 text-center shadow-sm">
            <span className="text-5xl">🧒</span>
            <h2 className="mt-4 text-xl font-bold text-texto">
              Aun no hay ninos registrados
            </h2>
            <p className="mt-2 text-texto-suave">
              Crea el perfil de tu hijo para empezar la aventura
            </p>
            <Link
              href="/padre/nuevo-hijo"
              className="mt-4 inline-block rounded-2xl bg-coral px-6 py-3 font-bold text-white shadow-md active:scale-95 transition-transform"
            >
              + Anadir hijo
            </Link>
          </div>
        ) : (
          <>
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

              <Link
                href="/padre/nuevo-hijo"
                className="block rounded-2xl border-2 border-dashed border-neutro/30 p-4 text-center text-texto-suave hover:border-turquesa hover:text-turquesa transition-colors"
              >
                + Anadir otro hijo
              </Link>
            </div>

            {/* Selector de hijo para dashboard detallado */}
            {hijos.length > 1 && (
              <SelectorHijoDashboard
                hijos={hijos.map(h => ({ id: h.id, nombre: h.nombre }))}
                hijoSeleccionadoId={hijoSeleccionadoId}
              />
            )}

            {/* Dashboard detallado */}
            {dashboardDetalle ? (
              <div className="mt-4">
                <h2 className="text-lg font-bold text-texto mb-4">
                  Detalle de {dashboardDetalle.nombreEstudiante}
                </h2>
                <DashboardPadreDetalle data={dashboardDetalle} />
              </div>
            ) : hijoSeleccionadoId ? (
              <div className="mt-4 rounded-3xl bg-superficie p-6 text-center shadow-sm">
                <span className="text-4xl">📊</span>
                <p className="mt-2 text-texto-suave">
                  Aun no hay datos suficientes para mostrar el dashboard detallado.
                  El nino necesita completar algunas sesiones de lectura.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
