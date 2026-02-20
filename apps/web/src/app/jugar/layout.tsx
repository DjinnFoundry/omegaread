'use client';

/**
 * Layout para las rutas de juego del niño.
 * Envuelve con el provider de progreso para estado compartido entre pantallas.
 * Incluye ErrorBoundary con UI amigable para capturar errores de runtime.
 */
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';
import { ErrorBoundaryNino } from '@/components/ui/ErrorBoundaryNino';

export default function JugarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryNino rutaVolver="/jugar">
      <StudentProgressProvider>{children}</StudentProgressProvider>
    </ErrorBoundaryNino>
  );
}
