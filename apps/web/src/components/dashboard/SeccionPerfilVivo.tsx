'use client';

/**
 * Seccion de perfil vivo: contexto, personajes, temas a evitar, micro-preguntas, hechos.
 * Extraida de DashboardPadreDetalle.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import {
  guardarPerfilVivo,
  responderMicroPreguntaPerfil,
} from '@/server/actions/profile-actions';
import { SeccionCard } from './SeccionCard';

function categoriaHechoLabel(cat: string): string {
  if (cat === 'interes') return 'Interes';
  if (cat === 'fortaleza') return 'Fortaleza';
  if (cat === 'reto') return 'Reto';
  if (cat === 'hito') return 'Hito';
  return 'Contexto';
}

interface Props {
  data: DashboardPadreData;
}

export function SeccionPerfilVivo({ data }: Props) {
  const router = useRouter();
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [respondiendoMicro, setRespondiendoMicro] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [contextoEdit, setContextoEdit] = useState(data.perfilVivo.contextoPersonal);
  const [personajesEdit, setPersonajesEdit] = useState(data.perfilVivo.personajesFavoritos);
  const [temasEvitarEdit, setTemasEvitarEdit] = useState((data.perfilVivo.temasEvitar ?? []).join(', '));
  const [nuevoHecho, setNuevoHecho] = useState('');
  const [categoriaHecho, setCategoriaHecho] = useState<'interes' | 'fortaleza' | 'reto' | 'hito' | 'contexto'>('contexto');

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
    <SeccionCard titulo="Perfil vivo del lector" icon={<Fingerprint size={18} className="text-turquesa" />}>
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
  );
}
