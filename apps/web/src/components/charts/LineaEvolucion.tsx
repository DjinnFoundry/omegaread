'use client';

/**
 * Grafico de lineas SVG para evolucion semanal.
 * Linea con puntos y area rellena debajo.
 */

interface PuntoData {
  label: string;
  valor: number;
}

interface LineaEvolucionProps {
  datos: PuntoData[];
  color?: string;
  maxValor?: number;
  mostrarValores?: boolean;
}

export function LineaEvolucion({
  datos,
  color = '#4ECDC4',
  maxValor = 100,
  mostrarValores = false,
}: LineaEvolucionProps) {
  if (datos.length === 0) {
    return (
      <div className="text-center text-texto-suave text-sm py-4">
        Sin datos todavia
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 10 };
  const width = 320;
  const height = 160;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const puntos = datos.map((d, i) => ({
    x: padding.left + (datos.length === 1 ? chartW / 2 : (i / (datos.length - 1)) * chartW),
    y: padding.top + chartH - (d.valor / maxValor) * chartH,
    ...d,
  }));

  // Path de la linea
  const linePath = puntos
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Area rellena
  const areaPath = `${linePath} L ${puntos[puntos.length - 1].x} ${padding.top + chartH} L ${puntos[0].x} ${padding.top + chartH} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Grafico de evolucion"
    >
      {/* Lineas de referencia */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = padding.top + chartH - (v / maxValor) * chartH;
        return (
          <line
            key={v}
            x1={padding.left}
            y1={y}
            x2={padding.left + chartW}
            y2={y}
            stroke="#E0E0E0"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Area rellena */}
      <path d={areaPath} fill={color} opacity={0.15} />

      {/* Linea */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos */}
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="white" stroke={color} strokeWidth={2} />
          {/* Label */}
          <text
            x={p.x}
            y={padding.top + chartH + 18}
            textAnchor="middle"
            fontSize={9}
            fill="#636e72"
          >
            {p.label}
          </text>
          {/* Valor */}
          {mostrarValores && (
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize={9}
              fontWeight="bold"
              fill={color}
            >
              {Math.round(p.valor)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
