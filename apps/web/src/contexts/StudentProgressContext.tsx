'use client';

/**
 * Context de progreso del estudiante.
 *
 * Mantiene estado compartido entre todas las pantallas del niño:
 * estrellas, stickers, vocales dominadas, vocal actual.
 * Se sincroniza con la DB al cargar y se actualiza en tiempo real
 * cuando el niño gana estrellas/stickers.
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

export interface StickerData {
  id: string;
  emoji: string;
  nombre: string;
  ganado: boolean;
  ganadoEn?: Date;
}

export interface EstudianteActivo {
  id: string;
  nombre: string;
  mascotaTipo: string | null;
  mascotaNombre: string | null;
  diagnosticoCompletado?: boolean;
}

export interface StudentProgress {
  totalEstrellas: number;
  stickers: StickerData[];
  vocalesDominadas: string[];
  vocalActual: string;
  totalSesiones: number;
  loaded: boolean;
}

export interface StudentProgressContextType {
  /** Estudiante activo */
  estudiante: EstudianteActivo | null;
  /** Progreso cargado de la DB */
  progress: StudentProgress;
  /** Seleccionar un estudiante (al inicio de la sesión de juego) */
  setEstudiante: (est: EstudianteActivo) => void;
  /** Recargar progreso desde la DB */
  recargarProgreso: () => Promise<void>;
  /** Añadir estrellas (actualiza el estado local inmediatamente) */
  addEstrellas: (cantidad: number) => void;
  /** Añadir un sticker ganado */
  addSticker: (emoji: string, nombre: string) => void;
  /** Marcar una vocal como dominada */
  marcarVocalDominada: (vocal: string) => void;
}

// ─────────────────────────────────────────────
// DEFAULT VALUES
// ─────────────────────────────────────────────

const DEFAULT_PROGRESS: StudentProgress = {
  totalEstrellas: 0,
  stickers: [],
  vocalesDominadas: [],
  vocalActual: 'A',
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

/**
 * Hook para acceder al contexto de progreso del estudiante.
 * Lanza error si se usa fuera del provider.
 */
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

  // ── Cargar progreso de DB cuando hay estudiante ──
  const recargarProgreso = useCallback(async () => {
    if (!estudiante) return;

    try {
      const data = await cargarProgresoEstudiante(estudiante.id);
      setProgress({
        totalEstrellas: data.totalEstrellas,
        stickers: data.stickers,
        vocalesDominadas: data.vocalesDominadas,
        vocalActual: data.vocalActual,
        totalSesiones: data.totalSesiones,
        loaded: true,
      });
    } catch (err) {
      console.warn('Error cargando progreso:', err);
      setProgress((prev) => ({ ...prev, loaded: true }));
    }
  }, [estudiante]);

  // Auto-cargar progreso cuando cambia el estudiante
  useEffect(() => {
    if (estudiante) {
      const timer = setTimeout(() => {
        void recargarProgreso();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [estudiante, recargarProgreso]);

  // ── Seleccionar estudiante ──
  const setEstudiante = useCallback((est: EstudianteActivo) => {
    sessionStorage.setItem('estudianteActivo', JSON.stringify(est));
    setEstudianteState(est);
    // Reset progress para que se recargue
    setProgress(DEFAULT_PROGRESS);
  }, []);

  // ── Añadir estrellas (optimistic update) ──
  const addEstrellas = useCallback((cantidad: number) => {
    setProgress((prev) => ({
      ...prev,
      totalEstrellas: prev.totalEstrellas + cantidad,
    }));
  }, []);

  // ── Añadir sticker (optimistic update) ──
  const addSticker = useCallback((emoji: string, nombre: string) => {
    setProgress((prev) => ({
      ...prev,
      stickers: [
        ...prev.stickers,
        {
          id: `sticker-${Date.now()}`,
          emoji,
          nombre,
          ganado: true,
          ganadoEn: new Date(),
        },
      ],
    }));
  }, []);

  // ── Marcar vocal como dominada (optimistic update) ──
  const marcarVocalDominada = useCallback((vocal: string) => {
    setProgress((prev) => {
      const nuevasDominadas = prev.vocalesDominadas.includes(vocal)
        ? prev.vocalesDominadas
        : [...prev.vocalesDominadas, vocal];

      const ORDEN = ['A', 'E', 'I', 'O', 'U'];
      const nuevaActual = ORDEN.find((v) => !nuevasDominadas.includes(v)) ?? 'A';

      return {
        ...prev,
        vocalesDominadas: nuevasDominadas,
        vocalActual: nuevaActual,
      };
    });
  }, []);

  const value: StudentProgressContextType = {
    estudiante,
    progress,
    setEstudiante,
    recargarProgreso,
    addEstrellas,
    addSticker,
    marcarVocalDominada,
  };

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}
