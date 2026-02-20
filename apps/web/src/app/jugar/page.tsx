'use client';

/**
 * Pantalla de selección de perfil del niño
 * El padre elige qué hijo va a jugar
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Estudiante {
  id: string;
  nombre: string;
  mascotaTipo: string | null;
  mascotaNombre: string | null;
  diagnosticoCompletado: boolean;
}

const MASCOTA_EMOJIS: Record<string, string> = {
  gato: '🐱',
  perro: '🐶',
  buho: '🦉',
  dragon: '🐉',
};

export default function JugarPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/estudiantes')
      .then((r) => r.json())
      .then((data) => {
        setEstudiantes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function seleccionarNino(est: Estudiante) {
    // Guardar estudiante activo en sessionStorage
    sessionStorage.setItem('estudianteActivo', JSON.stringify(est));

    if (!est.diagnosticoCompletado) {
      router.push('/jugar/diagnostico');
    } else {
      router.push('/jugar/mapa');
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-4xl animate-bounce-suave">🌟</div>
      </main>
    );
  }

  if (estudiantes.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
        <span className="text-6xl">🐱</span>
        <p className="text-xl font-bold text-texto text-center">
          ¡Primero un padre debe crear tu perfil!
        </p>
        <a
          href="/padre/login"
          className="rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
        >
          Ir a inicio
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-fondo p-6">
      <div className="text-5xl animate-float">🌤️</div>
      <h1 className="text-3xl font-extrabold text-texto text-center">
        ¿Quién va a jugar?
      </h1>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {estudiantes.map((est) => (
          <button
            key={est.id}
            onClick={() => seleccionarNino(est)}
            className="flex items-center gap-4 rounded-3xl bg-superficie px-6 py-5 shadow-md active:scale-[0.97] transition-transform hover:ring-2 hover:ring-turquesa"
          >
            <span className="text-5xl">
              {MASCOTA_EMOJIS[est.mascotaTipo ?? 'gato']}
            </span>
            <div className="text-left">
              <p className="text-xl font-bold text-texto">{est.nombre}</p>
              {est.mascotaNombre && (
                <p className="text-sm text-texto-suave">
                  con {est.mascotaNombre}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
