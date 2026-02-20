'use client';

/**
 * Grafico de radar/barras horizontales para desglose por tipo de pregunta.
 * Barras horizontales con colores del design system.
 * Mas legible que un radar clasico para padres.
 */

interface TipoData {
  tipo: string;
  label: string;
  porcentaje: number;
  total: number;
}

interface RadarTiposProps {
  datos: TipoData[];
}

const COLORES_TIPO: Record<string, string> = {
  literal: '#4ECDC4',      // turquesa
  inferencia: '#A28BD4',   // montana
  vocabulario: '#FFB347',  // taller
  resumen: '#64B5F6',      // lago
};

const LABELS_TIPO: Record<string, string> = {
  literal: 'Literal',
  inferencia: 'Inferencia',
  vocabulario: 'Vocabulario',
  resumen: 'Idea principal',
};

export function RadarTipos({ datos }: RadarTiposProps) {
  if (datos.length === 0) {
    return (
      <div className="text-center text-texto-suave text-sm py-4">
        Sin datos de preguntas todavia
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Desglose por tipo de pregunta">
      {datos.map((d) => {
        const color = COLORES_TIPO[d.tipo] ?? '#B0BEC5';
        return (
          <div key={d.tipo} role="listitem">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-texto">
                {d.label}
              </span>
              <span className="text-xs text-texto-suave">
                {d.porcentaje}% ({d.total} preg.)
              </span>
            </div>
            <div className="h-3 rounded-full bg-neutro/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${d.porcentaje}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Helper para convertir el desglose del server action al formato del componente */
export function formatearDatosTipos(
  desglose: Record<string, { total: number; aciertos: number; porcentaje: number }>,
): TipoData[] {
  return Object.entries(desglose).map(([tipo, datos]) => ({
    tipo,
    label: LABELS_TIPO[tipo] ?? tipo,
    porcentaje: datos.porcentaje,
    total: datos.total,
  }));
}
