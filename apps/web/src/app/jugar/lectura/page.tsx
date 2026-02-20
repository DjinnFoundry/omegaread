'use client';

/**
 * Ruta provisional para el loop de lectura adaptativa.
 * TODO: reemplazar con el componente real del core adaptativo.
 */
import { useStudentProgress } from '@/contexts/StudentProgressContext';

export default function LecturaPage() {
  const { estudiante } = useStudentProgress();

  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <p className="text-texto-suave">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <span className="text-6xl">📚</span>
      <h1 className="text-2xl font-extrabold text-texto text-center">
        Hola, {estudiante.nombre}
      </h1>
      <p className="text-base text-texto-suave text-center max-w-xs">
        Pronto tendras historias personalizadas aqui.
      </p>
    </main>
  );
}
