'use client';

/**
 * Pantalla de lectura con paginacion orientada a experiencia de libro.
 *
 * Cambios UX:
 * - Sin ajuste manual de dificultad en pantalla.
 * - Menu compacto con acciones secundarias.
 * - Selector de fuente (normal/dislexia).
 * - Paginacion por oraciones para evitar cortes raros.
 *
 * Audio recording y reading timer delegados a hooks dedicados.
 */
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import type { AudioReadingAnalysis } from '@/lib/types/reading';
import type { WpmConfidence, SanitizedPageWpm } from '@/lib/wpm';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useReadingTimer } from '@/hooks/useReadingTimer';

export interface WpmData {
  wpmPromedio: number;
  wpmPorPagina: Array<{ pagina: number; wpm: number }>;
  totalPaginas: number;
  fuenteWpm: 'audio' | 'pagina';
  audioAnalisis?: AudioReadingAnalysis | null;
  wpmRobusto: number;
  confianza: WpmConfidence;
  paginasSanitizadas: SanitizedPageWpm[];
}

export interface AudioAnalisisPayload {
  audioBase64: string;
  mimeType?: string;
  tiempoVozActivaMs: number;
  tiempoTotalMs: number;
}

export type AudioAnalisisHandler = (
  payload: AudioAnalisisPayload,
) => Promise<
  | { ok: true; analisis: AudioReadingAnalysis }
  | { ok: false; error: string }
>;

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  nivel: number;
  preferenciaFuente?: TipoFuenteLectura;
  preferenciasAccesibilidad?: {
    modoTDAH?: boolean;
    altoContraste?: boolean;
    allCaps?: boolean;
  };
  onTerminar: (tiempoLecturaMs: number, wpmData: WpmData) => void;
  onAnalizarAudio?: AudioAnalisisHandler;
  fromCache?: boolean;
  onRegenerar?: () => void;
  onSalir?: () => void;
}

type TipoFuenteLectura = 'libro' | 'dislexia';

const DELAY_TERMINAR_MS = 15_000;
const READING_FONT_STORAGE_KEY = 'zetaread.reading-font';

/** Font size adaptativo: nivel 1.0 -> 24px, nivel 4.8 -> 18px */
function getFontSizePx(nivel: number): number {
  const t = (Math.min(4.8, Math.max(1.0, nivel)) - 1.0) / 3.8;
  return Math.round(24 - t * 6);
}

/** Objetivo de paginas: nivel bajo 8 paginas, nivel alto 4 paginas */
function getPaginasObjetivo(nivel: number): number {
  const t = (Math.min(4.8, Math.max(1.0, nivel)) - 1.0) / 3.8;
  return Math.round(8 - t * 4);
}

/** Cuenta palabras de un texto */
function contarPalabras(texto: string): number {
  return texto
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0).length;
}

function getPalabrasObjetivoPorPagina(contenido: string, nivel: number): number {
  const totalPalabras = contarPalabras(contenido);
  const paginasObjetivo = Math.max(1, getPaginasObjetivo(nivel));
  const ideal = Math.round(totalPalabras / paginasObjetivo);
  return Math.max(30, Math.min(120, ideal));
}

/** Divide el texto por oraciones completas para evitar cortes abruptos. */
function dividirEnPaginas(contenido: string, palabrasObjetivo: number): string[] {
  const parrafos = contenido
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parrafos.length === 0) return [contenido];

  const paginas: string[] = [];
  let paginaActual = '';
  let palabrasEnPagina = 0;

  const flushPagina = () => {
    const limpia = paginaActual.trim();
    if (limpia.length > 0) paginas.push(limpia);
    paginaActual = '';
    palabrasEnPagina = 0;
  };

  for (const parrafo of parrafos) {
    const oraciones = parrafo
      .split(/(?<=[.!?])\s+/)
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (oraciones.length === 0) continue;

    let esPrimeraOracionDelParrafo = true;

    for (const oracion of oraciones) {
      const palabrasOracion = contarPalabras(oracion);
      const excede = palabrasEnPagina > 0 && palabrasEnPagina + palabrasOracion > palabrasObjetivo;

      if (excede) {
        flushPagina();
        esPrimeraOracionDelParrafo = true;
      }

      if (paginaActual.length === 0) {
        paginaActual = oracion;
      } else {
        paginaActual += esPrimeraOracionDelParrafo ? `\n\n${oracion}` : ` ${oracion}`;
      }

      palabrasEnPagina += palabrasOracion;
      esPrimeraOracionDelParrafo = false;
    }
  }

  flushPagina();
  return paginas.length > 0 ? paginas : [contenido];
}

export default function PantallaLectura({
  titulo,
  contenido,
  nivel,
  preferenciaFuente,
  preferenciasAccesibilidad,
  onTerminar,
  onAnalizarAudio,
  fromCache = false,
  onRegenerar,
  onSalir,
}: PantallaLecturaProps) {
  const palabrasObjetivo = useMemo(
    () => getPalabrasObjetivoPorPagina(contenido, nivel),
    [contenido, nivel],
  );
  const paginas = useMemo(
    () => dividirEnPaginas(contenido, palabrasObjetivo),
    [contenido, palabrasObjetivo],
  );
  const totalPaginas = paginas.length;
  const fontSize = getFontSizePx(nivel);

  const [paginaActual, setPaginaActual] = useState(0);
  const [puedeTerminar, setPuedeTerminar] = useState(false);
  const [mostrarVersionImpresion, setMostrarVersionImpresion] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [tipoFuente, setTipoFuente] = useState<TipoFuenteLectura>(() => {
    if (typeof window === 'undefined') return preferenciaFuente ?? 'libro';
    const stored = window.localStorage.getItem(READING_FONT_STORAGE_KEY);
    if (stored === 'libro' || stored === 'dislexia') return stored;
    return preferenciaFuente ?? 'libro';
  });

  const menuRef = useRef<HTMLDivElement | null>(null);

  // ─── Custom hooks ───
  const audio = useAudioRecording();
  const timer = useReadingTimer();

  const familiaFuenteLectura =
    tipoFuente === 'dislexia'
      ? 'var(--font-lectura-dislexia)'
      : 'var(--font-lectura-normal)';
  const modoTDAH = preferenciasAccesibilidad?.modoTDAH === true;
  const altoContraste = preferenciasAccesibilidad?.altoContraste === true;
  const allCaps = preferenciasAccesibilidad?.allCaps === true;

  // Persistir preferencia de fuente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(READING_FONT_STORAGE_KEY, tipoFuente);
  }, [tipoFuente]);

  useEffect(() => {
    if (!preferenciaFuente) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync font default from parent settings
    setTipoFuente(preferenciaFuente);
  }, [preferenciaFuente]);

  // Reset cuando cambia el contenido
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset required when story changes
    setPaginaActual(0);
    timer.iniciar();
    setMenuAbierto(false);
    if (onAnalizarAudio) {
      void audio.iniciar();
    }

    return () => {
      void audio.detener();
    };
  }, [contenido]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional reset on content change

  // Proteccion anti finish instantaneo
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timer reset when story changes
    setPuedeTerminar(false);
    const t = setTimeout(() => setPuedeTerminar(true), DELAY_TERMINAR_MS);
    return () => clearTimeout(t);
  }, [contenido]);

  // Cerrar version de impresion tras finalizar impresion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAfterPrint = () => setMostrarVersionImpresion(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // Cerrar menu al clickar fuera
  useEffect(() => {
    if (!menuAbierto) return;
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuAbierto]);

  const handleSiguientePagina = useCallback(() => {
    setPaginaActual((p) => {
      const next = p + 1;
      if (next > timer.getMaxPagina()) {
        timer.registrarAvancePagina();
      }
      return next;
    });
  }, [timer]);

  const handlePaginaAnterior = useCallback(() => {
    setPaginaActual((p) => Math.max(0, p - 1));
  }, []);

  const handleTerminar = useCallback(async () => {
    const result = timer.finalizar(totalPaginas, paginas, contarPalabras, nivel);

    // Try to get audio analysis
    let audioAnalisis: AudioReadingAnalysis | null = null;
    if (onAnalizarAudio && audio.estado === 'recording') {
      try {
        const audioData = await audio.detenerYObtener();
        if (audioData) {
          const analisisResult = await onAnalizarAudio({
            audioBase64: audioData.audioBase64,
            mimeType: audioData.mimeType,
            tiempoVozActivaMs: audioData.vozActivaMs,
            tiempoTotalMs: result.tiempoTotalMs,
          });
          if (analisisResult.ok) {
            audioAnalisis = analisisResult.analisis;
          }
        }
      } catch (err) {
        // Audio analysis failed; fall back to page-based WPM
        console.warn('[PantallaLectura] audio analysis failed:', err);
      }
    }

    const usarAudio = !!audioAnalisis?.confiable && audioAnalisis.wpmUtil > 0;
    const wpmPromedioFinal = usarAudio && audioAnalisis
      ? audioAnalisis.wpmUtil
      : result.wpmPromedio;

    const payload: WpmData = {
      wpmPromedio: wpmPromedioFinal,
      wpmPorPagina: result.wpmPorPagina,
      totalPaginas,
      fuenteWpm: usarAudio ? 'audio' : 'pagina',
      audioAnalisis,
      wpmRobusto: result.wpmRobusto,
      confianza: result.confianza,
      paginasSanitizadas: result.paginasSanitizadas,
    };

    onTerminar(result.tiempoTotalMs, payload);
  }, [onTerminar, totalPaginas, paginas, nivel, timer, audio, onAnalizarAudio]);

  const handlePrint = useCallback(() => {
    setMostrarVersionImpresion(true);
    if (typeof window === 'undefined') return;
    const run = () => window.print();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }, []);

  const handleSalir = useCallback(() => {
    setMenuAbierto(false);
    onSalir?.();
  }, [onSalir]);

  const handleRegenerarDesdeMenu = useCallback(() => {
    setMenuAbierto(false);
    onRegenerar?.();
  }, [onRegenerar]);

  const esUltimaPagina = paginaActual >= totalPaginas - 1;
  const esPrimeraPagina = paginaActual === 0;
  const procesandoAudio = audio.estado === 'processing';
  const textoPaginaActual = paginas[paginaActual] ?? '';
  const textoPaginaRender = allCaps ? textoPaginaActual.toUpperCase() : textoPaginaActual;
  const parrafos = textoPaginaRender
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const estadoAudioTexto =
    audio.estado === 'recording'
      ? 'Activo'
      : audio.estado === 'processing'
        ? 'Analizando'
        : audio.estado === 'denied'
          ? 'Sin permiso'
          : audio.estado === 'unsupported'
            ? 'No disponible'
          : 'Inactivo';
  const cardLecturaClass = altoContraste
    ? 'relative mb-6 rounded-[30px] border border-black bg-white p-6 sm:p-8 shadow-[0_10px_25px_rgba(0,0,0,0.16)]'
    : 'relative mb-6 rounded-[30px] border border-[#e7dcc7] bg-[linear-gradient(180deg,#fffef9_0%,#fffaf0_100%)] p-6 sm:p-8 shadow-[0_10px_25px_rgba(158,128,77,0.14)]';
  const lineHeightLectura = modoTDAH ? 2.05 : 1.85;
  const letterSpacingLectura = modoTDAH ? '0.02em' : 'normal';

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto">
      {/* Titulo */}
      <h1
        className="text-3xl sm:text-4xl font-bold text-texto text-center mb-5 leading-snug"
        style={{ fontFamily: 'var(--font-lectura-normal)' }}
      >
        {allCaps ? titulo.toUpperCase() : titulo}
      </h1>

      {/* Barra superior compacta */}
      <div className="flex items-center justify-between mb-3 no-print">
        <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10 font-datos">
          {paginaActual + 1} / {totalPaginas}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            className="!min-h-8 !min-w-8 h-8 w-8 rounded-full border border-neutro/20 bg-superficie text-texto-suave text-lg leading-none hover:text-texto hover:border-neutro/40 transition-colors"
            aria-label="Abrir opciones de lectura"
          >
            ⋯
          </button>

          {menuAbierto && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-neutro/20 bg-superficie p-3 shadow-lg">
              <p className="text-[11px] font-semibold text-texto-suave mb-2">Opciones de lectura</p>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-texto bg-fondo hover:bg-turquesa/10 border border-neutro/15 transition-colors font-datos"
              >
                Imprimir historia
              </button>

              {fromCache && onRegenerar && (
                <button
                  type="button"
                  onClick={handleRegenerarDesdeMenu}
                  className="mt-1.5 w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-texto bg-fondo hover:bg-turquesa/10 border border-neutro/15 transition-colors font-datos"
                >
                  Quiero otra historia
                </button>
              )}

              <div className="mt-2 rounded-xl bg-fondo p-2">
                <p className="text-[11px] font-semibold text-texto-suave mb-1">Fuente</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTipoFuente('libro')}
                    className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      tipoFuente === 'libro'
                        ? 'bg-turquesa/15 text-turquesa font-semibold'
                        : 'bg-superficie text-texto-suave'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoFuente('dislexia')}
                    className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      tipoFuente === 'dislexia'
                        ? 'bg-turquesa/15 text-turquesa font-semibold'
                        : 'bg-superficie text-texto-suave'
                    }`}
                  >
                    Dislexia
                  </button>
                </div>
              </div>

              {onAnalizarAudio && (
                <div className="mt-2 rounded-xl bg-fondo p-2">
                  <p className="text-[11px] text-texto-suave">Microfono: <span className="font-semibold text-texto">{estadoAudioTexto}</span></p>
                  <button
                    type="button"
                    onClick={() => void audio.reintentar()}
                    className="mt-1 w-full text-left rounded-lg px-2 py-1.5 text-xs text-texto hover:bg-superficie transition-colors"
                  >
                    Reintentar microfono
                  </button>
                  {audio.error && (
                    <p className="mt-1 text-[11px] text-texto-suave">{audio.error}</p>
                  )}
                </div>
              )}

              {onSalir && (
                <button
                  type="button"
                  onClick={handleSalir}
                  className="mt-1.5 w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-coral bg-coral/5 hover:bg-coral/10 border border-coral/20 transition-colors font-datos"
                >
                  Salir de lectura
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagina de lectura estilo libro */}
      <div className={cardLecturaClass}>
        <div className="pointer-events-none absolute left-6 right-6 top-4 h-px bg-[#e8d9bc]" />

        <div className="space-y-5 pt-2">
          {parrafos.map((parrafo, i) => (
            <p
              key={i}
              className={altoContraste ? 'text-black' : 'text-texto'}
              style={{
                fontFamily: familiaFuenteLectura,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeightLectura,
                letterSpacing: letterSpacingLectura,
                textIndent: i === 0 ? '0' : '0.8em',
              }}
            >
              {parrafo}
            </p>
          ))}
        </div>
      </div>

      {/* Navegacion */}
      <div className="flex items-center justify-between pb-8 px-2 no-print">
        <button
          type="button"
          onClick={handlePaginaAnterior}
          disabled={esPrimeraPagina || procesandoAudio}
          className={`
            flex items-center gap-1.5
            px-4 py-3 rounded-2xl
            text-sm font-semibold
            transition-all duration-150
            touch-manipulation
            ${esPrimeraPagina
              ? 'text-neutro/30 cursor-not-allowed'
              : 'text-turquesa bg-turquesa/10 hover:bg-turquesa/20 active:scale-95'}
          `}
          aria-label="Pagina anterior"
        >
          <span>←</span>
          <span className="font-datos">Anterior</span>
        </button>

        <span className="text-sm font-medium text-texto-suave tabular-nums font-datos">
          {paginaActual + 1} / {totalPaginas}
        </span>

        {esUltimaPagina ? (
          puedeTerminar ? (
            <button
              type="button"
              onClick={handleTerminar}
              disabled={procesandoAudio}
              className="
                flex items-center gap-1.5
                px-4 py-3 rounded-2xl
                text-sm font-semibold
                bg-bosque text-white
                hover:bg-bosque/90 active:scale-95
                transition-all duration-150
                touch-manipulation
                disabled:opacity-50
              "
              aria-label="He terminado de leer"
            >
              <span className="font-datos">{procesandoAudio ? 'Analizando...' : 'Terminar'}</span>
              <span>✓</span>
            </button>
          ) : (
            <span className="text-xs text-texto-suave font-datos">Tomate tu tiempo para leer...</span>
          )
        ) : (
          <button
            type="button"
            onClick={handleSiguientePagina}
            disabled={procesandoAudio}
            className="
              flex items-center gap-1.5
              px-4 py-3 rounded-2xl
              text-sm font-semibold
              text-turquesa bg-turquesa/10
              hover:bg-turquesa/20 active:scale-95
              transition-all duration-150
              touch-manipulation
              disabled:opacity-50
            "
            aria-label="Siguiente pagina"
          >
            <span className="font-datos">Siguiente</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Historia completa para impresion */}
      {mostrarVersionImpresion && (
        <div className="print-story hidden print:block">
          <h1
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: familiaFuenteLectura }}
          >
            {titulo}
          </h1>
          <div className="space-y-4">
            {contenido
              .split('\n\n')
              .map((p) => p.trim())
              .filter((p) => p.length > 0)
              .map((parrafo, i) => (
                <p
                  key={i}
                  className="leading-relaxed"
                  style={{ fontFamily: familiaFuenteLectura, fontSize: `${Math.max(fontSize, 14)}px` }}
                >
                  {parrafo}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
