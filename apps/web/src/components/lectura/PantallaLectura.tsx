'use client';

/**
 * Pantalla de lectura.
 * Muestra la historia con tipografia grande y amigable.
 * Cronometro invisible. Boton "He terminado de leer" prominente.
 * Sprint 4: Botones "Hazlo mas facil" / "Hazlo mas desafiante".
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { BotonGrande } from '@/components/ui/BotonGrande';

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  topicEmoji: string;
  topicNombre: string;
  nivel: number;
  onTerminar: (tiempoLecturaMs: number) => void;
  onAjusteManual?: (direccion: 'mas_facil' | 'mas_desafiante', tiempoLecturaMs: number) => void;
  reescribiendo?: boolean;
  ajusteUsado?: boolean;
  /** Incrementar cada vez que se completa una reescritura para disparar toast/fade */
  rewriteCount?: number;
}

const DELAY_BOTONES_MS = 10_000;
const TOAST_DURACION_MS = 3_000;

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
  const inicioRef = useRef(0);
  const [botonesVisibles, setBotonesVisibles] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [fading, setFading] = useState(false);
  const prevRewriteCountRef = useRef(rewriteCount);

  // Iniciar cronometro
  useEffect(() => {
    inicioRef.current = Date.now();
  }, []);

  // Mostrar botones de ajuste despues de 10 segundos
  useEffect(() => {
    if (ajusteUsado) return;
    const timer = setTimeout(() => setBotonesVisibles(true), DELAY_BOTONES_MS);
    return () => clearTimeout(timer);
  }, [ajusteUsado]);

  // When rewriteCount changes, trigger toast + reset timer
  useEffect(() => {
    if (rewriteCount === 0 || rewriteCount === prevRewriteCountRef.current) return;
    prevRewriteCountRef.current = rewriteCount;

    // Reset reading timer
    inicioRef.current = Date.now();

    // Toast notification (via requestAnimationFrame to avoid sync setState in effect)
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

  const handleTerminar = useCallback(() => {
    const tiempoMs = Date.now() - inicioRef.current;
    onTerminar(tiempoMs);
  }, [onTerminar]);

  const handleAjuste = useCallback((direccion: 'mas_facil' | 'mas_desafiante') => {
    if (!onAjusteManual || ajusteUsado || reescribiendo) return;
    const tiempoMs = Date.now() - inicioRef.current;
    onAjusteManual(direccion, tiempoMs);
  }, [onAjusteManual, ajusteUsado, reescribiendo]);

  const parrafos = contenido.split('\n\n').filter(p => p.trim().length > 0);

  const contentOpacity = reescribiendo
    ? 'opacity-0 transition-opacity duration-300'
    : fading
      ? 'opacity-100 transition-opacity duration-500'
      : 'opacity-100';

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      {/* Header minimo */}
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

      {/* Titulo */}
      <h1 className={`text-2xl font-extrabold text-texto text-center mb-6 leading-snug ${contentOpacity}`}>
        {titulo}
      </h1>

      {/* Historia */}
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

      {/* Botones de ajuste manual (Sprint 4) */}
      {botonesVisibles && !ajusteUsado && !reescribiendo && onAjusteManual && (
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
      {ajusteUsado && !reescribiendo && (
        <div className="flex justify-center mb-6">
          <span className="text-xs text-texto-suave bg-superficie px-3 py-1.5 rounded-full border border-neutro/10">
            Dificultad ajustada
          </span>
        </div>
      )}

      {/* Boton terminar */}
      <div className="text-center pb-8">
        <BotonGrande
          variante="primario"
          icono="✅"
          texto="He terminado de leer"
          tamano="grande"
          deshabilitado={reescribiendo}
          onClick={handleTerminar}
          ariaLabel="He terminado de leer"
        />
      </div>
    </div>
  );
}
