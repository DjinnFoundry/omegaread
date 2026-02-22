'use client';

/**
 * Pantalla de lectura con paginacion.
 * Divide el texto en 6-10 paginas segun nivel. Registra timestamps por pagina.
 * Calcula WPM por pagina al terminar.
 * Sprint 4: Botones "Hazlo mas facil" / "Hazlo mas desafiante".
 */
import { useRef, useCallback, useEffect, useState } from 'react';
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
  new(): AudioContext;
}

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  topicEmoji: string;
  topicNombre: string;
  nivel: number;
  onTerminar: (tiempoLecturaMs: number, wpmData: WpmData) => void;
  onAnalizarAudio?: AudioAnalisisHandler;
  onAjusteManual?: (direccion: 'mas_facil' | 'mas_desafiante', tiempoLecturaMs: number) => void;
  reescribiendo?: boolean;
  ajusteUsado?: boolean;
  rewriteCount?: number;
  /** Si la historia viene de cache, mostrar boton "Quiero otra" */
  fromCache?: boolean;
  /** Callback para pedir regeneracion de historia */
  onRegenerar?: () => void;
}

const DELAY_BOTONES_MS = 10_000;
const DELAY_TERMINAR_MS = 15_000;
const TOAST_DURACION_MS = 3_000;

/** Palabras por pagina: interpolacion lineal continua (nivel 1.0 -> 5, nivel 4.8 -> 50) */
function getPalabrasPorPagina(nivel: number): number {
  const t = (Math.min(4.8, Math.max(1.0, nivel)) - 1.0) / 3.8;
  return Math.round(5 + t * 45);
}

/** Font size adaptativo: interpolacion lineal continua (nivel 1.0 -> 28px, nivel 4.8 -> 16px) */
function getFontSizePx(nivel: number): number {
  const t = (Math.min(4.8, Math.max(1.0, nivel)) - 1.0) / 3.8;
  return Math.round(28 - t * 12);
}

/** Divide el texto en paginas respetando parrafos y oraciones */
function dividirEnPaginas(contenido: string, palabrasPorPagina: number): string[] {
  const parrafos = contenido.split('\n\n').filter(p => p.trim().length > 0);

  const paginas: string[] = [];
  let paginaActual: string[] = [];
  let palabrasEnPagina = 0;

  for (const parrafo of parrafos) {
    const palabrasParrafo = parrafo.split(/\s+/).filter(w => w.length > 0).length;

    // Si el parrafo cabe en la pagina actual, anadirlo
    if (palabrasEnPagina > 0 && palabrasEnPagina + palabrasParrafo > palabrasPorPagina) {
      // No cabe: cerrar pagina actual e iniciar nueva
      paginas.push(paginaActual.join('\n\n'));
      paginaActual = [];
      palabrasEnPagina = 0;
    }

    // Si el parrafo solo excede el limite, partirlo
    if (palabrasParrafo > palabrasPorPagina) {
      // Intentar partir por oraciones
      const oraciones = parrafo.split(/(?<=[.!?])\s+/);
      for (const oracion of oraciones) {
        const palabrasOracion = oracion.split(/\s+/).filter(w => w.length > 0).length;

        if (palabrasEnPagina > 0 && palabrasEnPagina + palabrasOracion > palabrasPorPagina) {
          paginas.push(paginaActual.join('\n\n'));
          paginaActual = [];
          palabrasEnPagina = 0;
        }

        // Si una sola oracion excede el limite, partir por palabras (fallback)
        if (palabrasOracion > palabrasPorPagina && palabrasEnPagina === 0) {
          const palabras = oracion.split(/\s+/).filter(w => w.length > 0);
          for (let i = 0; i < palabras.length; i += palabrasPorPagina) {
            const trozo = palabras.slice(i, i + palabrasPorPagina).join(' ');
            if (i + palabrasPorPagina < palabras.length) {
              paginas.push(trozo);
            } else {
              paginaActual.push(trozo);
              palabrasEnPagina = palabras.length - i;
            }
          }
        } else {
          if (paginaActual.length > 0) {
            // Append to last element (same paragraph)
            paginaActual[paginaActual.length - 1] += ' ' + oracion;
          } else {
            paginaActual.push(oracion);
          }
          palabrasEnPagina += palabrasOracion;
        }
      }
    } else {
      paginaActual.push(parrafo);
      palabrasEnPagina += palabrasParrafo;
    }
  }

  // Flush remaining
  if (paginaActual.length > 0) {
    paginas.push(paginaActual.join('\n\n'));
  }

  return paginas.length > 0 ? paginas : [contenido];
}

/** Cuenta palabras de un texto */
function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(w => w.length > 0).length;
}

function getAudioContextConstructor(): BrowserAudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { AudioContext?: BrowserAudioContextConstructor; webkitAudioContext?: BrowserAudioContextConstructor }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: BrowserAudioContextConstructor }).webkitAudioContext;
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
  topicEmoji,
  topicNombre,
  nivel,
  onTerminar,
  onAnalizarAudio,
  onAjusteManual,
  reescribiendo = false,
  ajusteUsado = false,
  rewriteCount = 0,
  fromCache = false,
  onRegenerar,
}: PantallaLecturaProps) {
  const palabrasPorPagina = getPalabrasPorPagina(nivel);
  const paginas = dividirEnPaginas(contenido, palabrasPorPagina);
  const totalPaginas = paginas.length;
  const fontSize = getFontSizePx(nivel);

  const [paginaActual, setPaginaActual] = useState(0);
  const [botonesAjusteVisibles, setBotonesAjusteVisibles] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [fading, setFading] = useState(false);
  const [puedeTerminar, setPuedeTerminar] = useState(false);
  const [mostrarVersionImpresion, setMostrarVersionImpresion] = useState(false);
  const [audioEstado, setAudioEstado] = useState<'idle' | 'recording' | 'unsupported' | 'denied' | 'processing'>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const prevRewriteCountRef = useRef(rewriteCount);

  // Timestamps: uno por cada transicion de pagina + inicio
  // Track max page reached to only count forward transitions for WPM
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

  const detenerAnalisisAudio = useCallback(async () => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    ultimoTickVadRef.current = 0;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>(resolve => {
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
      stream.getTracks().forEach(track => track.stop());
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

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
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
      setAudioError('No se pudo activar el microfono. Usaremos ritmo por pagina.');
    }
  }, [onAnalizarAudio]);

  const finalizarAudioYAnalizar = useCallback(async (tiempoTotalMs: number) => {
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
      setAudioError('No pudimos analizar el audio. Usaremos ritmo por pagina.');
      return null;
    }

    return resultado.analisis;
  }, [audioEstado, detenerAnalisisAudio, onAnalizarAudio]);

  // Reset cuando cambia el contenido (reescritura)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valid: resetting state when prop changes
    setPaginaActual(0);
    timestampsRef.current = [Date.now()];
    inicioTotalRef.current = Date.now();
    maxPaginaRef.current = 0;
    audioChunksRef.current = [];
    vozActivaMsRef.current = 0;
    void iniciarAnalisisAudio();

    return () => {
      void detenerAnalisisAudio();
    };
  }, [contenido, iniciarAnalisisAudio, detenerAnalisisAudio]);

  // Proteccion anti-finish instantaneo para evitar sesiones de 1 clic.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset required when the story content changes
    setPuedeTerminar(false);
    const timer = setTimeout(() => setPuedeTerminar(true), DELAY_TERMINAR_MS);
    return () => clearTimeout(timer);
  }, [contenido]);

  // Cerrar version de impresion tras finalizar la impresion.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAfterPrint = () => setMostrarVersionImpresion(false);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // Mostrar botones de ajuste despues de 10 segundos (solo en pagina 1)
  useEffect(() => {
    if (ajusteUsado || paginaActual > 0) return;
    const timer = setTimeout(() => setBotonesAjusteVisibles(true), DELAY_BOTONES_MS);
    return () => clearTimeout(timer);
  }, [ajusteUsado, paginaActual]);

  // Toast de reescritura
  useEffect(() => {
    if (rewriteCount === 0 || rewriteCount === prevRewriteCountRef.current) return;
    prevRewriteCountRef.current = rewriteCount;

    const rafId = requestAnimationFrame(() => {
      setMostrarToast(true);
      setFading(true);
    });

    const fadeTimer = setTimeout(() => setFading(false), 500);
    const toastTimer = setTimeout(() => setMostrarToast(false), TOAST_DURACION_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fadeTimer);
      clearTimeout(toastTimer);
    };
  }, [rewriteCount]);

  const handleSiguientePagina = useCallback(() => {
    setPaginaActual(p => {
      const next = p + 1;
      if (next > maxPaginaRef.current) {
        // Forward transition: record timestamp
        timestampsRef.current.push(Date.now());
        maxPaginaRef.current = next;
      }
      return next;
    });
  }, []);

  const handlePaginaAnterior = useCallback(() => {
    setPaginaActual(p => Math.max(0, p - 1));
  }, []);

  const handleTerminar = useCallback(async () => {
    const ahora = Date.now();
    // Only push final timestamp if we haven't already recorded it
    if (timestampsRef.current.length <= totalPaginas) {
      timestampsRef.current.push(ahora);
    }
    const tiempoTotalMs = ahora - inicioTotalRef.current;

    // Calcular WPM por pagina (only forward transitions)
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

    // Promedio descartando pagina 1 (calentamiento)
    const paginasParaPromedio = wpmPorPagina.filter(p => p.pagina > 1);
    const wpmPromedioPorPagina = paginasParaPromedio.length > 0
      ? Math.round(paginasParaPromedio.reduce((sum, p) => sum + p.wpm, 0) / paginasParaPromedio.length)
      : wpmPorPagina[0]?.wpm ?? 0;

    let audioAnalisis: AudioReadingAnalysis | null = null;
    if (onAnalizarAudio && audioEstado === 'recording') {
      try {
        audioAnalisis = await finalizarAudioYAnalizar(tiempoTotalMs);
      } catch {
        setAudioError('No pudimos analizar el audio. Usaremos ritmo por pagina.');
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

    // Compatibilidad: algunos tests/callers legacy esperan solo tiempoMs.
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

  const handleAjuste = useCallback((direccion: 'mas_facil' | 'mas_desafiante') => {
    if (!onAjusteManual || ajusteUsado || reescribiendo) return;
    const tiempoMs = Date.now() - inicioTotalRef.current;
    onAjusteManual(direccion, tiempoMs);
  }, [onAjusteManual, ajusteUsado, reescribiendo]);

  const esUltimaPagina = paginaActual >= totalPaginas - 1;
  const esPrimeraPagina = paginaActual === 0;
  const procesandoAudio = audioEstado === 'processing';
  const textoPaginaActual = paginas[paginaActual] ?? '';
  const parrafos = textoPaginaActual.split('\n\n').filter(p => p.trim().length > 0);

  const contentOpacity = reescribiendo
    ? 'opacity-0 transition-opacity duration-300'
    : fading
      ? 'opacity-100 transition-opacity duration-500'
      : 'opacity-100';

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      {/* Toast de notificacion */}
      {mostrarToast && (
        <div className="mb-4 animate-fade-in">
          <div className="bg-bosque/10 border border-bosque/20 rounded-2xl px-4 py-2.5 text-center">
            <p className="text-sm text-bosque font-medium">
              Historia adaptada a tu nivel
            </p>
          </div>
        </div>
      )}

      {/* Titulo (solo en pagina 1) */}
      {paginaActual === 0 && (
        <h1 className={`text-2xl font-extrabold text-texto text-center mb-6 leading-snug ${contentOpacity}`}>
          {titulo}
        </h1>
      )}

      {paginaActual === 0 && (
        <div className={`flex justify-center items-center gap-2 mb-4 ${contentOpacity}`}>
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
            <span aria-hidden="true">{topicEmoji} </span>
            <span>{topicNombre}</span>
          </span>
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
            Nivel {nivel}
          </span>
        </div>
      )}

      {/* Indicador de pagina + imprimir */}
      <div className="flex justify-center items-center gap-2 mb-3 no-print">
        {totalPaginas > 1 && (
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
            {paginaActual + 1} / {totalPaginas}
          </span>
        )}
        {!reescribiendo && (
          <button
            type="button"
            onClick={handlePrint}
            className="
              text-xs text-texto-suave bg-superficie px-2.5 py-1 rounded-full border border-neutro/10
              hover:border-turquesa/40 hover:text-turquesa
              active:scale-95 transition-all duration-150
              touch-manipulation min-h-0 min-w-0
            "
            aria-label="Imprimir historia completa"
            title="Imprimir"
          >
            <span role="presentation">🖨️</span>
          </button>
        )}
      </div>
      {onAnalizarAudio && (
        <div className="flex justify-center mb-3 no-print">
          {audioEstado === 'recording' && (
            <span className="text-xs text-bosque bg-bosque/10 px-3 py-1 rounded-full border border-bosque/20">
              Microfono activo
            </span>
          )}
          {(audioEstado === 'unsupported' || audioEstado === 'denied') && (
            <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
              Sin audio (fallback por pagina)
            </span>
          )}
          {audioEstado === 'processing' && (
            <span className="text-xs text-turquesa bg-turquesa/10 px-3 py-1 rounded-full border border-turquesa/20">
              Analizando audio...
            </span>
          )}
        </div>
      )}
      {audioError && (
        <p className="text-xs text-center text-texto-suave mb-3 no-print">{audioError}</p>
      )}

      {/* Contenido de la pagina */}
      <div className={`bg-superficie rounded-3xl p-6 shadow-sm border border-neutro/10 mb-6 ${contentOpacity}`}>
        {reescribiendo ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-3 border-turquesa/30 border-t-turquesa rounded-full animate-spin" />
            <p className="text-sm text-texto-suave font-medium">Reescribiendo tu historia...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {parrafos.map((parrafo, i) => (
              <p
                key={i}
                className="leading-relaxed text-texto"
                style={{ fontFamily: 'var(--font-principal)', fontSize: `${fontSize}px` }}
              >
                {parrafo}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Botones de ajuste manual (solo pagina 1) */}
      {botonesAjusteVisibles && !ajusteUsado && !reescribiendo && onAjusteManual && paginaActual === 0 && (
        <div className="flex justify-center gap-3 mb-6 animate-fade-in">
          <button
            type="button"
            onClick={() => handleAjuste('mas_facil')}
            className="
              flex items-center gap-2
              px-4 py-2.5 rounded-2xl
              bg-superficie border-2 border-neutro/15
              text-sm font-medium text-texto-suave
              hover:border-taller/40 hover:text-taller
              active:scale-95 transition-all duration-150
              touch-manipulation
            "
            aria-label="Hazlo mas facil"
          >
            <span className="text-base" role="presentation">🐢</span>
            <span>Hazlo mas facil</span>
          </button>

          <button
            type="button"
            onClick={() => handleAjuste('mas_desafiante')}
            className="
              flex items-center gap-2
              px-4 py-2.5 rounded-2xl
              bg-superficie border-2 border-neutro/15
              text-sm font-medium text-texto-suave
              hover:border-turquesa/40 hover:text-turquesa
              active:scale-95 transition-all duration-150
              touch-manipulation
            "
            aria-label="Hazlo mas desafiante"
          >
            <span className="text-base" role="presentation">⚡</span>
            <span>Hazlo mas desafiante</span>
          </button>
        </div>
      )}

      {/* Indicador de ajuste usado */}
      {ajusteUsado && !reescribiendo && paginaActual === 0 && (
        <div className="flex justify-center mb-6">
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1.5 rounded-full border border-neutro/10">
            Dificultad ajustada
          </span>
        </div>
      )}

      {/* Boton regenerar (solo si historia viene de cache, pagina 1) */}
      {fromCache && onRegenerar && paginaActual === 0 && !reescribiendo && (
        <div className="flex justify-center mb-4 no-print animate-fade-in">
          <button
            type="button"
            onClick={onRegenerar}
            className="
              flex items-center gap-1.5
              px-4 py-2 rounded-2xl
              text-xs font-medium text-texto-suave
              bg-superficie border border-neutro/10
              hover:border-turquesa/40 hover:text-turquesa
              active:scale-95 transition-all duration-150
              touch-manipulation
            "
          >
            <span role="presentation">🔄</span>
            <span>Quiero otra historia</span>
          </button>
        </div>
      )}

      {/* Barra de navegacion fija */}
      <div className="flex items-center justify-between pb-8 px-2 no-print">
        {/* Boton Anterior */}
        <button
          type="button"
          onClick={handlePaginaAnterior}
          disabled={esPrimeraPagina || reescribiendo || procesandoAudio}
          className={`
            flex items-center gap-1.5
            px-4 py-3 rounded-2xl
            text-sm font-semibold
            transition-all duration-150
            touch-manipulation
            ${esPrimeraPagina
              ? 'text-neutro/30 cursor-not-allowed'
              : 'text-turquesa bg-turquesa/10 hover:bg-turquesa/20 active:scale-95'
            }
          `}
          aria-label="Pagina anterior"
        >
          <span>←</span>
          <span>Anterior</span>
        </button>

        {/* Indicador central */}
        <span className="text-sm font-medium text-texto-suave tabular-nums">
          {paginaActual + 1} / {totalPaginas}
        </span>

        {/* Boton Siguiente / Terminar */}
        {esUltimaPagina ? (
          puedeTerminar ? (
            <button
              type="button"
              onClick={handleTerminar}
              disabled={reescribiendo || procesandoAudio}
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
            disabled={reescribiendo || procesandoAudio}
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

      {/* Historia completa para impresion (se monta solo al imprimir para evitar duplicados en DOM) */}
      {mostrarVersionImpresion && (
        <div className="print-story hidden print:block">
          <h1
            className="text-2xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-principal)' }}
          >
            {titulo}
          </h1>
          <div className="space-y-4">
            {contenido.split('\n\n').filter(p => p.trim().length > 0).map((parrafo, i) => (
              <p
                key={i}
                className="leading-relaxed"
                style={{ fontFamily: 'var(--font-principal)', fontSize: `${Math.max(fontSize, 14)}px` }}
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
