'use client';

import { useCallback } from 'react';
import { click as sonidoClick } from '@/lib/audio/sonidos';

/**
 * Tamaño del componente LetraGrande.
 */
export type TamanoLetra = 'lg' | 'xl';

/**
 * Props del componente LetraGrande.
 */
export interface LetraGrandeProps {
  /** Letra a mostrar (A-Z, a-z) */
  letra: string;
  /** Color de fondo (CSS color value) */
  color?: string;
  /** Si la letra está seleccionada */
  seleccionada?: boolean;
  /** Si la letra fue marcada como correcta */
  correcta?: boolean;
  /** Si la letra fue marcada como incorrecta */
  incorrecta?: boolean;
  /** Callback al tocar la letra */
  onClick?: () => void;
  /** Tamaño de la letra */
  size?: TamanoLetra;
  /** Si el componente está deshabilitado */
  deshabilitado?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

const TAMANOS: Record<TamanoLetra, { contenedor: string; fuente: string }> = {
  lg: {
    contenedor: 'min-w-[70px] min-h-[70px] w-[70px] h-[70px]',
    fuente: 'text-5xl',
  },
  xl: {
    contenedor: 'min-w-[90px] min-h-[90px] w-[90px] h-[90px]',
    fuente: 'text-6xl',
  },
};

/**
 * Componente reutilizable de letra grande y tocable.
 *
 * Touch target mínimo 70pt. Estados visuales: normal, hover,
 * correcta (verde brillante con pulso), incorrecta (tiembla).
 * Pensado para niños de 4-8 años.
 */
export function LetraGrande({
  letra,
  color = '#FFF9F0',
  seleccionada = false,
  correcta = false,
  incorrecta = false,
  onClick,
  size = 'lg',
  deshabilitado = false,
  className = '',
}: LetraGrandeProps) {
  const tamano = TAMANOS[size];

  const manejarClick = useCallback(() => {
    if (deshabilitado) return;
    sonidoClick();
    onClick?.();
  }, [deshabilitado, onClick]);

  // Determinar estilos según estado
  const estiloFondo = correcta
    ? '#7BC67E'
    : incorrecta
      ? '#FF8A80'
      : seleccionada
        ? '#FFE66D'
        : color;

  const estiloBorde = correcta
    ? '3px solid #4CAF50'
    : incorrecta
      ? '3px solid #FF5252'
      : seleccionada
        ? '3px solid #FFC107'
        : '3px solid #E8E0D8';

  const estiloSombra = correcta
    ? '0 0 20px rgba(76, 175, 80, 0.5), 0 4px 0 #4CAF50'
    : incorrecta
      ? '0 4px 0 #FF5252'
      : '0 4px 0 rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.05)';

  const animacionClase = correcta
    ? 'letra-correcta'
    : incorrecta
      ? 'letra-incorrecta'
      : '';

  return (
      <button
        type="button"
        onClick={manejarClick}
        disabled={deshabilitado}
        aria-label={`Letra ${letra}`}
        className={`
          inline-flex items-center justify-center
          rounded-2xl font-bold
          select-none touch-manipulation
          transition-all duration-150
          active:scale-90 hover:brightness-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${tamano.contenedor}
          ${tamano.fuente}
          ${animacionClase}
          ${className}
        `}
        style={{
          backgroundColor: estiloFondo,
          border: estiloBorde,
          boxShadow: estiloSombra,
          color: correcta ? 'white' : incorrecta ? 'white' : '#5D4037',
          lineHeight: 1,
          fontFamily: "'Nunito', 'Quicksand', sans-serif",
        }}
      >
        {letra}
      </button>
  );
}
