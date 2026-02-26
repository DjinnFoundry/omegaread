'use client';

/**
 * Seccion de historial de sesiones con detalle expandible.
 * Extraida de DashboardPadreDetalle.
 */
import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { SeccionCard } from './SeccionCard';

interface Props {
  data: DashboardPadreData;
}

export function SeccionHistorial({ data }: Props) {
  const [historialExpandido, setHistorialExpandido] = useState<string | null>(null);

  return (
    <SeccionCard titulo="Historial de sesiones" icon={<Clock size={18} className="text-bosque" />}>
      {data.historialSesiones.length === 0 ? (
        <p className="text-sm text-texto-suave text-center py-2">Sin sesiones aun</p>
      ) : (
        <div className="space-y-1.5">
          {data.historialSesiones.map(s => (
            <div key={s.id}>
              <button
                onClick={() => setHistorialExpandido(
                  historialExpandido === s.id ? null : s.id
                )}
                className="w-full flex items-center gap-2 rounded-xl bg-fondo p-2.5 text-left active:scale-[0.99] transition-transform"
              >
                <span className="text-lg">{s.topicEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-texto truncate">
                      {s.topicNombre}
                    </span>
                    <span className={`text-xs font-bold font-datos ${
                      s.scorePorcentaje >= 80 ? 'text-acierto' :
                      s.scorePorcentaje >= 60 ? 'text-texto' : 'text-coral'
                    }`}>
                      {s.scorePorcentaje}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-texto-suave">
                    <span>{s.fecha}</span>
                    <span>Nivel {s.nivel}</span>
                    {s.duracionMin > 0 && <span>{s.duracionMin} min</span>}
                    {s.ajuste && (
                      <span className={`font-semibold ${
                        s.ajuste === 'subir' ? 'text-acierto' :
                        s.ajuste === 'bajar' ? 'text-coral' : ''
                      }`}>
                        {s.ajuste === 'subir' ? '↑' : s.ajuste === 'bajar' ? '↓' : '='}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-neutro">
                  {historialExpandido === s.id ? '▲' : '▼'}
                </span>
              </button>
              {historialExpandido === s.id && (
                <div className="ml-8 mr-2 mt-0.5 mb-1 rounded-lg bg-superficie p-2 text-[10px] text-texto-suave border border-neutro/10">
                  <p>Tema: {s.topicNombre}</p>
                  <p>Nivel: {s.nivel} | Score: {s.scorePorcentaje}%</p>
                  {s.duracionMin > 0 && <p>Duracion: {s.duracionMin} minutos</p>}
                  {s.ajuste && <p>Ajuste de nivel por comprension: {s.ajuste}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SeccionCard>
  );
}
