'use client';

/**
 * Pantalla de preguntas de comprension.
 * Una pregunta a la vez con feedback inmediato.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { click as sonidoClick, celebracion as sonidoCelebracion } from '@/lib/audio/sonidos';
import { useTTS } from '@/hooks/useTTS';

interface Pregunta {
  id: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string | null;
}

export interface RespuestaPregunta {
  preguntaId: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  respuestaSeleccionada: number;
  correcta: boolean;
  tiempoMs: number;
}

interface PantallaPreguntasProps {
  preguntas: Pregunta[];
  onComplete: (respuestas: RespuestaPregunta[]) => void;
  historiaContenido?: string;
  historiaTitulo?: string;
}

const TIPO_LABELS: Record<string, string> = {
  literal: 'Comprension',
  inferencia: 'Razonamiento',
  vocabulario: 'Vocabulario',
  resumen: 'Idea principal',
};

const TIPO_EMOJI: Record<string, string> = {
  literal: '📝',
  inferencia: '🤔',
  vocabulario: '📖',
  resumen: '💡',
};

export default function PantallaPreguntas({
  preguntas,
  onComplete,
  historiaContenido,
  historiaTitulo,
}: PantallaPreguntasProps) {
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);
  const [mostrandoFeedback, setMostrandoFeedback] = useState(false);
  const [respuestasAcumuladas, setRespuestasAcumuladas] = useState<RespuestaPregunta[]>([]);
  const [mostrarHistoria, setMostrarHistoria] = useState(false);
  const inicioRef = useRef(0);
  const { speak, stop, speakingId, supported: ttsSupported } = useTTS();

  const pregunta = preguntas[preguntaActual];
  const esCorrecta = respuestaSeleccionada === pregunta?.respuestaCorrecta;

  // Set/reset timer on mount and on new question, stop any TTS
  useEffect(() => {
    inicioRef.current = Date.now();
    stop();
  }, [preguntaActual, stop]);

  const handleSeleccion = useCallback((indice: number) => {
    if (mostrandoFeedback || !pregunta) return;
    sonidoClick();

    const tiempoMs = Date.now() - inicioRef.current;
    const correcta = indice === pregunta.respuestaCorrecta;

    if (correcta) {
      sonidoCelebracion();
    }

    setRespuestaSeleccionada(indice);
    setMostrandoFeedback(true);

    const respuesta: RespuestaPregunta = {
      preguntaId: pregunta.id,
      tipo: pregunta.tipo,
      respuestaSeleccionada: indice,
      correcta,
      tiempoMs,
    };

    // Compute the new array inline so it is available synchronously for
    // onComplete without depending on the state variable (which would be
    // stale until the next render).
    const nuevas = [...respuestasAcumuladas, respuesta];
    setRespuestasAcumuladas(nuevas);

    if (preguntaActual >= preguntas.length - 1) {
      // Last question: call onComplete with the freshly computed array,
      // not the stale respuestasAcumuladas state value.
      onComplete(nuevas);
    }
  }, [mostrandoFeedback, pregunta, respuestasAcumuladas, preguntaActual, preguntas.length, onComplete]);

  const handleSiguiente = useCallback(() => {
    setPreguntaActual(prev => prev + 1);
    setRespuestaSeleccionada(null);
    setMostrandoFeedback(false);
  }, []);

  if (!pregunta) return null;

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      {/* Progreso */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-texto-suave font-datos">
          Pregunta {preguntaActual + 1} de {preguntas.length}
        </span>
        <div className="flex gap-1.5">
          {preguntas.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < preguntaActual
                  ? 'bg-bosque'
                  : i === preguntaActual
                    ? 'bg-turquesa'
                    : 'bg-neutro/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Boton volver a leer la historia */}
      {historiaContenido && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setMostrarHistoria(prev => !prev)}
            className="
              flex items-center gap-2
              text-sm font-medium text-turquesa
              hover:text-turquesa/80 transition-colors
              touch-manipulation
            "
          >
            <span>{mostrarHistoria ? '📕' : '📖'}</span>
            {mostrarHistoria ? 'Ocultar historia' : 'Volver a leer la historia'}
          </button>
          {mostrarHistoria && (
            <div className="mt-3 rounded-2xl bg-superficie/80 border border-neutro/10 p-4 max-h-60 overflow-y-auto animate-fade-in">
              {historiaTitulo && (
                <p className="font-bold text-texto text-sm mb-2">{historiaTitulo}</p>
              )}
              {historiaContenido.split('\n\n').filter(p => p.trim()).map((parrafo, i) => (
                <p key={i} className="text-sm text-texto-suave leading-relaxed mb-2 last:mb-0">
                  {parrafo}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tipo de pregunta */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{TIPO_EMOJI[pregunta.tipo]}</span>
        <span className="text-xs font-medium text-texto-suave bg-superficie px-3 py-1 rounded-full font-datos">
          {TIPO_LABELS[pregunta.tipo]}
        </span>
      </div>

      {/* Pregunta */}
      <div className="bg-superficie rounded-3xl p-5 shadow-sm border border-neutro/10 mb-5">
        <div className="flex items-start gap-3">
          {ttsSupported && (
            <button
              type="button"
              onClick={() => speak(pregunta.pregunta, `q-${pregunta.id}`)}
              className={`
                shrink-0 w-9 h-9 mt-0.5 rounded-full flex items-center justify-center
                transition-all duration-200 touch-manipulation
                ${speakingId === `q-${pregunta.id}`
                  ? 'bg-turquesa text-white scale-110 animate-pulse'
                  : 'bg-turquesa/10 text-turquesa hover:bg-turquesa/20'}
              `}
              aria-label="Escuchar pregunta"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.383 3.07A1 1 0 0112 4v16a1 1 0 01-1.617.784L5.132 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.132l5.251-4.784A1 1 0 0111.383 3.07zM14.025 5.88a.75.75 0 011.06-.04 8.5 8.5 0 010 12.32.75.75 0 11-1.02-1.1 7 7 0 000-10.12.75.75 0 01-.04-1.06zm.92 3.58a.75.75 0 011.06-.02 4.5 4.5 0 010 5.12.75.75 0 01-1.18-.93 3 3 0 000-3.18.75.75 0 01.12-1z" />
              </svg>
            </button>
          )}
          <p className="text-lg font-semibold text-texto leading-relaxed font-datos">
            {pregunta.pregunta}
          </p>
        </div>
      </div>

      {/* Opciones */}
      <div className="space-y-3 mb-6">
        {pregunta.opciones.map((opcion, idx) => {
          let estiloOpcion = 'bg-superficie border-2 border-neutro/15 hover:border-turquesa/40';
          let iconoOpcion: string | null = null;

          if (mostrandoFeedback) {
            if (idx === pregunta.respuestaCorrecta) {
              estiloOpcion = 'bg-bosque/10 border-2 border-bosque';
              iconoOpcion = '✅';
            } else if (idx === respuestaSeleccionada && !esCorrecta) {
              estiloOpcion = 'bg-error-suave border-2 border-coral';
              iconoOpcion = '❌';
            } else {
              estiloOpcion = 'bg-superficie/50 border-2 border-neutro/10 opacity-50';
            }
          }

          const opcionTtsId = `o-${pregunta.id}-${idx}`;

          return (
            <div key={idx} className="flex items-start gap-2">
              {ttsSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(opcion, opcionTtsId);
                  }}
                  className={`
                    shrink-0 w-8 h-8 mt-3 rounded-full flex items-center justify-center
                    transition-all duration-200 touch-manipulation
                    ${speakingId === opcionTtsId
                      ? 'bg-turquesa text-white scale-110 animate-pulse'
                      : 'bg-turquesa/10 text-turquesa hover:bg-turquesa/20'}
                  `}
                  aria-label={`Escuchar opcion ${String.fromCharCode(65 + idx)}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M11.383 3.07A1 1 0 0112 4v16a1 1 0 01-1.617.784L5.132 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.132l5.251-4.784A1 1 0 0111.383 3.07zM14.025 5.88a.75.75 0 011.06-.04 8.5 8.5 0 010 12.32.75.75 0 11-1.02-1.1 7 7 0 000-10.12.75.75 0 01-.04-1.06zm.92 3.58a.75.75 0 011.06-.02 4.5 4.5 0 010 5.12.75.75 0 01-1.18-.93 3 3 0 000-3.18.75.75 0 01.12-1z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSeleccion(idx)}
                disabled={mostrandoFeedback}
                className={`
                  flex-1 text-left p-4 rounded-2xl
                  transition-all duration-200
                  active:scale-[0.98] touch-manipulation
                  disabled:cursor-default
                  ${estiloOpcion}
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-turquesa/10 flex items-center justify-center text-sm font-bold text-turquesa">
                    {iconoOpcion ?? String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base text-texto leading-snug">{opcion}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {mostrandoFeedback && (
        <div
          className={`animate-scale-in rounded-2xl p-4 mb-6 ${
            esCorrecta ? 'bg-bosque/10 border border-bosque/20' : 'bg-error-suave border border-coral/20'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0">{esCorrecta ? '🎉' : '💪'}</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-texto mb-1">
                {esCorrecta ? 'Correcto!' : 'Casi! No te preocupes.'}
              </p>
              <div className="flex items-start gap-2">
                {ttsSupported && pregunta.explicacion && (
                  <button
                    type="button"
                    onClick={() => speak(
                      `${esCorrecta ? 'Correcto!' : 'Casi, no te preocupes.'} ${pregunta.explicacion}`,
                      `fb-${pregunta.id}`
                    )}
                    className={`
                      shrink-0 w-7 h-7 mt-0.5 rounded-full flex items-center justify-center
                      transition-all duration-200 touch-manipulation
                      ${speakingId === `fb-${pregunta.id}`
                        ? 'bg-turquesa text-white scale-110 animate-pulse'
                        : 'bg-turquesa/10 text-turquesa hover:bg-turquesa/20'}
                    `}
                    aria-label="Escuchar explicacion"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M11.383 3.07A1 1 0 0112 4v16a1 1 0 01-1.617.784L5.132 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.132l5.251-4.784A1 1 0 0111.383 3.07zM14.025 5.88a.75.75 0 011.06-.04 8.5 8.5 0 010 12.32.75.75 0 11-1.02-1.1 7 7 0 000-10.12.75.75 0 01-.04-1.06zm.92 3.58a.75.75 0 011.06-.02 4.5 4.5 0 010 5.12.75.75 0 01-1.18-.93 3 3 0 000-3.18.75.75 0 01.12-1z" />
                    </svg>
                  </button>
                )}
                <p className="text-sm text-texto-suave leading-relaxed">
                  {pregunta.explicacion}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boton siguiente - only shown on non-final questions; the last
          question completes immediately on answer selection */}
      {mostrandoFeedback && preguntaActual + 1 < preguntas.length && (
        <div className="text-center animate-fade-in">
          <button
            type="button"
            onClick={handleSiguiente}
            className="
              inline-flex items-center gap-2
              bg-turquesa text-white
              font-bold text-lg
              px-8 py-3.5 rounded-3xl
              shadow-[0_4px_0_#3BA89F,0_6px_16px_rgba(0,0,0,0.1)]
              active:scale-95 transition-transform
              touch-manipulation
            "
          >
            <span className="font-datos">Siguiente</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
