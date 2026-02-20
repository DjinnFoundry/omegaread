'use client';

/**
 * Página de colección de stickers
 */
import { useRouter } from 'next/navigation';
import { AlbumStickers, type StickerItem } from '@/components/gamificacion/AlbumStickers';

// Pool completo de stickers posibles
const TODOS_STICKERS: StickerItem[] = [
  { id: 'delfin', emoji: '🐬', nombre: 'Delfín', ganado: true },
  { id: 'mariposa', emoji: '🦋', nombre: 'Mariposa', ganado: true },
  { id: 'estrella', emoji: '🌟', nombre: 'Estrella', ganado: false },
  { id: 'tortuga', emoji: '🐢', nombre: 'Tortuga', ganado: false },
  { id: 'unicornio', emoji: '🦄', nombre: 'Unicornio', ganado: false },
  { id: 'pulpo', emoji: '🐙', nombre: 'Pulpo', ganado: false },
  { id: 'dinosaurio', emoji: '🦕', nombre: 'Dinosaurio', ganado: false },
  { id: 'trebol', emoji: '🍀', nombre: 'Trébol', ganado: false },
  { id: 'paleta', emoji: '🎨', nombre: 'Paleta', ganado: false },
  { id: 'arcoiris', emoji: '🌈', nombre: 'Arcoíris', ganado: false },
  { id: 'abeja', emoji: '🐝', nombre: 'Abeja', ganado: false },
  { id: 'loro', emoji: '🦜', nombre: 'Loro', ganado: false },
];

export default function StickersPage() {
  const router = useRouter();

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

      <div className="flex-1 p-4">
        <AlbumStickers
          stickers={TODOS_STICKERS}
          onClose={() => router.push('/jugar/mapa')}
        />
      </div>
    </main>
  );
}
