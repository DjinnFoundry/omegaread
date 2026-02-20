'use client';

/**
 * Página de diagnóstico invisible
 * "Juego" que evalúa al niño sin que lo sepa
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosticoInvisible } from '@/components/diagnostico/DiagnosticoInvisible';
import { Mascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';
import type { DiagnosticoNivel } from '@omegaread/db/schema';

export default function DiagnosticoPage() {
  const router = useRouter();
  const [estudiante, setEstudiante] = useState<{ id: string; nombre: string; mascotaNombre: string | null } | null>(null);
  const [fase, setFase] = useState<'intro' | 'jugando' | 'fin'>('intro');

  useEffect(() => {
    const saved = sessionStorage.getItem('estudianteActivo');
    if (saved) {
      setEstudiante(JSON.parse(saved));
    } else {
      router.push('/jugar');
    }
  }, [router]);

  async function handleComplete(resultado: DiagnosticoNivel) {
    setFase('fin');

    // Guardar en el servidor
    if (estudiante) {
      try {
        const { guardarDiagnostico } = await import('@/server/actions/student-actions');
        await guardarDiagnostico(estudiante.id, resultado);
      } catch {
        console.warn('No se pudo guardar el diagnóstico');
      }
    }

    // Ir al mapa después de la celebración
    setTimeout(() => {
      router.push('/jugar/mapa');
    }, 3000);
  }

  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-4xl animate-bounce-suave">🌟</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      {fase === 'intro' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <Mascota tipo="gato" estado="feliz" size="lg" />
          <MascotaDialogo
            texto={`¡Hola ${estudiante.nombre}! ¡Vamos a jugar juntos! ¿Estás listo?`}
            onFinish={() => {}}
          />
          <button
            onClick={() => setFase('jugando')}
            className="rounded-3xl bg-coral px-10 py-5 text-2xl font-bold text-white shadow-lg active:scale-95 transition-transform animate-pulse-brillo"
          >
            🎮 ¡Sí, a jugar!
          </button>
        </div>
      )}

      {fase === 'jugando' && (
        <DiagnosticoInvisible
          nombreNino={estudiante.nombre}
          onComplete={handleComplete}
        />
      )}

      {fase === 'fin' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <Mascota tipo="gato" estado="celebrando" size="lg" />
          <MascotaDialogo
            texto={`¡Genial, ${estudiante.nombre}! ¡${estudiante.mascotaNombre ?? 'Tu mascota'} y yo ya sabemos cómo ayudarte! ¡Vamos a la aventura!`}
            onFinish={() => {}}
          />
          <div className="text-6xl animate-bounce-suave">🎉</div>
        </div>
      )}
    </main>
  );
}
