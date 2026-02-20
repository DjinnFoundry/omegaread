'use client';

import { useEffect, useRef } from 'react';
import { estrellaGanada } from '@/lib/audio/sonidos';

/**
 * Props del componente Estrellas.
 */
export interface EstrellasProps {
  /** Cantidad de estrellas ganadas */
  cantidad: number;
  /** Máximo de estrellas a mostrar (default: 5) */
  max?: number;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Visualización de estrellas ganadas.
 * Estrellas como SVG animadas que brillan.
 * Animación de bounce al ganar nueva estrella.
 */
export function Estrellas({ cantidad, max = 5, className = '' }: EstrellasProps) {
  const cantidadAnterior = useRef(cantidad);

  useEffect(() => {
    if (cantidad > cantidadAnterior.current) {
      estrellaGanada();
    }
    cantidadAnterior.current = cantidad;
  }, [cantidad]);

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`${cantidad} de ${max} estrellas`}
    >
      <style>{`
        @keyframes star-shine {
          0%, 100% { filter: brightness(1); transform: scale(1); }
          50% { filter: brightness(1.3); transform: scale(1.1); }
        }
        @keyframes star-bounce {
          0% { transform: scale(0) rotate(-180deg); }
          60% { transform: scale(1.3) rotate(10deg); }
          80% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .star-active { animation: star-shine 2s ease-in-out infinite; }
        .star-new { animation: star-bounce 0.6s ease-out forwards; }
      `}</style>

      {Array.from({ length: max }, (_, i) => {
        const ganada = i < cantidad;
        const esNueva = i === cantidad - 1 && cantidad > cantidadAnterior.current;

        return (
          <svg
            key={i}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            className={ganada ? (esNueva ? 'star-new' : 'star-active') : ''}
            style={{
              animationDelay: ganada ? `${i * 200}ms` : undefined,
              opacity: ganada ? 1 : 0.25,
            }}
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={ganada ? '#FFE66D' : '#D7CCC8'}
              stroke={ganada ? '#FFC107' : '#BCAAA4'}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Brillo interior */}
            {ganada && (
              <path
                d="M12 5l2 4.1L18.5 10l-3.25 3.17.77 4.48L12 15.4l-4.02 2.25.77-4.48L5.5 10l4.5-.9L12 5z"
                fill="#FFF176"
                opacity="0.5"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}
