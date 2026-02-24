'use client';

/**
 * Pantalla de lectura con paginacion orientada a experiencia de libro.
 *
 * Cambios UX:
 * - Sin ajuste manual de dificultad en pantalla.
 * - Menu compacto (⋯) con acciones secundarias.
 * - Selector de fuente (normal/dislexia).
 * - Paginacion por oraciones para evitar cortes raros.
 */
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import type { AudioReadingAnalysis } from '@/lib/types/reading';

export interface WpmData {
  wpmPromedio: number;
  wpmPorPagina: Array<{ pagina: number; wpm: number }>;
  totalPaginas: number;
  fuenteWpm: 'audio' | 'pagina';
  audioAnalisis?: AudioReadingAnalysis | null;
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

interface BrowserAudioContextConstructor {
  new (): AudioContext;
}

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  nivel: number;
  preferenciaFuente?: TipoFuenteLectura;
  preferenciasAccesibilidad?: {
    modoTDAH?: boolean;
    altoContraste?: boolean;
  };
  onTerminar: (tiempoLecturaMs: number, wpmData: WpmData) => void;
  onAnalizarAudio?: AudioAnalisisHandler;
  fromCache?: boolean;
  onRegenerar?: () => void;
  onSalir?: () => void;
}

type TipoFuenteLectura = 'libro' | 'dislexia';

const DELAY_TERMINAR_MS = 15_000;
const READING_FONT_STORAGE_KEY = 'omegaread.reading-font';

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

function getAudioContextConstructor(): BrowserAudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (
    window as unknown as {
      AudioContext?: BrowserAudioContextConstructor;
      webkitAudioContext?: BrowserAudioContextConstructor;
    }
  ).AudioContext
    ??
    (window as unknown as { webkitAudioContext?: BrowserAudioContextConstructor }).webkitAudioContext;
  return ctor ?? null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...sub);
  }

  return btoa(binary);
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
  const [audioEstado, setAudioEstado] = useState<'idle' | 'recording' | 'unsupported' | 'denied' | 'processing'>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Timestamps: uno por transicion de pagina + inicio
  const timestampsRef = useRef<number[]>([0]);
  const inicioTotalRef = useRef(0);
  const maxPaginaRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const ultimoTickVadRef = useRef(0);
  const vozActivaMsRef = useRef(0);

  const familiaFuenteLectura =
    tipoFuente === 'dislexia'
      ? 'var(--font-lectura-dislexia)'
      : 'var(--font-lectura-normal)';
  const modoTDAH = preferenciasAccesibilidad?.modoTDAH === true;
  const altoContraste = preferenciasAccesibilidad?.altoContraste === true;

  const detenerAnalisisAudio = useCallback(async () => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    ultimoTickVadRef.current = 0;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          recorder.removeEventListener('stop', onStop);
          resolve();
        };
        recorder.addEventListener('stop', onStop, { once: true });
        recorder.stop();
      });
    }
    mediaRecorderRef.current = null;

    const stream = audioStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    const ctx = audioContextRef.current;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // Ignorado: puede estar ya cerrado.
      }
      audioContextRef.current = null;
    }
  }, []);

  const iniciarAnalisisAudio = useCallback(async () => {
    if (!onAnalizarAudio) return;
    setAudioError(null);
    setAudioEstado('idle');

    if (
      typeof window === 'undefined'
      || !navigator.mediaDevices?.getUserMedia
      || !window.MediaRecorder
    ) {
      setAudioEstado('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      const Ctx = getAudioContextConstructor();
      if (Ctx) {
        const audioContext = new Ctx();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        const thresholdRms = 0.02;

        const tick = () => {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
          }
          const rms = Math.sqrt(sum / buffer.length);

          const now = performance.now();
          const delta = ultimoTickVadRef.current > 0 ? now - ultimoTickVadRef.current : 0;
          ultimoTickVadRef.current = now;

          if (rms >= thresholdRms && delta > 0 && delta < 1000) {
            vozActivaMsRef.current += delta;
          }

          vadRafRef.current = requestAnimationFrame(tick);
        };
        vadRafRef.current = requestAnimationFrame(tick);
      }

      const preferred = 'audio/webm;codecs=opus';
      const mimeType = MediaRecorder.isTypeSupported(preferred) ? preferred : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setAudioEstado('recording');
    } catch {
      setAudioEstado('denied');
      setAudioError('No se pudo activar el microfono. Puedes reintentarlo desde el menu.');
    }
  }, [onAnalizarAudio]);

  const reintentarAnalisisAudio = useCallback(async () => {
    await detenerAnalisisAudio();
    audioChunksRef.current = [];
    vozActivaMsRef.current = 0;
    await iniciarAnalisisAudio();
  }, [detenerAnalisisAudio, iniciarAnalisisAudio]);

  const finalizarAudioYAnalizar = useCallback(
    async (tiempoTotalMs: number) => {
      if (!onAnalizarAudio || audioEstado !== 'recording') {
        return null;
      }

      setAudioEstado('processing');
      await detenerAnalisisAudio();

      const vozActivaMs = Math.round(vozActivaMsRef.current);
      const chunks = audioChunksRef.current;
      if (chunks.length === 0 || vozActivaMs <= 0) {
        setAudioEstado('idle');
        return null;
      }

      const mimeType = chunks[0]?.type || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });
      const audioBase64 = await blobToBase64(blob);

      const resultado = await onAnalizarAudio({
        audioBase64,
        mimeType,
        tiempoVozActivaMs: vozActivaMs,
        tiempoTotalMs,
      });

      setAudioEstado('idle');
      if (!resultado.ok) {
        setAudioError('No pudimos analizar el audio. Se uso ritmo por pagina.');
        return null;
      }

      return resultado.analisis;
    },
    [audioEstado, detenerAnalisisAudio, onAnalizarAudio],
  );

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
    timestampsRef.current = [Date.now()];
    inicioTotalRef.current = Date.now();
    maxPaginaRef.current = 0;
    audioChunksRef.current = [];
    vozActivaMsRef.current = 0;
    setMenuAbierto(false);
    void iniciarAnalisisAudio();

    return () => {
      void detenerAnalisisAudio();
    };
  }, [contenido, iniciarAnalisisAudio, detenerAnalisisAudio]);

  // Proteccion anti finish instantaneo
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timer reset when story changes
    setPuedeTerminar(false);
    const timer = setTimeout(() => setPuedeTerminar(true), DELAY_TERMINAR_MS);
    return () => clearTimeout(timer);
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
      if (next > maxPaginaRef.current) {
        timestampsRef.current.push(Date.now());
        maxPaginaRef.current = next;
      }
      return next;
    });
  }, []);

  const handlePaginaAnterior = useCallback(() => {
    setPaginaActual((p) => Math.max(0, p - 1));
  }, []);

  const handleTerminar = useCallback(async () => {
    const ahora = Date.now();
    if (timestampsRef.current.length <= totalPaginas) {
      timestampsRef.current.push(ahora);
    }
    const tiempoTotalMs = ahora - inicioTotalRef.current;

    const wpmPorPagina: Array<{ pagina: number; wpm: number }> = [];
    for (let i = 0; i < totalPaginas; i++) {
      const inicio = timestampsRef.current[i];
      const fin = timestampsRef.current[i + 1];
      if (inicio == null || fin == null) continue;
      const minutos = (fin - inicio) / 60_000;
      const palabras = contarPalabras(paginas[i] ?? '');
      const wpm = minutos > 0 ? Math.round(palabras / minutos) : 0;
      wpmPorPagina.push({ pagina: i + 1, wpm });
    }

    const paginasParaPromedio = wpmPorPagina.filter((p) => p.pagina > 1);
    const wpmPromedioPorPagina = paginasParaPromedio.length > 0
      ? Math.round(paginasParaPromedio.reduce((sum, p) => sum + p.wpm, 0) / paginasParaPromedio.length)
      : (wpmPorPagina[0]?.wpm ?? 0);

    let audioAnalisis: AudioReadingAnalysis | null = null;
    if (onAnalizarAudio && audioEstado === 'recording') {
      try {
        audioAnalisis = await finalizarAudioYAnalizar(tiempoTotalMs);
      } catch {
        setAudioError('No pudimos analizar el audio. Se uso ritmo por pagina.');
      }
    }

    const usarAudio = !!audioAnalisis?.confiable && audioAnalisis.wpmUtil > 0;
    const wpmPromedioFinal = usarAudio && audioAnalisis
      ? audioAnalisis.wpmUtil
      : wpmPromedioPorPagina;

    const payload: WpmData = {
      wpmPromedio: wpmPromedioFinal,
      wpmPorPagina,
      totalPaginas,
      fuenteWpm: usarAudio ? 'audio' : 'pagina',
      audioAnalisis,
    };

    if (onTerminar.length < 2) {
      (onTerminar as unknown as (tiempoMs: number) => void)(tiempoTotalMs);
      return;
    }

    onTerminar(tiempoTotalMs, payload);
  }, [onTerminar, totalPaginas, paginas, finalizarAudioYAnalizar, onAnalizarAudio, audioEstado]);

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
  const procesandoAudio = audioEstado === 'processing';
  const textoPaginaActual = paginas[paginaActual] ?? '';
  const parrafos = textoPaginaActual
    .split('\n\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const estadoAudioTexto =
    audioEstado === 'recording'
      ? 'Activo'
      : audioEstado === 'processing'
        ? 'Analizando'
        : audioEstado === 'denied'
          ? 'Sin permiso'
          : audioEstado === 'unsupported'
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
        {titulo}
      </h1>

      {/* Barra superior compacta */}
      <div className="flex items-center justify-between mb-3 no-print">
        <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
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
                className="w-full text-left rounded-xl px-3 py-2 text-sm text-texto hover:bg-fondo transition-colors"
              >
                Imprimir historia
              </button>

              {fromCache && onRegenerar && (
                <button
                  type="button"
                  onClick={handleRegenerarDesdeMenu}
                  className="w-full text-left rounded-xl px-3 py-2 text-sm text-texto hover:bg-fondo transition-colors"
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
                    onClick={() => void reintentarAnalisisAudio()}
                    className="mt-1 w-full text-left rounded-lg px-2 py-1.5 text-xs text-texto hover:bg-superficie transition-colors"
                  >
                    Reintentar microfono
                  </button>
                  {audioError && (
                    <p className="mt-1 text-[11px] text-texto-suave">{audioError}</p>
                  )}
                </div>
              )}

              {onSalir && (
                <button
                  type="button"
                  onClick={handleSalir}
                  className="mt-2 w-full text-left rounded-xl px-3 py-2 text-sm text-coral hover:bg-coral/10 transition-colors"
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
          <span>Anterior</span>
        </button>

        <span className="text-sm font-medium text-texto-suave tabular-nums">
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
              <span>{procesandoAudio ? 'Analizando...' : 'Terminar'}</span>
              <span>✓</span>
            </button>
          ) : (
            <span className="text-xs text-texto-suave">Tomate tu tiempo para leer...</span>
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
            <span>Siguiente</span>
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
