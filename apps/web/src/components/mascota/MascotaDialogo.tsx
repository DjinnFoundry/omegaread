'use client';

import { useEffect, useRef } from 'react';
import { hablar, detenerHabla, ttsDisponible } from '@/lib/audio/tts';

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
 *
 * Si TTS no está disponible, muestra el texto visualmente
 * con un timer de fallback basado en la longitud del texto.
 *
 * FIXED: No doble invocación de onFinish — usa ref para
 * rastrear si ya se finalizó, y cleanup correcto en useEffect.
 */
export function MascotaDialogo({ texto, onFinish, visible = true }: MascotaDialogoProps) {
  const finalizadoRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!texto || !visible) return;

    finalizadoRef.current = false;

    const finalizar = () => {
      if (finalizadoRef.current) return; // Guard against double invocation
      finalizadoRef.current = true;
      setTimeout(() => {
        onFinishRef.current?.();
      }, 800);
    };

    // Speak the text (hablar calls onEnd when done, or immediately if TTS unavailable)
    hablar(texto, {
      onEnd: finalizar,
    });

    // Fallback timer: auto-hide after time based on text length
    // Only fires if TTS onEnd didn't fire (e.g., TTS silently fails)
    const tiempoFallback = Math.max(3000, texto.length * 100);
    const fallbackTimer = setTimeout(finalizar, tiempoFallback);

    return () => {
      clearTimeout(fallbackTimer);
      detenerHabla();
      // Mark as finalized on cleanup to prevent stale callbacks
      finalizadoRef.current = true;
    };
  }, [texto, visible]);

  if (!visible || !texto) return null;

  const sinTTS = !ttsDisponible();

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
          className={`font-medium leading-relaxed ${sinTTS ? 'text-xl' : 'text-lg'}`}
          style={{ color: '#5D4037' }}
        >
          {texto}
        </p>

        {/* Indicador de que está hablando (solo si TTS disponible) */}
        {!sinTTS && (
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
        )}

        {/* Indicador visual sin TTS: icono de lectura */}
        {sinTTS && (
          <div className="mt-2 flex items-center justify-center gap-1 text-sm" style={{ color: '#8D6E63' }}>
            📖 <span>Lee el texto</span>
          </div>
        )}

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
