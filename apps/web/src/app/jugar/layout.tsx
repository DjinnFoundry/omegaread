'use client';

/**
 * Layout para las rutas de juego del nino.
 * Envuelve con el provider de progreso para estado compartido entre pantallas.
 * Incluye ErrorBoundary con UI amigable y NavNino para navegacion consistente.
 */
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';
import { ErrorBoundaryNino } from '@/components/ui/ErrorBoundaryNino';
import { NavNino } from '@/components/ui/NavNino';

export default function JugarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryNino rutaVolver="/jugar">
      <StudentProgressProvider>
        <NavNino />
        {children}
      </StudentProgressProvider>
    </ErrorBoundaryNino>
  );
}
