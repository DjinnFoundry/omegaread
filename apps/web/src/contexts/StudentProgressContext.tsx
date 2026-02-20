'use client';

/**
 * Context de progreso del estudiante.
 *
 * Mantiene estado compartido entre pantallas del nino:
 * estrellas, sesiones, habilidades generales.
 * Se sincroniza con la DB al cargar.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { cargarProgresoEstudiante } from '@/server/actions/session-actions';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface EstudianteActivo {
  id: string;
  nombre: string;
}

export interface StudentProgress {
  totalEstrellas: number;
  totalSesiones: number;
  loaded: boolean;
}

export interface StudentProgressContextType {
  estudiante: EstudianteActivo | null;
  progress: StudentProgress;
  setEstudiante: (est: EstudianteActivo) => void;
  recargarProgreso: () => Promise<void>;
  addEstrellas: (cantidad: number) => void;
}

// ─────────────────────────────────────────────
// DEFAULT VALUES
// ─────────────────────────────────────────────

const DEFAULT_PROGRESS: StudentProgress = {
  totalEstrellas: 0,
  totalSesiones: 0,
  loaded: false,
};

function leerEstudianteDesdeStorage(): EstudianteActivo | null {
  if (typeof window === 'undefined') return null;
  const saved = sessionStorage.getItem('estudianteActivo');
  if (!saved) return null;

  try {
    return JSON.parse(saved) as EstudianteActivo;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

const StudentProgressContext = createContext<StudentProgressContextType | null>(null);

export function useStudentProgress(): StudentProgressContextType {
  const ctx = useContext(StudentProgressContext);
  if (!ctx) {
    throw new Error('useStudentProgress debe usarse dentro de <StudentProgressProvider>');
  }
  return ctx;
}

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const [estudiante, setEstudianteState] = useState<EstudianteActivo | null>(
    () => leerEstudianteDesdeStorage(),
  );
  const [progress, setProgress] = useState<StudentProgress>(DEFAULT_PROGRESS);

  const recargarProgreso = useCallback(async () => {
    if (!estudiante) return;

    try {
      const data = await cargarProgresoEstudiante(estudiante.id);
      setProgress({
        totalEstrellas: data.totalEstrellas,
        totalSesiones: data.totalSesiones,
        loaded: true,
      });
    } catch (err) {
      console.warn('Error cargando progreso:', err);
      setProgress((prev) => ({ ...prev, loaded: true }));
    }
  }, [estudiante]);

  useEffect(() => {
    if (estudiante) {
      const timer = setTimeout(() => {
        void recargarProgreso();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [estudiante, recargarProgreso]);

  const setEstudiante = useCallback((est: EstudianteActivo) => {
    sessionStorage.setItem('estudianteActivo', JSON.stringify(est));
    setEstudianteState(est);
    setProgress(DEFAULT_PROGRESS);
  }, []);

  const addEstrellas = useCallback((cantidad: number) => {
    setProgress((prev) => ({
      ...prev,
      totalEstrellas: prev.totalEstrellas + cantidad,
    }));
  }, []);

  const value: StudentProgressContextType = {
    estudiante,
    progress,
    setEstudiante,
    recargarProgreso,
    addEstrellas,
  };

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}
