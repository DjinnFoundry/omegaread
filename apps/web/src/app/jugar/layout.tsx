'use client';

/**
 * Layout para las rutas de juego del niño.
 * Envuelve con el provider de progreso para estado compartido entre pantallas.
 */
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';

export default function JugarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentProgressProvider>{children}</StudentProgressProvider>;
}
