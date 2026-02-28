'use client';

const TONOS = [
  { value: 1, emoji: '🔬', label: 'Descubre' },
  { value: 2, emoji: '🧭', label: 'Explora' },
  { value: 3, emoji: '⚖️', label: 'Mezcla' },
  { value: 4, emoji: '🚀', label: 'Aventura' },
  { value: 5, emoji: '✨', label: 'Imagina' },
] as const;

interface SelectorTonoProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function SelectorTono({ value, onChange, disabled }: SelectorTonoProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {TONOS.map((tono) => {
        const activo = tono.value === value;
        return (
          <button
            key={tono.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tono.value)}
            className={`
              flex flex-col items-center justify-center
              min-w-[44px] min-h-[44px] px-2 py-2 rounded-xl
              transition-all duration-150
              touch-manipulation
              disabled:opacity-50
              ${activo
                ? 'bg-turquesa/15 border-2 border-turquesa/40 scale-105 shadow-sm'
                : 'bg-superficie border-2 border-transparent hover:border-neutro/20'
              }
            `}
            aria-label={`Tono: ${tono.label}`}
            aria-pressed={activo}
          >
            <span className="text-lg leading-none">{tono.emoji}</span>
            <span className={`
              text-[10px] font-semibold mt-1 leading-none
              hidden sm:block
              ${activo ? 'text-turquesa' : 'text-texto-suave'}
            `}>
              {tono.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
