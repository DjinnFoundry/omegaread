'use client';

/**
 * Seccion de perfil vivo: contexto, personajes, temas a evitar, micro-preguntas, hechos.
 * Extraida de DashboardPadreDetalle.
 *
 * v2: categoria selector reemplazado por pills tapeables. Hechos con tag-cloud + borrado por X.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, X } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import {
  guardarPerfilVivo,
  responderMicroPreguntaPerfil,
  eliminarHecho,
} from '@/server/actions/profile-actions';
import { SeccionCard } from './SeccionCard';

// ─────────────────────────────────────────────
// Tipos y constantes
// ─────────────────────────────────────────────

type CategoriaHecho = 'interes' | 'fortaleza' | 'reto' | 'hito' | 'contexto';

interface CategoriaOption {
  value: CategoriaHecho;
  label: string;
  color: string;
}

const CATEGORIAS: CategoriaOption[] = [
  { value: 'contexto',   label: 'Contexto',   color: 'bg-neutro/30 text-texto-suave' },
  { value: 'interes',    label: 'Interes',     color: 'bg-turquesa/20 text-turquesa' },
  { value: 'fortaleza',  label: 'Fortaleza',   color: 'bg-acierto/20 text-acierto' },
  { value: 'reto',       label: 'Reto',        color: 'bg-coral/20 text-coral' },
  { value: 'hito',       label: 'Hito',        color: 'bg-amarillo/50 text-ambar' },
];

const CATEGORIA_SELECTED_CLASS = 'bg-turquesa text-white';

function getCategoriaColor(cat: string): string {
  return CATEGORIAS.find((c) => c.value === cat)?.color ?? 'bg-neutro/30 text-texto-suave';
}

function getCategoriaLabel(cat: string): string {
  return CATEGORIAS.find((c) => c.value === cat)?.label ?? 'Contexto';
}

interface Props {
  data: DashboardPadreData;
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export function SeccionPerfilVivo({ data }: Props) {
  const router = useRouter();

  // Formulario de perfil
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [contextoEdit, setContextoEdit] = useState(data.perfilVivo.contextoPersonal);
  const [personajesEdit, setPersonajesEdit] = useState(data.perfilVivo.personajesFavoritos);
  const [temasEvitarEdit, setTemasEvitarEdit] = useState((data.perfilVivo.temasEvitar ?? []).join(', '));

  // Nuevo hecho
  const [nuevoHecho, setNuevoHecho] = useState('');
  const [categoriaHecho, setCategoriaHecho] = useState<CategoriaHecho>('contexto');

  // Micro-pregunta
  const [respondiendoMicro, setRespondiendoMicro] = useState(false);

  // Eliminacion de hechos
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────

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

      await guardarPerfilVivo({
        studentId: data.studentId,
        contextoPersonal: contextoEdit,
        personajesFavoritos: personajesEdit,
        temasEvitar,
        nuevoHecho: nuevoHecho.trim() || undefined,
        categoriaHecho,
      });

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
      await responderMicroPreguntaPerfil({
        studentId: data.studentId,
        preguntaId: data.perfilVivo.microPreguntaActiva.id,
        respuesta,
      });
      setMensajePerfil('Respuesta guardada');
      router.refresh();
    } catch {
      setErrorPerfil('No se pudo guardar la respuesta');
    } finally {
      setRespondiendoMicro(false);
    }
  };

  const handleEliminarHecho = async (hechoId: string) => {
    setEliminandoId(hechoId);
    setErrorPerfil(null);
    try {
      await eliminarHecho({
        studentId: data.studentId,
        hechoId,
      });
      router.refresh();
    } catch {
      setErrorPerfil('No se pudo eliminar el hecho');
    } finally {
      setEliminandoId(null);
    }
  };

  // ─── Render ─────────────────────────────────

  return (
    <SeccionCard titulo="Perfil vivo del lector" icon={<Fingerprint size={18} className="text-turquesa" />}>
      <div className="space-y-3">

        {/* Contexto personal */}
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

        {/* Personajes favoritos */}
        <div>
          <label className="text-[11px] font-semibold text-texto-suave">Personajes favoritos</label>
          <input
            value={personajesEdit}
            onChange={(e) => setPersonajesEdit(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
            placeholder="Ej: Bluey, Messi, Doraemon..."
          />
        </div>

        {/* Temas a evitar */}
        <div>
          <label className="text-[11px] font-semibold text-texto-suave">Temas a evitar (coma separada)</label>
          <input
            value={temasEvitarEdit}
            onChange={(e) => setTemasEvitarEdit(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
            placeholder="Ej: sustos fuertes, tormentas..."
          />
        </div>

        {/* Nuevo hecho: texto + selector de categoria */}
        <div className="space-y-2">
          <input
            value={nuevoHecho}
            onChange={(e) => setNuevoHecho(e.target.value)}
            className="w-full rounded-xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto outline-none focus:border-turquesa"
            placeholder="Nuevo dato util para personalizar historias..."
          />

          {/* Selector de categoria como pills */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-texto-suave">
              Categoria del dato
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoriaHecho(cat.value)}
                  className={[
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    'min-h-[36px]', // touch target generoso
                    categoriaHecho === cat.value
                      ? CATEGORIA_SELECTED_CLASS
                      : cat.color,
                  ].join(' ')}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
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

      {/* Micro-pregunta activa */}
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

      {/* Memoria util: tag cloud con borrado */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold text-texto-suave">
          Memoria util ({data.perfilVivo.totalHechos} hechos)
        </p>

        {data.perfilVivo.hechosRecientes.length === 0 ? (
          <p className="mt-1 text-[11px] text-texto-suave">Sin hechos recientes aun.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {data.perfilVivo.hechosRecientes.map((h) => (
              <div
                key={h.id}
                className={[
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1',
                  getCategoriaColor(h.categoria),
                ].join(' ')}
              >
                <span className="text-[10px] font-semibold opacity-70">
                  {getCategoriaLabel(h.categoria)}
                </span>
                <span className="text-[11px]">{h.texto}</span>
                <button
                  type="button"
                  onClick={() => void handleEliminarHecho(h.id)}
                  disabled={eliminandoId === h.id}
                  aria-label={`Eliminar: ${h.texto}`}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 disabled:opacity-30"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {data.perfilVivo.totalHechos > data.perfilVivo.hechosRecientes.length && (
          <p className="mt-2 text-[10px] text-texto-suave">
            Mostrando {data.perfilVivo.hechosRecientes.length} de {data.perfilVivo.totalHechos} hechos.
          </p>
        )}
      </div>
    </SeccionCard>
  );
}
