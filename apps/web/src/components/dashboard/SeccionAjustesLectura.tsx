'use client';

/**
 * Seccion de ajustes de lectura: fun mode + toggles de accesibilidad.
 * Extraida de DashboardPadreDetalle.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import type { DashboardPadreData } from '@/server/actions/dashboard-actions';
import { guardarAjustesLectura } from '@/server/actions/profile-actions';
import { derivarTonoEfectivo } from '@/lib/story-generation/trace';
import { SeccionCard } from './SeccionCard';
import SelectorTono from '@/components/ui/SelectorTono';

interface Props {
  data: DashboardPadreData;
}

export function SeccionAjustesLectura({ data }: Props) {
  const router = useRouter();
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);
  const [mensajeAjustes, setMensajeAjustes] = useState<string | null>(null);
  const [errorAjustes, setErrorAjustes] = useState<string | null>(null);
  const [tonoHistoria, setTonoHistoria] = useState(
    derivarTonoEfectivo(data.ajustes.accesibilidad.tonoHistoria, data.ajustes.funMode),
  );
  const [fuenteDislexia, setFuenteDislexia] = useState(data.ajustes.accesibilidad.fuenteDislexia);
  const [modoTDAH, setModoTDAH] = useState(data.ajustes.accesibilidad.modoTDAH);
  const [altoContraste, setAltoContraste] = useState(data.ajustes.accesibilidad.altoContraste);
  const [lecturaSinTildes, setLecturaSinTildes] = useState(data.ajustes.accesibilidad.lecturaSinTildes);
  const [lecturaAllCaps, setLecturaAllCaps] = useState(data.ajustes.accesibilidad.lecturaAllCaps);

  const handleGuardarAjustes = async () => {
    setGuardandoAjustes(true);
    setMensajeAjustes(null);
    setErrorAjustes(null);
    try {
      const result = await guardarAjustesLectura({
        studentId: data.studentId,
        accesibilidad: {
          fuenteDislexia,
          modoTDAH,
          altoContraste,
          lecturaSinTildes,
          lecturaAllCaps,
          tonoHistoria,
        },
      });

      if (!result.ok) {
        setErrorAjustes('No se pudieron guardar los ajustes.');
        return;
      }

      setMensajeAjustes('Ajustes guardados');
      router.refresh();
    } catch {
      setErrorAjustes('No se pudieron guardar los ajustes.');
    } finally {
      setGuardandoAjustes(false);
    }
  };

  return (
    <SeccionCard titulo="Ajustes de lectura" icon={<Settings size={18} className="text-texto-suave" />}>
      <div className="space-y-3">
        <div className="rounded-xl bg-fondo p-3">
          <p className="text-xs font-semibold text-texto mb-1">Tipo de historia</p>
          <p className="text-[11px] text-texto-suave mb-3">
            De educativo puro a maxima creatividad. Todas las posiciones mantienen contenido educativo.
          </p>
          <SelectorTono
            value={tonoHistoria}
            onChange={setTonoHistoria}
            disabled={guardandoAjustes}
          />
        </div>

        <p className="text-[11px] font-semibold text-texto-suave">Accesibilidad del lector</p>

        <label className="flex items-center gap-3 rounded-xl bg-fondo p-3">
          <input
            type="checkbox"
            checked={fuenteDislexia}
            onChange={(e) => setFuenteDislexia(e.target.checked)}
            className="h-4 w-4 rounded border-neutro/30 text-turquesa focus:ring-turquesa"
          />
          <span className="text-xs text-texto">Fuente dislexica por defecto</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-fondo p-3">
          <input
            type="checkbox"
            checked={modoTDAH}
            onChange={(e) => setModoTDAH(e.target.checked)}
            className="h-4 w-4 rounded border-neutro/30 text-turquesa focus:ring-turquesa"
          />
          <span className="text-xs text-texto">Modo TDAH (espaciado mas comodo)</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-fondo p-3">
          <input
            type="checkbox"
            checked={altoContraste}
            onChange={(e) => setAltoContraste(e.target.checked)}
            className="h-4 w-4 rounded border-neutro/30 text-turquesa focus:ring-turquesa"
          />
          <span className="text-xs text-texto">Alto contraste</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-fondo p-3">
          <input
            type="checkbox"
            checked={lecturaSinTildes}
            onChange={(e) => setLecturaSinTildes(e.target.checked)}
            className="h-4 w-4 rounded border-neutro/30 text-turquesa focus:ring-turquesa"
          />
          <span className="text-xs text-texto">Lectura sin tildes (primeros lectores)</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl bg-fondo p-3">
          <input
            type="checkbox"
            checked={lecturaAllCaps}
            onChange={(e) => setLecturaAllCaps(e.target.checked)}
            className="h-4 w-4 rounded border-neutro/30 text-turquesa focus:ring-turquesa"
          />
          <span className="text-xs text-texto">Texto en MAYÚSCULAS (primeros lectores)</span>
        </label>

        <button
          type="button"
          onClick={() => void handleGuardarAjustes()}
          disabled={guardandoAjustes}
          className="rounded-xl bg-turquesa px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {guardandoAjustes ? 'Guardando...' : 'Guardar ajustes'}
        </button>

        {mensajeAjustes && <p className="text-[11px] text-acierto">{mensajeAjustes}</p>}
        {errorAjustes && <p className="text-[11px] text-coral">{errorAjustes}</p>}
      </div>
    </SeccionCard>
  );
}
