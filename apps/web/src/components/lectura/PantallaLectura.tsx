'use client';

/**
 * Pantalla de lectura con paginacion.
 * Divide el texto en paginas segun nivel. Registra timestamps por pagina.
 * Calcula WPM por pagina al terminar.
 * Sprint 4: Botones "Hazlo mas facil" / "Hazlo mas desafiante".
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { BotonGrande } from '@/components/ui/BotonGrande';

export interface WpmData {
  wpmPromedio: number;
  wpmPorPagina: Array<{ pagina: number; wpm: number }>;
  totalPaginas: number;
}

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  topicEmoji: string;
  topicNombre: string;
  nivel: number;
  onTerminar: (tiempoLecturaMs: number, wpmData: WpmData) => void;
  onAjusteManual?: (direccion: 'mas_facil' | 'mas_desafiante', tiempoLecturaMs: number) => void;
  reescribiendo?: boolean;
  ajusteUsado?: boolean;
  rewriteCount?: number;
}

const DELAY_BOTONES_MS = 10_000;
const TOAST_DURACION_MS = 3_000;

/** Palabras por pagina segun rango de nivel */
function getPalabrasPorPagina(nivel: number): number {
  if (nivel < 2) return 30;
  if (nivel < 3) return 50;
  if (nivel < 4) return 70;
  return 90;
}

/** Divide el texto en paginas de N palabras, respetando limites de parrafo cuando es posible */
function dividirEnPaginas(contenido: string, palabrasPorPagina: number): string[] {
  const palabras = contenido.split(/\s+/).filter(w => w.length > 0);
  if (palabras.length <= palabrasPorPagina) return [contenido];

  const paginas: string[] = [];
  for (let i = 0; i < palabras.length; i += palabrasPorPagina) {
    paginas.push(palabras.slice(i, i + palabrasPorPagina).join(' '));
  }
  return paginas;
}

/** Cuenta palabras de un texto */
function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calcula el tiempo minimo antes de mostrar el boton de avance.
 * Basado en ~30 palabras/minuto como velocidad minima realista.
 * Minimo: 5s, Maximo: 30s (por pagina).
 */
function calcularTiempoMinimoPagina(textoPagina: string): number {
  const palabras = contarPalabras(textoPagina);
  const segundos = (palabras / 30) * 60;
  return Math.max(5, Math.min(30, Math.round(segundos * 0.3))) * 1000;
}

export default function PantallaLectura({
  titulo,
  contenido,
  topicEmoji,
  topicNombre,
  nivel,
  onTerminar,
  onAjusteManual,
  reescribiendo = false,
  ajusteUsado = false,
  rewriteCount = 0,
}: PantallaLecturaProps) {
  const palabrasPorPagina = getPalabrasPorPagina(nivel);
  const paginas = dividirEnPaginas(contenido, palabrasPorPagina);
  const totalPaginas = paginas.length;

  const [paginaActual, setPaginaActual] = useState(0);
  const [botonVisible, setBotonVisible] = useState(false);
  const [botonesAjusteVisibles, setBotonesAjusteVisibles] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [fading, setFading] = useState(false);
  const prevRewriteCountRef = useRef(rewriteCount);

  // Timestamps: uno por cada transicion de pagina + inicio
  const timestampsRef = useRef<number[]>([Date.now()]);
  const inicioTotalRef = useRef(Date.now());

  // Reset cuando cambia el contenido (reescritura)
  useEffect(() => {
    setPaginaActual(0);
    setBotonVisible(false);
    timestampsRef.current = [Date.now()];
    inicioTotalRef.current = Date.now();
  }, [contenido]);

  // Mostrar boton despues de un tiempo minimo por pagina
  useEffect(() => {
    setBotonVisible(false);
    const delay = calcularTiempoMinimoPagina(paginas[paginaActual] ?? '');
    const timer = setTimeout(() => setBotonVisible(true), delay);
    return () => clearTimeout(timer);
  }, [paginaActual, paginas]);

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
    timestampsRef.current.push(Date.now());
    setPaginaActual(p => p + 1);
  }, []);

  const handleTerminar = useCallback(() => {
    const ahora = Date.now();
    timestampsRef.current.push(ahora);
    const tiempoTotalMs = ahora - inicioTotalRef.current;

    // Calcular WPM por pagina
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
    const wpmPromedio = paginasParaPromedio.length > 0
      ? Math.round(paginasParaPromedio.reduce((sum, p) => sum + p.wpm, 0) / paginasParaPromedio.length)
      : wpmPorPagina[0]?.wpm ?? 0; // Si solo hay 1 pagina, usar esa

    onTerminar(tiempoTotalMs, { wpmPromedio, wpmPorPagina, totalPaginas });
  }, [onTerminar, totalPaginas, paginas]);

  const handleAjuste = useCallback((direccion: 'mas_facil' | 'mas_desafiante') => {
    if (!onAjusteManual || ajusteUsado || reescribiendo) return;
    const tiempoMs = Date.now() - inicioTotalRef.current;
    onAjusteManual(direccion, tiempoMs);
  }, [onAjusteManual, ajusteUsado, reescribiendo]);

  const esUltimaPagina = paginaActual >= totalPaginas - 1;
  const textoPaginaActual = paginas[paginaActual] ?? '';
  const parrafos = textoPaginaActual.split('\n\n').filter(p => p.trim().length > 0);

  const contentOpacity = reescribiendo
    ? 'opacity-0 transition-opacity duration-300'
    : fading
      ? 'opacity-100 transition-opacity duration-500'
      : 'opacity-100';

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{topicEmoji}</span>
          <span className="text-xs text-texto-suave">{topicNombre}</span>
        </div>
        <div className="bg-turquesa/10 rounded-full px-3 py-1">
          <span className="text-xs text-turquesa font-medium">Nivel {nivel}</span>
        </div>
      </div>

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

      {/* Indicador de pagina */}
      {totalPaginas > 1 && (
        <div className="flex justify-center mb-3">
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1 rounded-full border border-neutro/10">
            Pagina {paginaActual + 1} de {totalPaginas}
          </span>
        </div>
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
                className="text-lg leading-relaxed text-texto"
                style={{ fontFamily: 'var(--font-principal)' }}
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

      {/* Boton de accion */}
      <div className="text-center pb-8">
        {botonVisible ? (
          <div className="animate-fade-in">
            {esUltimaPagina ? (
              <BotonGrande
                variante="primario"
                icono="✅"
                texto="He terminado de leer"
                tamano="grande"
                deshabilitado={reescribiendo}
                onClick={handleTerminar}
                ariaLabel="He terminado de leer"
              />
            ) : (
              <BotonGrande
                variante="primario"
                icono="➡️"
                texto="Siguiente pagina"
                tamano="grande"
                deshabilitado={reescribiendo}
                onClick={handleSiguientePagina}
                ariaLabel="Ir a la siguiente pagina"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-texto-suave animate-pulse-brillo">
            Tomate tu tiempo para leer...
          </p>
        )}
      </div>
    </div>
  );
}
