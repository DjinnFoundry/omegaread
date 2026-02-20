'use client';

import { useState, useCallback } from 'react';
import { click as sonidoClick } from '@/lib/audio/sonidos';
import { BotonGrande } from '@/components/ui/BotonGrande';

/**
 * Un sticker en la colección.
 */
export interface StickerItem {
  /** ID único del sticker */
  id: string;
  /** Emoji del sticker */
  emoji: string;
  /** Nombre del sticker */
  nombre: string;
  /** Si ha sido ganado */
  ganado: boolean;
}

/**
 * Props del componente AlbumStickers.
 */
export interface AlbumStickersProps {
  /** Lista de todos los stickers (ganados y no ganados) */
  stickers: StickerItem[];
  /** Callback al cerrar el álbum */
  onClose?: () => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Colección / álbum de stickers ganados.
 * Grid de 3 columnas. Ganados brillan, no ganados son sombras.
 * Touch para ver sticker en grande.
 */
export function AlbumStickers({
  stickers,
  onClose,
  className = '',
}: AlbumStickersProps) {
  const [stickerSeleccionado, setStickerSeleccionado] = useState<StickerItem | null>(null);

  const stickersGanados = stickers.filter((s) => s.ganado).length;

  const manejarStickerClick = useCallback((sticker: StickerItem) => {
    if (!sticker.ganado) return;
    sonidoClick();
    setStickerSeleccionado(sticker);
  }, []);

  const cerrarDetalle = useCallback(() => {
    setStickerSeleccionado(null);
  }, []);

  return (
    <div
      className={`flex flex-col min-h-screen w-full ${className}`}
      style={{ backgroundColor: '#FFF9F0' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <BotonGrande
          variante="secundario"
          icono="←"
          onClick={onClose}
          tamano="pequeno"
          ariaLabel="Volver"
        />
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          {/* Contador visual: emojis de sticker */}
          <div className="flex gap-0.5">
            {Array.from({ length: stickers.length }, (_, i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: i < stickersGanados ? '#FFE66D' : '#E8E0D8',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid de stickers */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => manejarStickerClick(sticker)}
              disabled={!sticker.ganado}
              aria-label={sticker.ganado ? sticker.nombre : 'Sticker no ganado'}
              className={`
                flex flex-col items-center justify-center
                aspect-square rounded-2xl
                transition-all duration-200
                touch-manipulation select-none
                ${sticker.ganado
                  ? 'sticker-shine active:scale-90 cursor-pointer'
                  : 'cursor-default'
                }
              `}
              style={{
                backgroundColor: sticker.ganado ? 'white' : '#F5F0EB',
                border: sticker.ganado ? '2px solid #FFE66D' : '2px dashed #D7CCC8',
              }}
            >
              {sticker.ganado ? (
                <span className="text-5xl">{sticker.emoji}</span>
              ) : (
                <span className="text-4xl opacity-20">❓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Detalle de sticker seleccionado (modal) */}
      {stickerSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(93, 64, 55, 0.5)' }}
          onClick={cerrarDetalle}
          role="dialog"
          aria-label={`Sticker: ${stickerSeleccionado.nombre}`}
        >
          <div
            className="flex flex-col items-center rounded-3xl p-8"
            style={{
              backgroundColor: 'white',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15)',
              animation: 'pop-in 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-9xl mb-4">{stickerSeleccionado.emoji}</span>
            <span
              className="text-lg font-bold mb-4"
              style={{ color: '#5D4037' }}
            >
              {stickerSeleccionado.nombre}
            </span>
            <BotonGrande
              variante="celebracion"
              icono="👍"
              onClick={cerrarDetalle}
              tamano="normal"
            />
          </div>
        </div>
      )}

    </div>
  );
}
