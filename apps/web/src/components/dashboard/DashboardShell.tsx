'use client';

/**
 * Client shell para el dashboard del padre.
 * Provee data context + sidebar + area de contenido.
 */
import type { ReactNode } from 'react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import {
  DashboardDataProvider,
  type ResumenHijo,
} from '@/contexts/DashboardDataContext';
import { DashboardSidebar } from './DashboardSidebar';

interface Props {
  children: ReactNode;
  resumenes: ResumenHijo[];
  dashboard: DashboardPadreData | null;
  nombrePadre: string;
  hijoSeleccionadoId: string | null;
}

export function DashboardShell({
  children,
  resumenes,
  dashboard,
  nombrePadre,
  hijoSeleccionadoId,
}: Props) {
  return (
    <DashboardDataProvider
      resumenes={resumenes}
      dashboard={dashboard}
      nombrePadre={nombrePadre}
      hijoSeleccionadoId={hijoSeleccionadoId}
    >
      <div className="flex min-h-screen bg-fondo">
        <DashboardSidebar />

        {/* Desktop: offset for sidebar width. Mobile: bottom padding for bottom nav */}
        <main className="flex-1 md:ml-56 pb-20 md:pb-0 overflow-x-hidden">
          <div className="mx-auto max-w-2xl p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </DashboardDataProvider>
  );
}
