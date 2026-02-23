'use client';

/**
 * Dashboard detallado del padre para un hijo especifico.
 * Elo-centric: muestra rating global, evolucion, desglose por tipo y WPM.
 */
import { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { clasificarElo } from '@/lib/elo';
import { guardarPerfilVivo, responderMicroPreguntaPerfil } from '@/server/actions/profile-actions';

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

const RANGOS_COMPRENSION = [
  { rango: '<800', nivel: 'Principiante', color: '#FF6B6B' },
  { rango: '800-1100', nivel: 'En desarrollo', color: '#FFE66D' },
  { rango: '1100-1400', nivel: 'Competente', color: '#4ECDC4' },
  { rango: '>1400', nivel: 'Avanzado', color: '#7BC67E' },
];

function getEloColor(elo: number): string {
  if (elo < 800) return '#FF6B6B';
  if (elo < 1100) return '#FFE66D';
  if (elo < 1400) return '#4ECDC4';
  return '#7BC67E';
}

function estadoChipClass(necesitaApoyo: boolean): string {
  return necesitaApoyo
    ? 'bg-coral/15 text-coral'
    : 'bg-acierto/15 text-acierto';
}

function getEloTendencia(eloEvolucion: DashboardPadreData['eloEvolucion'], currentElo: number): 'up' | 'down' | 'stable' {
  if (eloEvolucion.length < 5) return 'stable';
  const hace5 = eloEvolucion[Math.max(0, eloEvolucion.length - 6)]?.global ?? currentElo;
  const diff = currentElo - hace5;
  if (diff > 15) return 'up';
  if (diff < -15) return 'down';
  return 'stable';
}

function categoriaHechoLabel(cat: string): string {
  if (cat === 'interes') return 'Interes';
  if (cat === 'fortaleza') return 'Fortaleza';
  if (cat === 'reto') return 'Reto';
  if (cat === 'hito') return 'Hito';
  return 'Contexto';
}

function recortarLabel(value: string, max = 16): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
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
  const router = useRouter();
  const [historialExpandido, setHistorialExpandido] = useState<string | null>(null);
  const [tipoExpandido, setTipoExpandido] = useState<string | null>(null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [respondiendoMicro, setRespondiendoMicro] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [contextoEdit, setContextoEdit] = useState(data.perfilVivo.contextoPersonal);
  const [personajesEdit, setPersonajesEdit] = useState(data.perfilVivo.personajesFavoritos);
  const [temasEvitarEdit, setTemasEvitarEdit] = useState((data.perfilVivo.temasEvitar ?? []).join(', '));
  const [nuevoHecho, setNuevoHecho] = useState('');
  const [categoriaHecho, setCategoriaHecho] = useState<'interes' | 'fortaleza' | 'reto' | 'hito' | 'contexto'>('contexto');

  const tendencia = getEloTendencia(data.eloEvolucion, data.eloActual.global);
  const wpmValidos = filtrarWpmValidos(data.wpmEvolucion);
  const mostrandoPuntoInicial = data.eloEvolucion.length === 0;
  const eloSerie = mostrandoPuntoInicial
    ? [{
        fecha: new Date().toISOString().split('T')[0] ?? 'inicio',
        sessionId: 'inicio',
        global: data.eloActual.global,
        literal: data.eloActual.literal,
        inferencia: data.eloActual.inferencia,
        vocabulario: data.eloActual.vocabulario,
        resumen: data.eloActual.resumen,
        rd: data.eloActual.rd,
      }]
    : data.eloEvolucion;

  const rutaMapa = data.techTree.historialTopics.slice(0, 6).reverse();
  const sugerenciasMapa = data.techTree.sugerencias.slice(0, 4);
  const rutaPaso = rutaMapa.length > 1 ? 440 / (rutaMapa.length - 1) : 0;
  const rutaNodes = rutaMapa.map((node, idx) => ({
    ...node,
    x: 90 + (idx * rutaPaso),
    y: 66,
  }));
  const currentNode = rutaNodes[rutaNodes.length - 1];
  const sugerenciaPaso = sugerenciasMapa.length > 1 ? 440 / (sugerenciasMapa.length - 1) : 0;
  const sugerenciaNodes = sugerenciasMapa.map((node, idx) => ({
    ...node,
    x: 90 + (idx * sugerenciaPaso),
    y: 175,
  }));

  const handleGuardarPerfil = async () => {
    setGuardandoPerfil(true);
    setErrorPerfil(null);
    setMensajePerfil(null);
    try {
      const temasEvitar = temasEvitarEdit
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);

      const result = await guardarPerfilVivo({
        studentId: data.studentId,
        contextoPersonal: contextoEdit,
        personajesFavoritos: personajesEdit,
        temasEvitar,
        nuevoHecho: nuevoHecho.trim() || undefined,
        categoriaHecho,
      });

      if (!result.ok) {
        setErrorPerfil(result.error ?? 'No se pudo guardar el perfil');
        return;
      }

      setMensajePerfil('Perfil actualizado');
      setNuevoHecho('');
      router.refresh();
    } catch {
      setErrorPerfil('No se pudo guardar el perfil');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleResponderMicro = async (respuesta: string) => {
    if (!data.perfilVivo.microPreguntaActiva) return;
    setRespondiendoMicro(true);
    setErrorPerfil(null);
    setMensajePerfil(null);
    try {
      const result = await responderMicroPreguntaPerfil({
        studentId: data.studentId,
        preguntaId: data.perfilVivo.microPreguntaActiva.id,
        respuesta,
      });
      if (!result.ok) {
        setErrorPerfil(result.error ?? 'No se pudo guardar la respuesta');
        return;
      }
      setMensajePerfil('Respuesta guardada');
      router.refresh();
    } catch {
      setErrorPerfil('No se pudo guardar la respuesta');
    } finally {
      setRespondiendoMicro(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ────── a) Comprension (nivel + evolucion en la misma card) ────── */}
      <SeccionCard titulo="Comprension lectora" emoji="📈">
        <div className="rounded-2xl bg-turquesa/10 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-turquesa">Nivel de comprension</p>
              <div className="mt-0.5 flex items-baseline gap-2">
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
            <p className="max-w-md text-[11px] leading-relaxed text-texto-suave">
              Se ajusta por comprension real (Glicko/Elo): cuanto mejor asimila preguntas de distinta
              dificultad y mas consistencia muestra, mayor dificultad recibe.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {RANGOS_COMPRENSION.map((rango) => (
            <div key={rango.rango} className="rounded-xl bg-fondo p-2">
              <p className="text-[10px] text-texto-suave">{rango.rango}</p>
              <p className="text-xs font-semibold" style={{ color: rango.color }}>{rango.nivel}</p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Suspense fallback={<ChartFallback />}>
            <LineaEvolucion
              datos={eloSerie.map((e, i) => ({
                label: eloSerie.length === 1
                  ? 'Inicio'
                  : i === 0 || i === eloSerie.length - 1
                    ? e.fecha.slice(5)
                    : '',
                valor: e.global,
                banda: e.rd,
              }))}
              color="#4ECDC4"
              maxValor={Math.max(1600, ...eloSerie.map(e => e.global + e.rd + 50))}
              minValor={Math.max(0, Math.min(...eloSerie.map(e => e.global - e.rd - 50)))}
              mostrarValores={false}
              sufijo=""
            />
          </Suspense>
        </div>
        <p className="mt-1 text-[10px] text-texto-suave text-center">
          {mostrandoPuntoInicial
            ? 'Punto inicial de calibracion (base 1000) hasta completar sesiones.'
            : 'La banda se estrecha a medida que tenemos mas datos.'}
        </p>
      </SeccionCard>

      {/* ────── b) Perfil vivo (Fase 1-2) ────── */}
      <SeccionCard titulo="Perfil vivo del lector" emoji="🧩">
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-texto-suave">Contexto personal</label>
            <textarea
              value={contextoEdit}
              onChange={(e) => setContextoEdit(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
              placeholder="Novedades, gustos recientes, objetivos, etc."
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-texto-suave">Personajes favoritos</label>
            <input
              value={personajesEdit}
              onChange={(e) => setPersonajesEdit(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
              placeholder="Ej: Bluey, Messi, Doraemon..."
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-texto-suave">Temas a evitar (coma separada)</label>
            <input
              value={temasEvitarEdit}
              onChange={(e) => setTemasEvitarEdit(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
              placeholder="Ej: sustos fuertes, tormentas..."
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={nuevoHecho}
              onChange={(e) => setNuevoHecho(e.target.value)}
              className="w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
              placeholder="Nuevo dato util para personalizar historias..."
            />
            <select
              value={categoriaHecho}
              onChange={(e) => setCategoriaHecho(e.target.value as typeof categoriaHecho)}
              className="rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto"
            >
              <option value="contexto">Contexto</option>
              <option value="interes">Interes</option>
              <option value="fortaleza">Fortaleza</option>
              <option value="reto">Reto</option>
              <option value="hito">Hito</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleGuardarPerfil}
            disabled={guardandoPerfil}
            className="rounded-xl bg-turquesa px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {guardandoPerfil ? 'Guardando...' : 'Guardar perfil vivo'}
          </button>

          {mensajePerfil && <p className="text-[11px] text-acierto">{mensajePerfil}</p>}
          {errorPerfil && <p className="text-[11px] text-coral">{errorPerfil}</p>}
        </div>

        {data.perfilVivo.microPreguntaActiva && (
          <div className="mt-4 rounded-2xl bg-amarillo/15 p-3">
            <p className="text-[11px] font-semibold text-texto">
              Pregunta rapida ({data.perfilVivo.microPreguntaActiva.categoria})
            </p>
            <p className="mt-1 text-xs text-texto">
              {data.perfilVivo.microPreguntaActiva.pregunta}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.perfilVivo.microPreguntaActiva.opciones.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void handleResponderMicro(opt)}
                  disabled={respondiendoMicro}
                  className="rounded-full bg-superficie px-2.5 py-1 text-[11px] font-medium text-texto disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <p className="text-[11px] font-semibold text-texto-suave">
            Memoria util ({data.perfilVivo.totalHechos} hechos)
          </p>
          <div className="mt-1 space-y-1.5">
            {data.perfilVivo.hechosRecientes.length === 0 ? (
              <p className="text-[11px] text-texto-suave">Sin hechos recientes aun.</p>
            ) : (
              data.perfilVivo.hechosRecientes.map((h) => (
                <div key={h.id} className="rounded-xl bg-fondo p-2">
                  <p className="text-[10px] font-semibold text-texto-suave">
                    {categoriaHechoLabel(h.categoria)} · {h.fuente}
                  </p>
                  <p className="mt-0.5 text-[11px] text-texto">{h.texto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </SeccionCard>

      {/* ────── c) Ruta/Tech Tree visible (Fase 3-5) ────── */}
      <SeccionCard titulo="Ruta de aprendizaje" emoji="🕸️">
        <div className="rounded-2xl bg-turquesa/10 p-3">
          <p className="text-xs text-texto">
            Topics tocados recientemente: <span className="font-bold">{data.techTree.historialTopics.length}</span>
          </p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-neutro/15 bg-fondo p-3">
          <div className="min-w-[620px]">
            <p className="text-[11px] font-semibold text-texto-suave">
              Mapa visual (ruta reciente + proximas ramas)
            </p>
            <svg viewBox="0 0 620 220" className="mt-2 h-[220px] w-full">
              {rutaNodes.length === 0 && (
                <text x="310" y="100" textAnchor="middle" fontSize="12" fill="#7a868d">
                  Aun no hay ruta suficiente. Completa 1-2 lecturas para ver el mapa.
                </text>
              )}

              {rutaNodes.map((node, idx) => {
                const next = rutaNodes[idx + 1];
                if (!next) return null;
                return (
                  <line
                    key={`ruta-link-${node.slug}-${next.slug}`}
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="#4ECDC4"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}

              {currentNode && sugerenciaNodes.map((node) => (
                <line
                  key={`sug-link-${node.slug}`}
                  x1={currentNode.x}
                  y1={currentNode.y + 12}
                  x2={node.x}
                  y2={node.y - 14}
                  stroke="#9AA0A6"
                  strokeDasharray="5 4"
                  strokeWidth="1.8"
                />
              ))}

              {rutaNodes.map((node) => (
                <g key={`ruta-node-${node.slug}`}>
                  <circle cx={node.x} cy={node.y} r="15" fill="#4ECDC4" opacity="0.2" />
                  <circle cx={node.x} cy={node.y} r="11" fill="#4ECDC4" />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="#fff">
                    {node.emoji}
                  </text>
                  <text x={node.x} y={node.y - 22} textAnchor="middle" fontSize="10" fill="#5c6b73">
                    {recortarLabel(node.nombre, 15)}
                  </text>
                </g>
              ))}

              {sugerenciaNodes.map((node) => (
                <g key={`sug-node-${node.slug}`}>
                  <circle cx={node.x} cy={node.y} r="13" fill="#FFE66D" opacity="0.2" />
                  <circle cx={node.x} cy={node.y} r="9.5" fill="#FFE66D" />
                  <text x={node.x} y={node.y + 3} textAnchor="middle" fontSize="9.5" fill="#2f3a3f">
                    {node.emoji}
                  </text>
                  <text x={node.x} y={node.y + 24} textAnchor="middle" fontSize="9.5" fill="#5c6b73">
                    {recortarLabel(node.nombre, 14)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {data.techTree.historialTopics.slice(0, 12).map((h) => (
              <div key={h.slug} className="rounded-xl bg-fondo px-2.5 py-2 min-w-28">
                <p className="text-xs font-semibold text-texto truncate">
                  {h.emoji} {h.nombre}
                </p>
                <p className="text-[10px] text-texto-suave mt-0.5">
                  {h.veces} veces · {h.fecha}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.techTree.dominiosTocados.map((d) => (
            <div key={d.dominio} className="rounded-xl bg-fondo p-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-texto">
                  {d.emoji} {d.nombre}
                </p>
                <p className="text-[10px] text-texto-suave">
                  {d.tocados}/{d.total}
                </p>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-neutro/10">
                <div
                  className="h-1.5 rounded-full bg-turquesa"
                  style={{ width: `${Math.min(100, Math.round((d.tocados / Math.max(1, d.total)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-texto-suave">Siguientes rutas sugeridas</p>
          {data.techTree.sugerencias.length === 0 ? (
            <p className="text-[11px] text-texto-suave">Aun no hay sugerencias (faltan sesiones).</p>
          ) : (
            data.techTree.sugerencias.map((sug) => (
              <div key={sug.slug} className="rounded-xl bg-fondo p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-texto">
                    {sug.emoji} {sug.nombre}
                  </p>
                  <span className="rounded-full bg-neutro/10 px-2 py-0.5 text-[10px] font-semibold text-texto-suave">
                    {sug.tipo}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-texto-suave">{sug.motivo}</p>
              </div>
            ))
          )}
        </div>
      </SeccionCard>

      {/* ────── d) Tabla normativa (equivalencia + percentiles) ────── */}
      <SeccionCard titulo="Normativa y catch-up" emoji="🧭">
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
            const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, icon: '📘', color: '#4ECDC4' };
            return (
              <div key={tipo} className="rounded-xl bg-fondo p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-texto">
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>
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

      {/* ────── e) Historial de sesiones ────── */}
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
                    {s.ajuste && <p>Ajuste de nivel por comprension: {s.ajuste}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SeccionCard>

      {/* ────── f) Recomendaciones offline ────── */}
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
