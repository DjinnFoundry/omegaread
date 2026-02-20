'use client';

import { useEffect, useState } from 'react';
import { celebracion as sonidoFanfarria } from '@/lib/audio/sonidos';
import { BotonGrande } from '@/components/ui/BotonGrande';

/**
 * Props del componente StickerReveal.
 */
export interface StickerRevealProps {
  /** Emoji del sticker a revelar */
  emoji: string;
  /** Nombre del sticker */
  nombre: string;
  /** Si se muestra el reveal */
  visible: boolean;
  /** Callback al cerrar */
  onClose?: () => void;
}

/**
 * Revelación de sticker nuevo al final de sesión.
 * Animación de tarjeta que se voltea para revelar el sticker.
 * Sonido de fanfarria al revelar.
 */
export function StickerReveal({
  emoji,
  nombre,
  visible,
  onClose,
}: StickerRevealProps) {
  const [volteada, setVolteada] = useState(false);

  useEffect(() => {
    if (!visible) {
      setVolteada(false);
      return;
    }

    // Voltear la tarjeta después de un momento dramático
    const timer = setTimeout(() => {
      setVolteada(true);
      sonidoFanfarria();
    }, 800);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(93, 64, 55, 0.6)' }}
    >
      {/* Tarjeta con flip */}
      <div className="sticker-card mb-8">
        <div className={`sticker-card-inner ${volteada ? 'flipped' : ''}`}>
          {/* Frente (antes de voltear): signo de interrogación */}
          <div className="sticker-face sticker-front">
            <span className="text-6xl mb-2">❓</span>
            <span className="text-lg font-bold" style={{ color: '#5D4037' }}>
              ¡Nuevo sticker!
            </span>
          </div>

          {/* Reverso (después de voltear): el sticker */}
          <div className="sticker-face sticker-back">
            {/* Sparkles decorativos */}
            <span
              className="absolute top-4 left-4 text-xl"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}
            >
              ✨
            </span>
            <span
              className="absolute top-4 right-4 text-xl"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite 0.5s' }}
            >
              ✨
            </span>
            <span
              className="absolute bottom-12 left-6 text-lg"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite 1s' }}
            >
              ⭐
            </span>

            <span className="text-8xl mb-3">{emoji}</span>
            <span
              className="text-base font-bold text-center px-4"
              style={{ color: '#5D4037' }}
            >
              {nombre}
            </span>
          </div>
        </div>
      </div>

      {/* Botón ¡Genial! */}
      {volteada && (
        <div style={{ animation: 'fade-in-up 0.5s ease-out 0.3s both' }}>
          <BotonGrande
            variante="celebracion"
            icono="🎉"
            texto="¡Genial!"
            tamano="grande"
            onClick={onClose}
          />
        </div>
      )}
    </div>
  );
}
