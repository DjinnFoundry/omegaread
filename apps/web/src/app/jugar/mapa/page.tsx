'use client';

/**
 * Página del Mapa de Aventuras — Pantalla principal del niño
 * Muestra las zonas de juego y la mascota
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapaAventuras, type ZonaId } from '@/components/mapa/MapaAventuras';

interface EstudianteActivo {
  id: string;
  nombre: string;
  mascotaTipo: string | null;
  mascotaNombre: string | null;
}

export default function MapaPage() {
  const [estudiante, setEstudiante] = useState<EstudianteActivo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = sessionStorage.getItem('estudianteActivo');
    if (saved) {
      setEstudiante(JSON.parse(saved));
    } else {
      router.push('/jugar');
    }
  }, [router]);

  function handleZoneSelect(zone: ZonaId) {
    if (zone === 'bosque-letras') {
      setTimeout(() => {
        router.push('/jugar/vocales');
      }, 1500);
    }
    // Las demás zonas muestran "próximamente" dentro del MapaAventuras
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
    <MapaAventuras
      zonasActivas={['bosque-letras']}
      zonaRecomendada="bosque-letras"
      estrellas={0}
      onZoneSelect={handleZoneSelect}
      onStickersClick={handleStickersClick}
    />
  );
}
