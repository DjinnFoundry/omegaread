'use client';

/**
 * Grafico de linea para evolucion de nivel/dificultad.
 * Muestra puntos con anotaciones de subida/bajada.
 */

interface PuntoNivel {
  fecha: string;
  nivel: number;
  direccion: string;
  razon: string;
}

interface LineaNivelProps {
  datos: PuntoNivel[];
  nivelMax?: number;
}

const COLORES_DIRECCION: Record<string, string> = {
  subir: '#7BC67E',
  bajar: '#FF6B6B',
  mantener: '#D4880B',
};

export function LineaNivel({ datos, nivelMax = 10 }: LineaNivelProps) {
  if (datos.length === 0) {
    return (
      <div className="text-center text-texto-suave text-sm py-4">
        Sin cambios de nivel todavia
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const width = 320;
  const height = 160;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const puntos = datos.map((d, i) => ({
    x: padding.left + (datos.length === 1 ? chartW / 2 : (i / (datos.length - 1)) * chartW),
    y: padding.top + chartH - (d.nivel / nivelMax) * chartH,
    ...d,
  }));

  const linePath = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Evolucion de nivel"
    >
      {/* Lineas de referencia */}
      {[2, 4, 6, 8, 10].map(v => {
        const y = padding.top + chartH - (v / nivelMax) * chartH;
        return (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              stroke="#E0E0E0"
              strokeWidth={0.5}
            />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize={8} fill="#636e72">
              {v}
            </text>
          </g>
        );
      })}

      {/* Linea */}
      <path
        d={linePath}
        fill="none"
        stroke="#4ECDC4"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos */}
      {puntos.map((p, i) => {
        const color = COLORES_DIRECCION[p.direccion] ?? '#B0BEC5';
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="white" strokeWidth={2} />
            <text
              x={p.x}
              y={padding.top + chartH + 18}
              textAnchor="middle"
              fontSize={8}
              fill="#636e72"
            >
              {p.fecha.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
