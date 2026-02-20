'use client';

import { useCallback } from 'react';
import { click as sonidoClick } from '@/lib/audio/sonidos';

/**
 * Variantes visuales del botón.
 */
export type VarianteBoton = 'primario' | 'secundario' | 'celebracion';

/**
 * Tamaños del botón.
 */
export type TamanoBoton = 'normal' | 'pequeno' | 'grande';

/**
 * Props del componente BotonGrande.
 */
export interface BotonGrandeProps {
  /** Variante de color */
  variante?: VarianteBoton;
  /** Emoji o icono a mostrar */
  icono?: string;
  /** Texto corto opcional (para lectores emergentes) */
  texto?: string;
  /** Tamaño del botón */
  tamano?: TamanoBoton;
  /** Si el botón está deshabilitado */
  deshabilitado?: boolean;
  /** Callback al tocar */
  onClick?: () => void;
  /** Aria label para accesibilidad */
  ariaLabel?: string;
  /** Clase CSS adicional */
  className?: string;
}

const COLORES: Record<VarianteBoton, { bg: string; shadow: string; text: string }> = {
  primario: { bg: '#FF6B6B', shadow: '#E85555', text: 'white' },
  secundario: { bg: '#4ECDC4', shadow: '#3BA89F', text: 'white' },
  celebracion: { bg: '#FFE66D', shadow: '#E6CE55', text: '#5D4037' },
};

const TAMANOS: Record<TamanoBoton, string> = {
  pequeno: 'min-h-[48px] min-w-[48px] px-3 py-2 text-lg',
  normal: 'min-h-[64px] min-w-[64px] px-5 py-3 text-xl',
  grande: 'min-h-[80px] min-w-[80px] px-6 py-4 text-2xl',
};

/**
 * Botón universal para niños.
 * Touch target mínimo 64px, sonido al tocar, animación scale on press.
 */
export function BotonGrande({
  variante = 'primario',
  icono,
  texto,
  tamano = 'normal',
  deshabilitado = false,
  onClick,
  ariaLabel,
  className = '',
}: BotonGrandeProps) {
  const colores = COLORES[variante];
  const tamanoClase = TAMANOS[tamano];

  const manejarClick = useCallback(() => {
    if (deshabilitado) return;
    sonidoClick();
    onClick?.();
  }, [deshabilitado, onClick]);

  return (
    <button
      type="button"
      onClick={manejarClick}
      disabled={deshabilitado}
      aria-label={ariaLabel ?? texto ?? icono ?? 'botón'}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-3xl font-bold
        select-none touch-manipulation
        transition-all duration-150
        active:scale-90 hover:brightness-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${tamanoClase}
        ${className}
      `}
      style={{
        backgroundColor: colores.bg,
        color: colores.text,
        boxShadow: `0 4px 0 ${colores.shadow}, 0 6px 16px rgba(0,0,0,0.1)`,
      }}
    >
      {icono && (
        <span className="leading-none" role="presentation">
          {icono}
        </span>
      )}
      {texto && <span>{texto}</span>}
    </button>
  );
}
