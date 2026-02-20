'use client';

import { useEffect, useState, useCallback } from 'react';
import { hablar, detenerHabla } from '@/lib/audio/tts';

/**
 * Props del componente MascotaDialogo.
 */
export interface MascotaDialogoProps {
  /** Texto que la mascota dice (y muestra en burbuja) */
  texto: string;
  /** Callback cuando termina de hablar */
  onFinish?: () => void;
  /** Si se muestra la burbuja (controlado externamente) */
  visible?: boolean;
}

/**
 * Burbuja de diálogo que aparece sobre la mascota.
 * Usa Web Speech API para hablar en español.
 * Muestra texto en burbuja mientras habla (para lectores emergentes).
 * Se auto-oculta después de hablar.
 */
export function MascotaDialogo({ texto, onFinish, visible = true }: MascotaDialogoProps) {
  const [mostrar, setMostrar] = useState(false);
  const [textoMostrado, setTextoMostrado] = useState('');

  const finalizarDialogo = useCallback(() => {
    // Pequeño delay antes de ocultar para que se vea el texto completo
    setTimeout(() => {
      setMostrar(false);
      onFinish?.();
    }, 800);
  }, [onFinish]);

  useEffect(() => {
    if (!texto || !visible) {
      setMostrar(false);
      return;
    }

    setMostrar(true);
    setTextoMostrado(texto);

    // Habla el texto
    hablar(texto, {
      onEnd: finalizarDialogo,
    });

    // Fallback: auto-hide después de un tiempo basado en longitud del texto
    const tiempoFallback = Math.max(3000, texto.length * 100);
    const fallbackTimer = setTimeout(() => {
      setMostrar(false);
      onFinish?.();
    }, tiempoFallback);

    return () => {
      clearTimeout(fallbackTimer);
      detenerHabla();
    };
  }, [texto, visible, finalizarDialogo, onFinish]);

  if (!mostrar) return null;

  return (
    <div className="relative flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Burbuja */}
      <div
        className="relative max-w-[280px] rounded-3xl px-6 py-4 text-center"
        style={{
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '2px solid #FFE66D',
        }}
      >
        {/* Texto para lectores emergentes */}
        <p
          className="text-lg font-medium leading-relaxed"
          style={{ color: '#5D4037' }}
        >
          {textoMostrado}
        </p>

        {/* Indicador de que está hablando */}
        <div className="mt-2 flex items-center justify-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#4ECDC4', animationDelay: '0ms' }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#4ECDC4', animationDelay: '150ms' }}
          />
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#4ECDC4', animationDelay: '300ms' }}
          />
        </div>

        {/* Triangulito apuntando hacia abajo (hacia la mascota) */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-0 w-0"
          style={{
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '12px solid white',
          }}
        />
      </div>
    </div>
  );
}
