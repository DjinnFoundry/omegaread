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
  startTransition,
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
  autoSelecting: boolean;
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
  // Always start null to avoid hydration mismatch (server has no sessionStorage)
  const [estudiante, setEstudianteState] = useState<EstudianteActivo | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(true);
  const [progress, setProgress] = useState<StudentProgress>(DEFAULT_PROGRESS);

  // On mount: restore from sessionStorage or auto-select first child
  useEffect(() => {
    const saved = leerEstudianteDesdeStorage();
    if (saved) {
      startTransition(() => {
        setEstudianteState(saved);
        setAutoSelecting(false);
      });
      return;
    }

    let cancelled = false;
    fetch('/api/estudiantes')
      .then((r) => {
        if (!r.ok) throw new Error('auth');
        return r.json();
      })
      .then((hijos: EstudianteActivo[]) => {
        if (cancelled) return;
        if (hijos.length > 0) {
          const primero = hijos[0];
          sessionStorage.setItem('estudianteActivo', JSON.stringify(primero));
          setEstudianteState(primero);
        }
        setAutoSelecting(false);
      })
      .catch(() => {
        if (!cancelled) setAutoSelecting(false);
      });

    return () => { cancelled = true; };
  }, []);

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
    setAutoSelecting(false);
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
    autoSelecting,
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
