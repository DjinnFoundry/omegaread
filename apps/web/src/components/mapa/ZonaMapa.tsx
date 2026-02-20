'use client';

import React, { useCallback } from 'react';
import { click as sonidoClick } from '@/lib/audio/sonidos';

/**
 * Props del componente ZonaMapa.
 */
export interface ZonaMapaProps {
  /** Emoji icono de la zona */
  icono: string;
  /** Nombre de la zona (usado para aria-label y audio) */
  nombre: string;
  /** Color de fondo de la zona */
  color: string;
  /** Si la zona está bloqueada */
  bloqueada?: boolean;
  /** Si es la zona recomendada (muestra pulse) */
  recomendada?: boolean;
  /** Callback al tocar la zona */
  onClick?: () => void;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente individual de zona del mapa de aventuras.
 * Touch target generoso (150x150px mínimo) con hit area expandida.
 * Animación de pulse cuando es la zona recomendada.
 */
export function ZonaMapa({
  icono,
  nombre,
  color,
  bloqueada = false,
  recomendada = false,
  onClick,
  className = '',
}: ZonaMapaProps) {
  const manejarClick = useCallback(() => {
    sonidoClick();
    onClick?.();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={manejarClick}
      aria-label={`${nombre}${bloqueada ? ' - bloqueada' : ''}`}
      className={`
        relative flex flex-col items-center justify-center
        min-w-[150px] min-h-[150px] w-[150px] h-[150px]
        rounded-[32px] border-4 border-white/40
        transition-all duration-200
        select-none touch-manipulation
        ${bloqueada ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95 hover:scale-105'}
        ${recomendada && !bloqueada ? 'animate-pulse-soft' : ''}
        ${className}
      `}
      style={{
        '--zona-color': color,
        backgroundColor: color,
        boxShadow: bloqueada
          ? 'none'
          : `0 8px 24px ${color}66, inset 0 2px 0 rgba(255,255,255,0.3)`,
        // Expand hit area with padding
        padding: '8px',
      } as React.CSSProperties}
    >

      {/* Icono grande */}
      <span className="text-6xl leading-none mb-1" role="presentation">
        {icono}
      </span>

      {/* Candadito si está bloqueada */}
      {bloqueada && (
        <span
          className="absolute top-3 right-3 text-2xl"
          role="presentation"
          aria-hidden="true"
        >
          🔒
        </span>
      )}

      {/* Nombre corto visible para lectores emergentes */}
      <span
        className="mt-1 text-xs font-bold text-white/90 text-center leading-tight"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      >
        {nombre}
      </span>
    </button>
  );
}
