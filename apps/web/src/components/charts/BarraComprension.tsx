'use client';

/**
 * Grafico de barras SVG para tendencia de comprension.
 * Colores: verde (>=80), amarillo (60-79), rojo (<60).
 * Diseno para ninos: barras grandes, emojis, sin numeros complejos.
 */

interface BarraData {
  porcentaje: number;
  emoji: string;
}

interface BarraComprensionProps {
  datos: BarraData[];
}

function colorBarra(porcentaje: number): string {
  if (porcentaje >= 80) return '#7BC67E'; // acierto/bosque
  if (porcentaje >= 60) return '#FFE66D'; // amarillo
  return '#FF6B6B'; // coral
}

export function BarraComprension({ datos }: BarraComprensionProps) {
  if (datos.length === 0) {
    return (
      <div className="text-center text-texto-suave text-sm py-4">
        Aun no hay sesiones para mostrar
      </div>
    );
  }

  const maxBarras = 7;
  const barras = datos.slice(-maxBarras);
  const barWidth = 32;
  const gap = 12;
  const chartHeight = 120;
  const svgWidth = barras.length * (barWidth + gap) - gap + 20;
  const emojiY = chartHeight + 20;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${chartHeight + 36}`}
      className="w-full max-w-xs mx-auto"
      role="img"
      aria-label="Grafico de comprension de las ultimas sesiones"
    >
      {barras.map((barra, i) => {
        const x = 10 + i * (barWidth + gap);
        const height = Math.max(4, (barra.porcentaje / 100) * chartHeight);
        const y = chartHeight - height;
        const color = colorBarra(barra.porcentaje);

        return (
          <g key={i}>
            {/* Barra de fondo */}
            <rect
              x={x}
              y={0}
              width={barWidth}
              height={chartHeight}
              rx={8}
              fill="#F0F0F0"
            />
            {/* Barra de valor */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={8}
              fill={color}
              className="transition-all duration-500"
            />
            {/* Emoji del topic */}
            <text
              x={x + barWidth / 2}
              y={emojiY}
              textAnchor="middle"
              fontSize={14}
            >
              {barra.emoji}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
