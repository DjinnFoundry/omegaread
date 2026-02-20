'use client';

/**
 * Página del Mapa de Aventuras — Pantalla principal del niño
 * Muestra las zonas de juego, la mascota y el progreso real del niño.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapaAventuras, type ZonaId } from '@/components/mapa/MapaAventuras';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';

export default function MapaPage() {
  const { estudiante, progress, recargarProgreso } = useStudentProgress();
  const router = useRouter();
  const [saludoMostrado, setSaludoMostrado] = useState(false);

  // Recargar progreso desde DB al llegar al mapa
  useEffect(() => {
    if (estudiante) {
      recargarProgreso();
    }
  }, [estudiante, recargarProgreso]);

  // Redirigir si no hay estudiante activo
  useEffect(() => {
    if (!estudiante) {
      // Esperar un tick para que el context se hidrate de sessionStorage
      const timer = setTimeout(() => {
        const saved = sessionStorage.getItem('estudianteActivo');
        if (!saved) {
          router.push('/jugar');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [estudiante, router]);

  function handleZoneSelect(zone: ZonaId) {
    if (zone === 'bosque-letras') {
      setTimeout(() => {
        router.push('/jugar/vocales');
      }, 1500);
    }
  }

  function handleStickersClick() {
    router.push('/jugar/stickers');
  }

  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-4xl animate-bounce-suave">🌟</div>
      </main>
    );
  }

  return (
    <>
      {/* Saludo de la mascota al llegar */}
      {!saludoMostrado && progress.loaded && (
        <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-8 pointer-events-none">
          <MascotaDialogo
            texto={`¡Hola ${estudiante.nombre}! ${
              progress.totalEstrellas > 0
                ? `¡Ya tienes ${progress.totalEstrellas} estrellas!`
                : '¡Vamos a jugar!'
            }`}
            onFinish={() => setSaludoMostrado(true)}
          />
        </div>
      )}
      <MapaAventuras
        zonasActivas={['bosque-letras']}
        zonaRecomendada="bosque-letras"
        estrellas={progress.totalEstrellas}
        onZoneSelect={handleZoneSelect}
        onStickersClick={handleStickersClick}
        nombreNino={estudiante.nombre}
      />
    </>
  );
}
