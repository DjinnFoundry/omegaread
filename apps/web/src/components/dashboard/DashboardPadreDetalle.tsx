'use client';

/**
 * Dashboard detallado del padre para un hijo especifico.
 * Elo-centric: muestra rating global, evolucion, desglose por tipo, WPM, y dificultad.
 */
import { useState, lazy, Suspense } from 'react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { clasificarElo } from '@/lib/elo';

const LineaEvolucion = lazy(() =>
  import('@/components/charts/LineaEvolucion').then(m => ({ default: m.LineaEvolucion }))
);

function ChartFallback() {
  return <div className="h-32 rounded-xl bg-neutro/10 animate-pulse" />;
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  literal: { label: 'Literal', icon: '📝', color: '#4ECDC4' },
  inferencia: { label: 'Inferencia', icon: '🔍', color: '#A28BD4' },
  vocabulario: { label: 'Vocabulario', icon: '📚', color: '#FFB347' },
  resumen: { label: 'Idea principal', icon: '💡', color: '#64B5F6' },
};

const NIVEL_LABELS: Array<{ min: number; max: number; label: string }> = [
  { min: 1.0, max: 2.0, label: 'Primeros pasos' },
  { min: 2.0, max: 3.0, label: 'Lector emergente' },
  { min: 3.0, max: 4.0, label: 'Lector fluido' },
  { min: 4.0, max: 4.8, label: 'Lector avanzado' },
];

function getNivelLabel(nivel: number): string {
  const entry = NIVEL_LABELS.find(n => nivel >= n.min && nivel < n.max);
  return entry?.label ?? 'Lector avanzado';
}

function getEloColor(elo: number): string {
  if (elo < 800) return '#FF6B6B';
  if (elo < 1100) return '#FFE66D';
  if (elo < 1400) return '#4ECDC4';
  return '#7BC67E';
}

function getEloTendencia(eloEvolucion: DashboardPadreData['eloEvolucion'], currentElo: number): 'up' | 'down' | 'stable' {
  if (eloEvolucion.length < 5) return 'stable';
  const hace5 = eloEvolucion[Math.max(0, eloEvolucion.length - 6)]?.global ?? currentElo;
  const diff = currentElo - hace5;
  if (diff > 15) return 'up';
  if (diff < -15) return 'down';
  return 'stable';
}

/**
 * Filters WPM data to remove outlier sessions where the child likely skipped
 * without reading. Uses median-based detection: sessions with WPM > median * 3
 * are considered fake fast and excluded. Returns null if fewer than 3 valid
 * sessions remain (not enough data to show the section).
 */
function filtrarWpmValidos(
  wpmEvolucion: DashboardPadreData['wpmEvolucion']
): DashboardPadreData['wpmEvolucion'] | null {
  if (wpmEvolucion.length === 0) return null;

  const valores = wpmEvolucion.map(w => w.wpm).sort((a, b) => a - b);
  const mid = Math.floor(valores.length / 2);
  const mediana =
    valores.length % 2 === 0
      ? ((valores[mid - 1] ?? 0) + (valores[mid] ?? 0)) / 2
      : (valores[mid] ?? 0);

  const umbral = mediana * 3;
  const validos = wpmEvolucion.filter(w => w.wpm <= umbral);

  if (validos.length < 3) return null;
  return validos;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

interface Props {
  data: DashboardPadreData;
}

export function DashboardPadreDetalle({ data }: Props) {
  const [historialExpandido, setHistorialExpandido] = useState<string | null>(null);
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);

  const tendencia = getEloTendencia(data.eloEvolucion, data.eloActual.global);
  const wpmValidos = filtrarWpmValidos(data.wpmEvolucion);

  return (
    <div className="space-y-6">
      {/* ────── a) Header: Elo global ────── */}
      <div className="rounded-3xl bg-turquesa/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-turquesa">Nivel de comprension</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold" style={{ color: getEloColor(data.eloActual.global) }}>
                {Math.round(data.eloActual.global)}
              </p>
              <span className="text-lg">
                {tendencia === 'up' ? '↑' : tendencia === 'down' ? '↓' : ''}
              </span>
            </div>
            <p className="text-xs text-texto-suave mt-0.5">
              {clasificarElo(data.eloActual.global)}
              {data.eloActual.rd > 150 && ' (calibrando...)'}
            </p>
          </div>
        </div>
      </div>

      {/* ────── b) Evolucion Elo ────── */}
      <SeccionCard titulo="Evolucion de comprension" emoji="📈">
        {data.eloEvolucion.length > 0 ? (
          <>
            {/* Bandas de rango */}
            <div className="flex justify-center gap-3 mb-2 text-[10px] text-texto-suave">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#FF6B6B' }} /> &lt;800
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#FFE66D' }} /> 800-1100
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#4ECDC4' }} /> 1100-1400
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#7BC67E' }} /> &gt;1400
              </span>
            </div>
            <Suspense fallback={<ChartFallback />}>
              <LineaEvolucion
                datos={data.eloEvolucion.map((e, i) => ({
                  label: i === 0 || i === data.eloEvolucion.length - 1
                    ? e.fecha.slice(5)
                    : '',
                  valor: e.global,
                  banda: e.rd,
                }))}
                color="#4ECDC4"
                maxValor={Math.max(1600, ...data.eloEvolucion.map(e => e.global + e.rd + 50))}
                minValor={Math.max(0, Math.min(...data.eloEvolucion.map(e => e.global - e.rd - 50)))}
                mostrarValores={false}
                sufijo=""
              />
            </Suspense>
            <p className="mt-1 text-[10px] text-texto-suave text-center">
              La banda se estrecha a medida que tenemos mas datos
            </p>
          </>
        ) : (
          <p className="text-sm text-texto-suave text-center py-4">
            Sin sesiones completadas todavia
          </p>
        )}
      </SeccionCard>

      {/* ────── c) Elo por tipo de pregunta ────── */}
      <SeccionCard titulo="Comprension por tipo" emoji="🎯">
        <div className="space-y-2">
          {Object.entries(TIPO_CONFIG).map(([tipo, config]) => {
            const datos = data.desgloseTipos[tipo];
            if (!datos) return null;
            const elo = datos.elo;
            const isExpanded = tipoExpandido === tipo;

            return (
              <div key={tipo}>
                <button
                  onClick={() => setTipoExpandido(isExpanded ? null : tipo)}
                  className="w-full flex items-center gap-2.5 rounded-xl bg-fondo p-2.5 text-left active:scale-[0.99] transition-transform"
                >
                  <span className="text-lg">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-texto">{config.label}</span>
                      <span className="text-xs font-bold" style={{ color: getEloColor(elo) }}>
                        {Math.round(elo)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-texto-suave">
                        {datos.porcentaje}% acierto ({datos.total} preg.)
                      </span>
                      <span className="text-[9px] text-texto-suave">
                        {clasificarElo(elo)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-neutro">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Grafica expandida de evolucion Elo del tipo */}
                {isExpanded && data.eloEvolucion.length > 1 && (
                  <div className="mt-1 ml-8 mr-2 rounded-lg bg-superficie p-2 border border-neutro/10">
                    <Suspense fallback={<ChartFallback />}>
                      <LineaEvolucion
                        datos={data.eloEvolucion.map((e, i) => ({
                          label: i === 0 || i === data.eloEvolucion.length - 1
                            ? e.fecha.slice(5)
                            : '',
                          valor: e[tipo as keyof typeof e] as number,
                        }))}
                        color={config.color}
                        maxValor={Math.max(1600, ...data.eloEvolucion.map(e => (e[tipo as keyof typeof e] as number) + 100))}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SeccionCard>

      {/* ────── d) Velocidad de lectura (WPM) ────── */}
      {wpmValidos !== null && (
        <SeccionCard titulo="Velocidad de lectura" emoji="⚡">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-texto">
              {wpmValidos[wpmValidos.length - 1]?.wpm ?? 0}
            </span>
            <span className="text-xs text-texto-suave">palabras/min</span>
          </div>
          <Suspense fallback={<ChartFallback />}>
            <LineaEvolucion
              datos={wpmValidos.map((w, i) => ({
                label: i === 0 || i === wpmValidos.length - 1
                  ? w.fecha.slice(5)
                  : '',
                valor: w.wpm,
              }))}
              color="#A28BD4"
              maxValor={Math.max(200, ...wpmValidos.map(w => w.wpm + 20))}
            />
          </Suspense>
          <p className="mt-1 text-[10px] text-texto-suave text-center">
            Evolucion de palabras por minuto
          </p>
        </SeccionCard>
      )}

      {/* ────── e) Nivel de dificultad actual ────── */}
      <SeccionCard titulo="Nivel de dificultad" emoji="📐">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-extrabold text-turquesa">{data.nivelActual}</span>
          <span className="text-sm font-semibold text-texto-suave">
            {getNivelLabel(Number(data.nivelActual))}
          </span>
        </div>
      </SeccionCard>

      {/* ────── f) Historial de sesiones ────── */}
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

      {/* ────── g) Recomendaciones offline ────── */}
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
