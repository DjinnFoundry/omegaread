'use client';

/**
 * Grafico de lineas SVG para evolucion.
 * Soporta banda de confianza opcional (rating +/- banda).
 */

interface PuntoData {
  label: string;
  valor: number;
  /** Desviacion para banda de confianza (se muestra valor +/- banda) */
  banda?: number;
}

interface LineaEvolucionProps {
  datos: PuntoData[];
  color?: string;
  maxValor?: number;
  minValor?: number;
  mostrarValores?: boolean;
  /** Sufijo para valores mostrados (ej: "%" o "") */
  sufijo?: string;
}

export function LineaEvolucion({
  datos,
  color = '#4ECDC4',
  maxValor,
  minValor,
  mostrarValores = false,
  sufijo = '%',
}: LineaEvolucionProps) {
  if (datos.length === 0) {
    return <div className="text-center text-texto-suave text-sm py-4">Sin datos todavia</div>;
  }

  const tieneBanda = datos.some((d) => d.banda != null && d.banda > 0);

  // Calcular rango del eje Y
  const allUpper = datos.map((d) => d.valor + (d.banda ?? 0));
  const allLower = datos.map((d) => d.valor - (d.banda ?? 0));

  const autoMax = Math.max(...allUpper);
  const autoMin = Math.min(...allLower);
  const yMax = maxValor ?? autoMax + (autoMax - autoMin) * 0.1;
  const yMin = minValor ?? Math.max(0, autoMin - (autoMax - autoMin) * 0.1);
  const yRange = yMax - yMin || 1;

  const padding = { top: 20, right: 20, bottom: 30, left: 10 };
  const width = 320;
  const height = 160;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  function toY(val: number) {
    return padding.top + chartH - ((val - yMin) / yRange) * chartH;
  }

  const puntos = datos.map((d, i) => ({
    x: padding.left + (datos.length === 1 ? chartW / 2 : (i / (datos.length - 1)) * chartW),
    y: toY(d.valor),
    yUpper: toY(d.valor + (d.banda ?? 0)),
    yLower: toY(d.valor - (d.banda ?? 0)),
    ...d,
  }));

  // Path de la linea principal
  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Path de la banda de confianza (area entre upper y lower)
  let bandPath = '';
  if (tieneBanda) {
    const upperPath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yUpper}`).join(' ');
    const lowerPath = [...puntos]
      .reverse()
      .map((p, i) => `${i === 0 ? 'L' : 'L'} ${p.x} ${p.yLower}`)
      .join(' ');
    bandPath = `${upperPath} ${lowerPath} Z`;
  }

  // Area rellena bajo la linea (solo si no hay banda)
  const areaPath = !tieneBanda
    ? `${linePath} L ${puntos[puntos.length - 1].x} ${toY(yMin)} L ${puntos[0].x} ${toY(yMin)} Z`
    : '';

  // Lineas de referencia (4 niveles)
  const refLines = [];
  const step = yRange / 4;
  for (let i = 0; i <= 4; i++) {
    refLines.push(Math.round(yMin + step * i));
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Grafico de evolucion"
    >
      {/* Lineas de referencia */}
      {refLines.map((v, idx) => {
        const y = toY(v);
        return (
          <line
            key={`${idx}-${v}`}
            x1={padding.left}
            y1={y}
            x2={padding.left + chartW}
            y2={y}
            stroke="#E0E0E0"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Banda de confianza */}
      {tieneBanda && bandPath && <path d={bandPath} fill={color} opacity={0.12} />}

      {/* Area rellena (sin banda) */}
      {!tieneBanda && areaPath && <path d={areaPath} fill={color} opacity={0.15} />}

      {/* Linea principal */}
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
          {p.label && (
            <text
              x={p.x}
              y={padding.top + chartH + 18}
              textAnchor="middle"
              fontSize={9}
              fill="#636e72"
            >
              {p.label}
            </text>
          )}
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
              {Math.round(p.valor)}
              {sufijo}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
