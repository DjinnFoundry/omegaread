'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { hablar } from '@/lib/audio/tts';
import { acierto as sonidoAcierto, error as sonidoError } from '@/lib/audio/sonidos';
import { BotonGrande } from '@/components/ui/BotonGrande';
import { LetraGrande } from './LetraGrande';
import type { Vocal } from '@/lib/actividades/generadorVocales';
import { PRONUNCIACION_VOCAL } from '@/lib/actividades/generadorVocales';

/**
 * Props de SonidoVocal.
 */
export interface SonidoVocalProps {
  /** Vocal correcta cuyo sonido se reproduce */
  vocalCorrecta: Vocal;
  /** Opciones de vocales (incluye la correcta, mezcladas) */
  opciones: Vocal[];
  /** Callback al acertar */
  onAcierto: () => void;
  /** Callback al errar */
  onError: () => void;
}

/**
 * Actividad 2: "¿Qué vocal suena?"
 *
 * La mascota reproduce el sonido de una vocal (TTS "aaaa" para A, etc.).
 * Muestra 3-4 opciones de vocales grandes.
 * El niño elige cuál es la vocal que escuchó.
 * Botón de "repetir sonido" con icono de altavoz.
 */
export function SonidoVocal({
  vocalCorrecta,
  opciones,
  onAcierto,
  onError,
}: SonidoVocalProps) {
  const [seleccion, setSeleccion] = useState<Vocal | null>(null);
  const [estado, setEstado] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const [bloqueado, setBloqueado] = useState(false);

  /** Reproduce el sonido de la vocal */
  const reproducirSonido = useCallback(() => {
    hablar(PRONUNCIACION_VOCAL[vocalCorrecta], { velocidad: 0.7 });
  }, [vocalCorrecta]);

  // Reproducir sonido al montar
  useEffect(() => {
    setSeleccion(null);
    setEstado('jugando');
    setBloqueado(false);
    const timer = setTimeout(() => {
      hablar('¿Qué vocal suena?', {
        onEnd: () => {
          setTimeout(reproducirSonido, 400);
        },
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [vocalCorrecta, reproducirSonido]);

  const manejarSeleccion = useCallback(
    (vocal: Vocal) => {
      if (bloqueado) return;

      setSeleccion(vocal);
      setBloqueado(true);

      if (vocal === vocalCorrecta) {
        setEstado('correcto');
        sonidoAcierto();
        hablar(`¡Sí! Es la ${vocalCorrecta}`);
        setTimeout(() => {
          onAcierto();
        }, 1200);
      } else {
        setEstado('incorrecto');
        sonidoError();
        hablar('¡Casi! Escucha otra vez');
        setTimeout(() => {
          setSeleccion(null);
          setEstado('jugando');
          setBloqueado(false);
          onError();
          // Reproducir de nuevo el sonido tras el error
          setTimeout(reproducirSonido, 500);
        }, 1500);
      }
    },
    [vocalCorrecta, bloqueado, onAcierto, onError, reproducirSonido],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Indicador visual: altavoz */}
      <div className="flex items-center gap-3">
        <span className="text-4xl" role="presentation">🔊</span>
        <span
          className="text-2xl font-bold"
          style={{ color: '#5D4037' }}
        >
          ¿Cuál es?
        </span>
      </div>

      {/* Botón repetir sonido */}
      <BotonGrande
        variante="secundario"
        icono="🔁"
        texto="Repetir"
        tamano="pequeno"
        onClick={reproducirSonido}
        deshabilitado={bloqueado}
        ariaLabel="Repetir el sonido de la vocal"
      />

      {/* Opciones de vocales */}
      <div className="flex flex-wrap justify-center gap-4">
        {opciones.map((vocal) => {
          const esSeleccionada = seleccion === vocal;
          const esCorrecta = esSeleccionada && estado === 'correcto';
          const esIncorrecta = esSeleccionada && estado === 'incorrecto';

          return (
            <LetraGrande
              key={vocal}
              letra={vocal}
              size="xl"
              seleccionada={esSeleccionada && estado === 'jugando'}
              correcta={esCorrecta}
              incorrecta={esIncorrecta}
              onClick={() => manejarSeleccion(vocal)}
              deshabilitado={bloqueado}
            />
          );
        })}
      </div>

      {/* Estrella voladora al acertar */}
      {estado === 'correcto' && (
        <div className="animate-vuela-estrella text-4xl" aria-hidden="true">
          ⭐
        </div>
      )}
    </div>
  );
}
