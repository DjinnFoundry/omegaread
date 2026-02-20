'use client';

/**
 * Dashboard detallado del padre para un hijo especifico.
 * Sprint 5: graficos de evolucion, desglose, recomendaciones, timeline.
 */
import { useState, lazy, Suspense } from 'react';
import { formatearDatosTipos } from '@/components/charts/RadarTipos';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';

const LineaEvolucion = lazy(() =>
  import('@/components/charts/LineaEvolucion').then(m => ({ default: m.LineaEvolucion }))
);
const LineaNivel = lazy(() =>
  import('@/components/charts/LineaNivel').then(m => ({ default: m.LineaNivel }))
);
const RadarTipos = lazy(() =>
  import('@/components/charts/RadarTipos').then(m => ({ default: m.RadarTipos }))
);

function ChartFallback() {
  return <div className="h-32 rounded-xl bg-neutro/10 animate-pulse" />;
}

interface Props {
  data: DashboardPadreData;
}

export function DashboardPadreDetalle({ data }: Props) {
  const [historialExpandido, setHistorialExpandido] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header con nivel actual */}
      <div className="rounded-3xl bg-turquesa/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-turquesa">Nivel actual</p>
            <p className="text-3xl font-extrabold text-turquesa">{data.nivelActual}</p>
          </div>
          <span className="text-4xl">📖</span>
        </div>
      </div>

      {/* a) Evolucion semanal de comprension */}
      <SeccionCard titulo="Evolucion semanal de comprension" emoji="📈">
        <Suspense fallback={<ChartFallback />}>
          <LineaEvolucion
            datos={data.evolucionSemanal
              .filter(s => s.totalSesiones > 0)
              .map(s => ({
                label: s.semana,
                valor: s.scoreMedio,
              }))}
            color="#4ECDC4"
            mostrarValores
          />
        </Suspense>
        <p className="mt-1 text-[10px] text-texto-suave text-center">
          Score medio de comprension por semana
        </p>
      </SeccionCard>

      {/* b) Evolucion de dificultad */}
      <SeccionCard titulo="Evolucion de dificultad" emoji="📐">
        <Suspense fallback={<ChartFallback />}>
          <LineaNivel
            datos={data.evolucionDificultad.map(e => ({
              fecha: e.fecha,
              nivel: e.nivelNuevo,
              direccion: e.direccion,
              razon: e.razon,
            }))}
          />
        </Suspense>
        <div className="mt-2 flex justify-center gap-4 text-[10px] text-texto-suave">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-acierto" /> Subio
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-coral" /> Bajo
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amarillo" /> Mantuvo
          </span>
        </div>
      </SeccionCard>

      {/* c) Desglose por tipo de pregunta */}
      <SeccionCard titulo="Fortalezas por tipo de pregunta" emoji="🎯">
        <Suspense fallback={<ChartFallback />}>
          <RadarTipos datos={formatearDatosTipos(data.desgloseTipos)} />
        </Suspense>
      </SeccionCard>

      {/* d) Comparativa por topics */}
      {data.comparativaTopics.length > 0 && (
        <SeccionCard titulo="Comprension por tema" emoji="📚">
          <div className="space-y-2">
            {data.comparativaTopics.map(t => (
              <div key={t.topicSlug} className="flex items-center gap-3">
                <span className="text-xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-texto">{t.nombre}</span>
                    <span className="text-xs text-texto-suave">
                      {t.scoreMedio}% ({t.totalSesiones} ses.)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutro/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${t.scoreMedio}%`,
                        backgroundColor: t.scoreMedio >= 80 ? '#7BC67E' : t.scoreMedio >= 60 ? '#FFE66D' : '#FF6B6B',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SeccionCard>
      )}

      {/* e) Historial de sesiones */}
      <SeccionCard titulo="Historial de sesiones" emoji="📋">
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
                      <span className={`text-xs font-bold ${
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
                    {s.ajuste && <p>Ajuste de dificultad: {s.ajuste}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SeccionCard>

      {/* f) Recomendaciones offline */}
      {data.recomendaciones.length > 0 && (
        <SeccionCard titulo="Recomendaciones para casa" emoji="💡">
          <div className="space-y-3">
            {data.recomendaciones.map((rec, i) => (
              <div key={i} className="rounded-2xl bg-amarillo/15 p-3">
                <p className="text-xs font-bold text-texto">{rec.mensaje}</p>
                <p className="mt-1 text-[11px] text-texto-suave leading-relaxed">
                  {rec.detalle}
                </p>
              </div>
            ))}
          </div>
        </SeccionCard>
      )}

      {/* g) Explicador de cambios de nivel */}
      {data.timelineCambiosNivel.length > 0 && (
        <SeccionCard titulo="Historial de cambios de nivel" emoji="🔄">
          <div className="relative pl-4 border-l-2 border-neutro/20 space-y-3">
            {data.timelineCambiosNivel.map((cambio, i) => {
              const subio = cambio.nivelNuevo > cambio.nivelAnterior;
              return (
                <div key={i} className="relative">
                  {/* Punto en la linea */}
                  <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                    subio ? 'bg-acierto' : 'bg-coral'
                  }`} />
                  <div className="rounded-xl bg-fondo p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-texto">
                        Nivel {cambio.nivelAnterior} → {cambio.nivelNuevo}
                      </span>
                      <span className="text-[10px] text-texto-suave">{cambio.fecha}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-texto-suave leading-relaxed">
                      {cambio.razon}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SeccionCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function SeccionCard({
  titulo,
  emoji,
  children,
}: {
  titulo: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-superficie p-4 shadow-sm">
      <h3 className="text-sm font-bold text-texto mb-3">
        {emoji} {titulo}
      </h3>
      {children}
    </div>
  );
}
