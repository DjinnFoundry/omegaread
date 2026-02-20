'use client';

/**
 * Props del componente BarraProgreso.
 */
export interface BarraProgresoProps {
  /** Progreso de 0 a 1 */
  progreso: number;
  /** Color de la barra de progreso */
  color?: string;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Barra de progreso visual para niños.
 * Sin números, sin porcentaje — solo visual.
 * Barra gruesa (12px) con bordes redondeados y relleno animado.
 */
export function BarraProgreso({
  progreso,
  color = '#4ECDC4',
  className = '',
}: BarraProgresoProps) {
  // Clamp entre 0 y 1
  const progresoSeguro = Math.min(1, Math.max(0, progreso));

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(progresoSeguro * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Track (fondo) */}
      <div
        className="h-3 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: '#E8E0D8' }}
      >
        {/* Fill (progreso) */}
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${progresoSeguro * 100}%`,
            backgroundColor: color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.3)`,
          }}
        >
          {/* Brillo animado */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>

    </div>
  );
}
