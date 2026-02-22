'use client';

/**
 * Layout para las rutas de juego del nino.
 * Envuelve con el provider de progreso para estado compartido entre pantallas.
 * Incluye ErrorBoundary con UI amigable.
 */
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';
import { ErrorBoundaryNino } from '@/components/ui/ErrorBoundaryNino';

export default function JugarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryNino rutaVolver="/jugar/lectura">
      <StudentProgressProvider>
        {children}
      </StudentProgressProvider>
    </ErrorBoundaryNino>
  );
}
