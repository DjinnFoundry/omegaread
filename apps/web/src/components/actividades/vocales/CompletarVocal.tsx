'use client';

import { useState, useEffect, useCallback } from 'react';
import { hablar } from '@/lib/audio/tts';
import { acierto as sonidoAcierto, error as sonidoError } from '@/lib/audio/sonidos';
import { LetraGrande } from './LetraGrande';
import type { Vocal, PalabraVocal } from '@/lib/actividades/generadorVocales';

/**
 * Props de CompletarVocal.
 */
export interface CompletarVocalProps {
  /** Datos de la palabra con vocal faltante */
  palabra: PalabraVocal;
  /** Opciones de vocales para elegir (incluye la correcta) */
  opciones: Vocal[];
  /** Callback al acertar */
  onAcierto: () => void;
  /** Callback al errar */
  onError: () => void;
}

/**
 * Actividad 3: "Completa la palabra"
 *
 * Muestra un emoji + la palabra con vocal faltante (ej: "_SO" con 🐻).
 * La mascota pronuncia la palabra enfatizando la vocal (TTS "ooooso").
 * El niño elige la vocal correcta entre 3 opciones.
 * Al acertar: la palabra completa aparece + celebración.
 */
export function CompletarVocal({
  palabra,
  opciones,
  onAcierto,
  onError,
}: CompletarVocalProps) {
  const [seleccion, setSeleccion] = useState<Vocal | null>(null);
  const [estado, setEstado] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const [bloqueado, setBloqueado] = useState(false);
  const [mostrarCompleta, setMostrarCompleta] = useState(false);

  // TTS al montar: pronuncia la palabra enfatizando la vocal
  useEffect(() => {
    setSeleccion(null);
    setEstado('jugando');
    setBloqueado(false);
    setMostrarCompleta(false);

    const timer = setTimeout(() => {
      hablar('¡Completa la palabra!', {
        onEnd: () => {
          setTimeout(() => {
            hablar(palabra.pronunciacion, { velocidad: 0.7 });
          }, 300);
        },
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [palabra]);

  const manejarSeleccion = useCallback(
    (vocal: Vocal) => {
      if (bloqueado) return;

      setSeleccion(vocal);
      setBloqueado(true);

      if (vocal === palabra.vocalFaltante) {
        setEstado('correcto');
        setMostrarCompleta(true);
        sonidoAcierto();
        hablar(`¡Sí! ${palabra.palabraCompleta}!`);
        setTimeout(() => {
          onAcierto();
        }, 1500);
      } else {
        setEstado('incorrecto');
        sonidoError();
        hablar('¡Casi! Escucha otra vez');
        setTimeout(() => {
          setSeleccion(null);
          setEstado('jugando');
          setBloqueado(false);
          onError();
          // Repetir pronunciación
          setTimeout(() => {
            hablar(palabra.pronunciacion, { velocidad: 0.7 });
          }, 300);
        }, 1500);
      }
    },
    [palabra, bloqueado, onAcierto, onError],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Emoji de la palabra */}
      <div
        className="text-7xl palabra-imagen"
        role="presentation"
        aria-hidden="true"
      >
        {palabra.imagen}
      </div>

      {/* Palabra con hueco o completa */}
      <div
        className="text-4xl font-bold tracking-widest"
        style={{ color: '#5D4037' }}
      >
        {mostrarCompleta ? (
          <span className="palabra-completa" style={{ color: '#4CAF50' }}>
            {palabra.palabraCompleta}
          </span>
        ) : (
          <span>
            {palabra.palabraConHueco.split('').map((char, i) =>
              char === '_' ? (
                <span
                  key={i}
                  className="inline-block w-10 mx-1 border-b-4 text-center"
                  style={{
                    borderColor: '#FF6B6B',
                    color: seleccion ? '#FF6B6B' : 'transparent',
                  }}
                >
                  {seleccion ?? '_'}
                </span>
              ) : (
                <span key={i}>{char}</span>
              ),
            )}
          </span>
        )}
      </div>

      {/* Botón de escuchar de nuevo */}
      <button
        type="button"
        onClick={() => hablar(palabra.pronunciacion, { velocidad: 0.7 })}
        disabled={bloqueado}
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-90 disabled:opacity-50"
        style={{ backgroundColor: '#E8E0D8', color: '#5D4037' }}
        aria-label="Escuchar la palabra otra vez"
      >
        <span className="text-xl">🔊</span>
        <span className="text-sm font-medium">Escuchar</span>
      </button>

      {/* Opciones de vocales */}
      <div className="flex justify-center gap-4">
        {opciones.map((vocal) => {
          const esSeleccionada = seleccion === vocal;
          const esCorrecta = esSeleccionada && estado === 'correcto';
          const esIncorrecta = esSeleccionada && estado === 'incorrecto';

          return (
            <LetraGrande
              key={vocal}
              letra={vocal}
              size="lg"
              seleccionada={esSeleccionada && estado === 'jugando'}
              correcta={esCorrecta}
              incorrecta={esIncorrecta}
              onClick={() => manejarSeleccion(vocal)}
              deshabilitado={bloqueado}
            />
          );
        })}
      </div>

      {/* Celebración al completar */}
      {estado === 'correcto' && (
        <div className="estrella-vuela-completar text-4xl" aria-hidden="true">
          🎉
        </div>
      )}

      <style>{`
        @keyframes pulsa-imagen {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .palabra-imagen {
          animation: pulsa-imagen 2s ease-in-out infinite;
        }
        @keyframes aparece-palabra {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .palabra-completa {
          animation: aparece-palabra 0.5s ease-out;
          display: inline-block;
        }
        @keyframes vuela-completar {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          50% { opacity: 1; transform: scale(1.5) translateY(-30px); }
          100% { opacity: 0; transform: scale(0.5) translateY(-80px); }
        }
        .estrella-vuela-completar {
          animation: vuela-completar 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
