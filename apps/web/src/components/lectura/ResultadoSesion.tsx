'use client';

/**
 * Pantalla de resultado de sesion.
 * Muestra: celebracion + estrellas + ELO delta animado + CTAs.
 * Los datos detallados (sub-ELOs, WPM, skills) van al dashboard del padre.
 */
import { useCallback, useState, useEffect } from 'react';
import { Celebracion } from '@/components/ui/Celebracion';

interface ResultadoSesionProps {
  resultado: {
    aciertos: number;
    totalPreguntas: number;
    estrellas: number;
    eloGlobal?: number | null;
    eloPrevio?: number | null;
  };
  studentNombre: string;
  historiaTitulo?: string;
  historiaContenido?: string;
  onLeerOtra: () => void;
  onVolverDashboard?: () => void;
}

const MENSAJES: Record<string, string[]> = {
  excelente: [
    'Increible, {nombre}! Eres una estrella!',
    'Genial, {nombre}! Entendiste todo!',
    'Fantastico, {nombre}!',
  ],
  bien: [
    'Muy bien, {nombre}! Vas genial!',
    'Buen trabajo, {nombre}!',
    'Bien hecho, {nombre}! Sigue asi!',
  ],
  regular: [
    'Bien intentado, {nombre}!',
    'Sigue leyendo, {nombre}! Cada historia cuenta.',
    'Buen esfuerzo, {nombre}!',
  ],
};

function getMensaje(aciertos: number, total: number, nombre: string): string {
  const ratio = total > 0 ? aciertos / total : 0;
  const cat = ratio >= 0.75 ? 'excelente' : ratio >= 0.5 ? 'bien' : 'regular';
  const msgs = MENSAJES[cat]!;
  return msgs[Math.floor(Math.random() * msgs.length)].replace('{nombre}', nombre);
}

function getEmoji(aciertos: number, total: number): string {
  const ratio = total > 0 ? aciertos / total : 0;
  if (ratio >= 1) return '🏆';
  if (ratio >= 0.75) return '🌟';
  if (ratio >= 0.5) return '👏';
  return '💪';
}

function construirMensajeWhatsapp(params: {
  historiaTitulo: string;
  historiaContenido: string;
  origen: string;
}): string {
  const titulo = params.historiaTitulo.trim();
  const contenido = params.historiaContenido.trim();
  const origenBase = params.origen.endsWith('/') ? params.origen.slice(0, -1) : params.origen;

  return [
    'Te comparto una historia de ZetaRead:',
    '',
    `Titulo: ${titulo}`,
    '',
    contenido,
    '',
    `Mas historias personalizadas en ${origenBase}/`,
  ].join('\n');
}

/** Animated counter that counts from `from` to `to` over `durationMs`. */
function useAnimatedNumber(from: number, to: number, durationMs: number, delay: number): number {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const diff = to - from;

      function tick() {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / durationMs, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(from + diff * eased));
        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }, delay);

    return () => clearTimeout(timeout);
  }, [from, to, durationMs, delay]);

  return current;
}

export default function ResultadoSesion({
  resultado,
  studentNombre,
  historiaTitulo,
  historiaContenido,
  onLeerOtra,
  onVolverDashboard,
}: ResultadoSesionProps) {
  const ratio = resultado.totalPreguntas > 0 ? resultado.aciertos / resultado.totalPreguntas : 0;
  const [mostrarCelebracion, setMostrarCelebracion] = useState(() => ratio >= 0.75);
  const [mensajeCompartir, setMensajeCompartir] = useState<string | null>(null);

  const [mensaje] = useState(() =>
    getMensaje(resultado.aciertos, resultado.totalPreguntas, studentNombre),
  );
  const emoji = getEmoji(resultado.aciertos, resultado.totalPreguntas);
  const puedeCompartir = !!historiaTitulo?.trim() && !!historiaContenido?.trim();

  // ELO animation
  const hasElo = resultado.eloGlobal != null && resultado.eloPrevio != null;
  const eloPrevio = resultado.eloPrevio ?? 1000;
  const eloNuevo = resultado.eloGlobal ?? 1000;
  const eloDelta = Math.round(eloNuevo - eloPrevio);
  const animatedElo = useAnimatedNumber(eloPrevio, eloNuevo, 1200, 800);

  const handleCompartirWhatsApp = useCallback(async () => {
    setMensajeCompartir(null);
    const titulo = historiaTitulo?.trim();
    const contenido = historiaContenido?.trim();

    if (!titulo || !contenido || typeof window === 'undefined') {
      setMensajeCompartir('No encontramos la historia para compartir.');
      return;
    }

    const texto = construirMensajeWhatsapp({
      historiaTitulo: titulo,
      historiaContenido: contenido,
      origen: window.location.origin,
    });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;

    try {
      const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = waUrl;
      }
    } catch {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(texto);
          setMensajeCompartir('Copiamos la historia. Pegala en WhatsApp.');
          return;
        } catch {
          // sin-op
        }
      }
      setMensajeCompartir('No pudimos abrir WhatsApp en este dispositivo.');
    }
  }, [historiaTitulo, historiaContenido]);

  return (
    <div className="animate-scale-in w-full max-w-sm mx-auto text-center">
      <Celebracion
        visible={mostrarCelebracion}
        onClose={() => setMostrarCelebracion(false)}
      />

      {/* Emoji + mensaje */}
      <div className="text-7xl mb-4">{emoji}</div>
      <p className="text-xl font-bold text-texto mb-6 font-datos">{mensaje}</p>

      {/* Estrellas */}
      <div className="flex justify-center gap-2 mb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <span
            key={i}
            className={`text-4xl transition-all ${i < resultado.estrellas ? '' : 'opacity-20 grayscale'}`}
          >
            ⭐
          </span>
        ))}
      </div>
      <p className="text-sm text-texto-suave mb-4 font-datos">
        {resultado.aciertos} de {resultado.totalPreguntas} correctas
      </p>

      {/* ELO delta animation */}
      {hasElo && (
        <div className="mb-6 py-3 px-4 rounded-xl bg-white/60 border border-texto/10">
          <p className="text-xs text-texto-suave mb-1 font-datos">Nivel de lectura</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold text-texto tabular-nums font-datos">
              {animatedElo}
            </span>
            {eloDelta !== 0 && (
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  eloDelta > 0
                    ? 'text-green-700 bg-green-100'
                    : 'text-coral bg-coral/10'
                }`}
              >
                {eloDelta > 0 ? '+' : ''}{eloDelta}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CTA principal */}
      <button
        type="button"
        onClick={onLeerOtra}
        className="
          w-full flex items-center justify-center gap-2.5
          px-6 py-4 rounded-2xl
          bg-gradient-to-r from-turquesa to-turquesa/85
          text-white font-bold text-lg
          shadow-md hover:shadow-lg
          transition-all duration-150
          active:scale-[0.98] touch-manipulation
        "
      >
        <span className="text-xl">📖</span>
        <span className="font-datos">Otra historia!</span>
      </button>

      <button
        type="button"
        onClick={() => void handleCompartirWhatsApp()}
        disabled={!puedeCompartir}
        className="
          mt-3 w-full flex items-center justify-center gap-2.5
          px-6 py-3 rounded-2xl
          border border-turquesa/40 bg-white
          text-texto font-semibold text-base
          shadow-sm hover:bg-turquesa/5
          transition-all duration-150
          active:scale-[0.98] touch-manipulation
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <span className="text-lg">💬</span>
        <span className="font-datos">Compartir por WhatsApp</span>
      </button>

      {mensajeCompartir && (
        <p className="mt-2 text-xs text-coral">{mensajeCompartir}</p>
      )}

      {/* Volver al dashboard */}
      {onVolverDashboard && (
        <button
          type="button"
          onClick={onVolverDashboard}
          className="
            mt-4 w-full flex items-center justify-center gap-2
            px-6 py-3 rounded-2xl
            text-texto-suave font-medium text-sm
            hover:text-texto hover:bg-texto/5
            transition-all duration-150
            active:scale-[0.98] touch-manipulation
          "
        >
          Volver al inicio
        </button>
      )}
    </div>
  );
}
