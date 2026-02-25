'use client';

/**
 * Pantalla de resultado de sesion.
 * Minimalista: celebracion + estrellas + CTA hacia la siguiente historia.
 * Los datos detallados (ELO, WPM, skills) van al dashboard del padre.
 */
import { useCallback, useState } from 'react';
import { Celebracion } from '@/components/ui/Celebracion';

interface ResultadoSesionProps {
  resultado: {
    aciertos: number;
    totalPreguntas: number;
    estrellas: number;
  };
  studentNombre: string;
  historiaTitulo?: string;
  historiaContenido?: string;
  onLeerOtra: () => void;
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
    'Te comparto una historia de OmegaRead:',
    '',
    `Titulo: ${titulo}`,
    '',
    contenido,
    '',
    `Mas historias personalizadas en ${origenBase}/`,
  ].join('\n');
}

export default function ResultadoSesion({
  resultado,
  studentNombre,
  historiaTitulo,
  historiaContenido,
  onLeerOtra,
}: ResultadoSesionProps) {
  const ratio = resultado.totalPreguntas > 0 ? resultado.aciertos / resultado.totalPreguntas : 0;
  const [mostrarCelebracion, setMostrarCelebracion] = useState(() => ratio >= 0.75);
  const [mensajeCompartir, setMensajeCompartir] = useState<string | null>(null);

  const [mensaje] = useState(() =>
    getMensaje(resultado.aciertos, resultado.totalPreguntas, studentNombre),
  );
  const emoji = getEmoji(resultado.aciertos, resultado.totalPreguntas);
  const puedeCompartir = !!historiaTitulo?.trim() && !!historiaContenido?.trim();

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
      <p className="text-xl font-bold text-texto mb-6">{mensaje}</p>

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
      <p className="text-sm text-texto-suave mb-8">
        {resultado.aciertos} de {resultado.totalPreguntas} correctas
      </p>

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
        Otra historia!
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
        Compartir por WhatsApp
      </button>
      <p className="mt-2 text-xs text-texto-suave">
        Se envia la historia completa en texto plano.
      </p>
      {mensajeCompartir && (
        <p className="mt-2 text-xs text-coral">{mensajeCompartir}</p>
      )}

    </div>
  );
}
