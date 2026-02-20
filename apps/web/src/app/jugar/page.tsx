'use client';

/**
 * Pantalla de seleccion de perfil del nino.
 * El padre elige que hijo va a leer.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { AuthGuardNino } from '@/components/ui/AuthGuardNino';

interface Estudiante {
  id: string;
  nombre: string;
}

export default function JugarPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const router = useRouter();
  const { setEstudiante } = useStudentProgress();

  useEffect(() => {
    fetch('/api/estudiantes')
      .then((r) => {
        if (r.status === 401) {
          setAuthError(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setEstudiantes(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function seleccionarNino(est: Estudiante) {
    setEstudiante(est);
    router.push('/jugar/lectura');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-4xl animate-bounce-suave">🌟</div>
      </main>
    );
  }

  if (authError) {
    return <AuthGuardNino tipo="sin-sesion" />;
  }

  if (estudiantes.length === 0) {
    return <AuthGuardNino tipo="sin-perfil" />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-fondo p-6">
      <div className="text-5xl animate-float">📚</div>
      <h1 className="text-3xl font-extrabold text-texto text-center">
        ¿Quien va a leer?
      </h1>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {estudiantes.map((est) => (
          <button
            key={est.id}
            onClick={() => seleccionarNino(est)}
            className="flex items-center gap-4 rounded-3xl bg-superficie px-6 py-5 shadow-md active:scale-[0.97] transition-transform hover:ring-2 hover:ring-turquesa"
          >
            <span className="text-5xl">📖</span>
            <p className="text-xl font-bold text-texto">{est.nombre}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
