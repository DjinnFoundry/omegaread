'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { hablar } from '@/lib/audio/tts';
import { acierto as sonidoAcierto, error as sonidoError } from '@/lib/audio/sonidos';
import { LetraGrande } from './LetraGrande';
import { mezclar } from '@/lib/utils/random';
import type { Vocal } from '@/lib/actividades/generadorVocales';

interface ReconocerVocalProps {
  vocal: Vocal;
  distractores: string[];
  onAcierto: () => void;
  onError: () => void;
}

/**
 * Actividad 1: "¿Dónde está la A?"
 *
 * La mascota dice "¡Busca la [vocal]!" por TTS.
 * Muestra 4 letras en grid 2x2 (1 correcta + 3 distractoras).
 * Feedback inmediato: sonido + visual.
 */
export function ReconocerVocal({
  vocal,
  distractores,
  onAcierto,
  onError,
}: ReconocerVocalProps) {
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [estado, setEstado] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const [bloqueado, setBloqueado] = useState(false);
  const inicioRef = useRef(Date.now());

  // Generar opciones mezcladas (estable durante la vida del ejercicio)
  const opciones = useMemo(
    () => mezclar([vocal, ...distractores.slice(0, 3)]),
    [vocal, distractores],
  );

  // TTS al montar: "¡Busca la A!"
  useEffect(() => {
    inicioRef.current = Date.now();
    setSeleccion(null);
    setEstado('jugando');
    setBloqueado(false);
    const timer = setTimeout(() => {
      hablar(`¡Busca la ${vocal}!`);
    }, 300);
    return () => clearTimeout(timer);
  }, [vocal]);

  const manejarSeleccion = useCallback(
    (letra: string) => {
      if (bloqueado) return;

      setSeleccion(letra);
      setBloqueado(true);

      if (letra === vocal) {
        // ¡Correcto!
        setEstado('correcto');
        sonidoAcierto();
        hablar('¡Muy bien!');
        setTimeout(() => {
          onAcierto();
        }, 1200);
      } else {
        // Incorrecto — no punitivo
        setEstado('incorrecto');
        sonidoError();
        hablar('¡Casi! Inténtalo otra vez');
        setTimeout(() => {
          setSeleccion(null);
          setEstado('jugando');
          setBloqueado(false);
          onError();
        }, 1500);
      }
    },
    [vocal, bloqueado, onAcierto, onError],
  );

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Indicador visual de la vocal buscada */}
      <div className="flex items-center gap-3">
        <span className="text-3xl" role="presentation">🔍</span>
        <span
          className="text-4xl font-bold"
          style={{ color: '#5D4037' }}
        >
          {vocal}
        </span>
      </div>

      {/* Grid 2×2 de letras */}
      <div className="grid grid-cols-2 gap-4 w-fit">
        {opciones.map((letra, i) => {
          const esSeleccionada = seleccion === letra;
          const esCorrecta = esSeleccionada && estado === 'correcto';
          const esIncorrecta = esSeleccionada && estado === 'incorrecto';

          return (
            <LetraGrande
              key={`${letra}-${i}`}
              letra={letra}
              size="xl"
              seleccionada={esSeleccionada && estado === 'jugando'}
              correcta={esCorrecta}
              incorrecta={esIncorrecta}
              onClick={() => manejarSeleccion(letra)}
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
