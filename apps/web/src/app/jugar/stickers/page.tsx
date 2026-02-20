'use client';

/**
 * Página de colección de stickers.
 * Carga stickers reales ganados por el niño desde la DB.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlbumStickers, type StickerItem } from '@/components/gamificacion/AlbumStickers';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { Mascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';

/** Pool completo de stickers posibles (no ganados aparecen bloqueados) */
const POOL_STICKERS: Array<{ id: string; emoji: string; nombre: string }> = [
  { id: 'delfin', emoji: '🐬', nombre: 'Delfín' },
  { id: 'mariposa', emoji: '🦋', nombre: 'Mariposa' },
  { id: 'estrella', emoji: '🌟', nombre: 'Estrella' },
  { id: 'tortuga', emoji: '🐢', nombre: 'Tortuga' },
  { id: 'unicornio', emoji: '🦄', nombre: 'Unicornio' },
  { id: 'pulpo', emoji: '🐙', nombre: 'Pulpo' },
  { id: 'dinosaurio', emoji: '🦕', nombre: 'Dinosaurio' },
  { id: 'trebol', emoji: '🍀', nombre: 'Trébol' },
  { id: 'paleta', emoji: '🎨', nombre: 'Paleta' },
  { id: 'arcoiris', emoji: '🌈', nombre: 'Arcoíris' },
  { id: 'abeja', emoji: '🐝', nombre: 'Abeja' },
  { id: 'loro', emoji: '🦜', nombre: 'Loro' },
];

export default function StickersPage() {
  const router = useRouter();
  const { progress, recargarProgreso, estudiante } = useStudentProgress();

  // Recargar al llegar
  useEffect(() => {
    if (estudiante) {
      recargarProgreso();
    }
  }, [estudiante, recargarProgreso]);

  // Construir lista de stickers: los ganados + los bloqueados del pool
  const stickersGanadosEmojis = new Set(progress.stickers.map((s) => s.emoji));

  const stickersParaAlbum: StickerItem[] = POOL_STICKERS.map((s) => ({
    ...s,
    ganado: stickersGanadosEmojis.has(s.emoji),
  }));

  // Añadir stickers ganados que no estén en el pool (por si el niño ganó emojis no del pool)
  for (const ganado of progress.stickers) {
    if (!POOL_STICKERS.some((p) => p.emoji === ganado.emoji)) {
      stickersParaAlbum.push({
        id: ganado.id,
        emoji: ganado.emoji,
        nombre: ganado.nombre,
        ganado: true,
      });
    }
  }

  const totalGanados = stickersParaAlbum.filter((s) => s.ganado).length;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => router.push('/jugar/mapa')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-superficie shadow-sm text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-texto">🏷️ Mis stickers</h1>
      </div>

      {/* Mascota celebrando los stickers */}
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <Mascota
          estado={totalGanados > 0 ? 'celebrando' : 'feliz'}
          size="sm"
        />
        <MascotaDialogo
          texto={
            totalGanados > 0
              ? `¡Tienes ${totalGanados} stickers! ¡Sigue jugando para ganar más!`
              : '¡Juega para ganar tu primer sticker!'
          }
          onFinish={() => {}}
        />
      </div>

      <div className="flex-1 p-4">
        <AlbumStickers
          stickers={stickersParaAlbum}
          onClose={() => router.push('/jugar/mapa')}
        />
      </div>
    </main>
  );
}
