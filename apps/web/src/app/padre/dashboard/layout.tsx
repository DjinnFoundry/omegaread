import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { obtenerResumenProgreso } from '@/server/actions/student-actions';
import { obtenerDashboardPadre } from '@/server/actions/dashboard-actions';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import type { ResumenHijo } from '@/contexts/DashboardDataContext';

/**
 * Layout del dashboard del padre.
 * Server component: hace fetch de datos una vez y los pasa al shell client.
 * Todas las sub-rutas (resumen, progreso, ruta, perfil, historial)
 * reciben datos via React Context desde DashboardShell.
 *
 * El ?hijo= param se maneja via la pagina raiz (page.tsx) que tiene
 * acceso a searchParams. Por defecto el layout usa el primer hijo.
 * Si hay multiples hijos y se necesita cambiar, la seleccion se pasa
 * al shell client que re-renderiza con los datos correctos.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const padre = await requireAuth();
  const hijos = padre.students ?? [];

  if (hijos.length === 0) {
    redirect('/padre/nuevo-hijo');
  }

  // Obtener resumen de cada hijo
  const resumenes: ResumenHijo[] = await Promise.all(
    hijos.map(async (hijo) => {
      const resumen = await obtenerResumenProgreso(hijo.id);
      return {
        hijo: {
          id: hijo.id,
          nombre: hijo.nombre,
          fechaNacimiento: hijo.fechaNacimiento,
        },
        resumen: resumen
          ? {
              sesionesHoy: resumen.sesionesHoy,
              tiempoHoyMin: resumen.tiempoHoyMin,
              totalEstrellas: resumen.totalEstrellas,
              racha: resumen.racha,
              totalSesiones: resumen.totalSesiones,
              actividadMes: resumen.actividadMes,
            }
          : null,
      };
    })
  );

  // Default to first child. The ?hijo= query param is handled
  // client-side in DashboardShell via useSearchParams().
  const defaultHijoId = hijos[0]?.id ?? null;
  const dashboard = defaultHijoId
    ? await obtenerDashboardPadre(defaultHijoId).catch(() => null)
    : null;

  return (
    <DashboardShell
      resumenes={resumenes}
      dashboard={dashboard}
      nombrePadre={padre.nombre}
      hijoSeleccionadoId={defaultHijoId}
    >
      {children}
    </DashboardShell>
  );
}
