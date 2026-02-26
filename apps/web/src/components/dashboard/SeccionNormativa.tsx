'use client';

/**
 * Seccion normativa: percentiles, benchmarks por edad, catch-up.
 * Extraida de DashboardPadreDetalle.
 */
import { Compass, FileText, Eye, BookOpen, Lightbulb } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  literal: { label: 'Literal', icon: <FileText size={14} className="text-turquesa" />, color: '#4ECDC4' },
  inferencia: { label: 'Inferencia', icon: <Eye size={14} className="text-montana" />, color: '#A28BD4' },
  vocabulario: { label: 'Vocabulario', icon: <BookOpen size={14} className="text-taller" />, color: '#FFB347' },
  resumen: { label: 'Idea principal', icon: <Lightbulb size={14} className="text-lago" />, color: '#64B5F6' },
};

function estadoChipClass(necesitaApoyo: boolean): string {
  return necesitaApoyo
    ? 'bg-coral/15 text-coral'
    : 'bg-acierto/15 text-acierto';
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionNormativa({ data }: Props) {
  return (
    <SeccionCard titulo="Normativa y catch-up" icon={<Compass size={18} className="text-taller" />}>
      <div className="rounded-2xl bg-amarillo/15 p-3">
        <p className="text-xs text-texto">
          Referencia actual por edad: <span className="font-bold">{data.normativa.referenciaEdad.cursoEsperado}</span>{' '}
          ({data.normativa.referenciaEdad.edadAnos} anos)
        </p>
        <p className="mt-1 text-xs text-texto">
          Equivalencia global estimada: <span className="font-bold">{data.normativa.equivalenciaGlobal.curso}</span>{' '}
          (percentil {data.normativa.equivalenciaGlobal.percentil})
        </p>
        <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${estadoChipClass(data.normativa.equivalenciaGlobal.necesitaApoyo)}`}>
          {data.normativa.equivalenciaGlobal.estado}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-texto-suave">
          {data.normativa.equivalenciaGlobal.recomendacion}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-neutro/15 bg-fondo">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-superficie">
            <tr className="text-texto-suave">
              <th className="px-2 py-2 font-semibold">Curso</th>
              <th className="px-2 py-2 font-semibold">P10</th>
              <th className="px-2 py-2 font-semibold">P25</th>
              <th className="px-2 py-2 font-semibold">P50</th>
              <th className="px-2 py-2 font-semibold">P75</th>
              <th className="px-2 py-2 font-semibold">P90</th>
            </tr>
          </thead>
          <tbody>
            {data.normativa.tabla.map((fila) => (
              <tr
                key={fila.curso}
                className={`border-t border-neutro/10 ${
                  fila.curso === data.normativa.referenciaEdad.cursoEsperado ? 'bg-turquesa/10' : ''
                }`}
              >
                <td className="px-2 py-2 font-semibold text-texto">{fila.curso}</td>
                <td className="px-2 py-2 text-texto-suave">{fila.p10}</td>
                <td className="px-2 py-2 text-texto-suave">{fila.p25}</td>
                <td className="px-2 py-2 text-texto-suave">{fila.p50}</td>
                <td className="px-2 py-2 text-texto-suave">{fila.p75}</td>
                <td className="px-2 py-2 text-texto-suave">{fila.p90}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px] text-texto-suave">
        Tabla orientativa para explicar progreso a familias. No sustituye evaluacion psicopedagogica formal.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(data.normativa.porTipo).map(([tipo, valor]) => {
          const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, icon: <BookOpen size={14} />, color: '#4ECDC4' };
          return (
            <div key={tipo} className="rounded-xl bg-fondo p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-texto">
                  {cfg.icon} {cfg.label}
                </span>
                <span className="text-xs font-bold font-datos" style={{ color: cfg.color }}>
                  P{valor.percentil}
                </span>
              </div>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoChipClass(valor.necesitaApoyo)}`}>
                {valor.estado}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-texto-suave">
                {valor.recomendacion}
              </p>
            </div>
          );
        })}
      </div>
    </SeccionCard>
  );
}
