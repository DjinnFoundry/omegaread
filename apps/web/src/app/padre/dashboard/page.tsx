import { requireAuth } from '@/server/auth';
import { obtenerResumenProgreso } from '@/server/actions/student-actions';
import Link from 'next/link';
import { DashboardHijo } from '@/components/dashboard/DashboardHijo';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

/**
 * Dashboard del padre — Vista principal
 * Muestra resumen de progreso de cada hijo
 */
export default async function DashboardPage() {
  const padre = await requireAuth();
  const hijos = padre.students ?? [];

  // Obtener resumen de cada hijo
  const resumenes = await Promise.all(
    hijos.map(async (hijo) => {
      const resumen = await obtenerResumenProgreso(hijo.id);
      return { hijo, resumen };
    })
  );

  return (
    <main className="min-h-screen bg-fondo p-4 md:p-6">
      {/* Header */}
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-texto">
              👋 Hola, {padre.nombre}
            </h1>
            <p className="text-sm text-texto-suave">
              Panel de seguimiento familiar
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Lista de hijos */}
        {resumenes.length === 0 ? (
          <div className="rounded-3xl bg-superficie p-8 text-center shadow-sm">
            <span className="text-5xl">🧒</span>
            <h2 className="mt-4 text-xl font-bold text-texto">
              Aún no hay niños registrados
            </h2>
            <p className="mt-2 text-texto-suave">
              Crea el perfil de tu hijo para empezar la aventura
            </p>
            <Link
              href="/padre/nuevo-hijo"
              className="mt-4 inline-block rounded-2xl bg-coral px-6 py-3 font-bold text-white shadow-md active:scale-95 transition-transform"
            >
              + Añadir hijo
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
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
              + Añadir otro hijo
            </Link>
          </div>
        )}

        {/* Sugerencia offline personalizada */}
        {resumenes.length > 0 && (
          <div className="mt-8 rounded-3xl bg-amarillo/20 p-5">
            <p className="text-sm font-semibold text-texto">
              💡 Sugerencia para hoy
            </p>
            <p className="mt-1 text-sm text-texto-suave">
              {resumenes[0]?.resumen?.sugerenciaOffline ??
                'Practiquen las vocales en casa: busquen objetos que empiecen con A (avión, agua, árbol). ¡El aprendizaje también ocurre fuera de la pantalla!'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
