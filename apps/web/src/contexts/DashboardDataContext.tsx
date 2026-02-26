'use client';

/**
 * Context para datos del dashboard del padre.
 * El layout server component hace el fetch una vez,
 * lo pasa al DashboardShell (client), y este lo provee via context
 * a todas las sub-rutas.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface ResumenHijo {
  hijo: {
    id: string;
    nombre: string;
    fechaNacimiento: Date;
  };
  resumen: {
    sesionesHoy: number;
    tiempoHoyMin: number;
    totalEstrellas: number;
    racha: number;
    totalSesiones: number;
    actividadMes: Record<string, number>;
  } | null;
}

export interface DashboardDataContextType {
  resumenes: ResumenHijo[];
  dashboard: DashboardPadreData | null;
  nombrePadre: string;
  hijoSeleccionadoId: string | null;
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

const DashboardDataContext = createContext<DashboardDataContextType | null>(null);

export function useDashboardData(): DashboardDataContextType {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData debe usarse dentro de <DashboardDataProvider>');
  }
  return ctx;
}

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode;
  resumenes: ResumenHijo[];
  dashboard: DashboardPadreData | null;
  nombrePadre: string;
  hijoSeleccionadoId: string | null;
}

export function DashboardDataProvider({
  children,
  resumenes,
  dashboard,
  nombrePadre,
  hijoSeleccionadoId,
}: ProviderProps) {
  return (
    <DashboardDataContext.Provider
      value={{ resumenes, dashboard, nombrePadre, hijoSeleccionadoId }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}
