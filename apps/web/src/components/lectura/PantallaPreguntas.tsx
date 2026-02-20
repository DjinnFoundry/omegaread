'use client';

/**
 * Pantalla de preguntas de comprension.
 * Una pregunta a la vez con feedback inmediato.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { click as sonidoClick, celebracion as sonidoCelebracion } from '@/lib/audio/sonidos';

interface Pregunta {
  id: string;
  tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
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

  const pregunta = preguntas[preguntaActual];
  const esCorrecta = respuestaSeleccionada === pregunta?.respuestaCorrecta;

  // Set/reset timer on mount and on new question
  useEffect(() => {
    inicioRef.current = Date.now();
  }, [preguntaActual]);

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

    setRespuestasAcumuladas(prev => [...prev, respuesta]);
  }, [mostrandoFeedback, pregunta]);

  const handleSiguiente = useCallback(() => {
    const siguiente = preguntaActual + 1;
    if (siguiente >= preguntas.length) {
      // Ultima pregunta, finalizar
      onComplete(respuestasAcumuladas);
    } else {
      setPreguntaActual(siguiente);
      setRespuestaSeleccionada(null);
      setMostrandoFeedback(false);
    }
  }, [preguntaActual, preguntas.length, onComplete, respuestasAcumuladas]);

  if (!pregunta) return null;

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      {/* Progreso */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-texto-suave">
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
            <span>{mostrarHistoria ? '📖' : '📖'}</span>
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
        <span className="text-xs font-medium text-texto-suave bg-superficie px-3 py-1 rounded-full">
          {TIPO_LABELS[pregunta.tipo]}
        </span>
      </div>

      {/* Pregunta */}
      <div className="bg-superficie rounded-3xl p-5 shadow-sm border border-neutro/10 mb-5">
        <p className="text-lg font-semibold text-texto leading-relaxed">
          {pregunta.pregunta}
        </p>
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

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSeleccion(idx)}
              disabled={mostrandoFeedback}
              className={`
                w-full text-left p-4 rounded-2xl
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
            <div>
              <p className="font-bold text-sm text-texto mb-1">
                {esCorrecta ? 'Correcto!' : 'Casi! No te preocupes.'}
              </p>
              <p className="text-sm text-texto-suave leading-relaxed">
                {pregunta.explicacion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Boton siguiente */}
      {mostrandoFeedback && (
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
            {preguntaActual + 1 < preguntas.length ? 'Siguiente' : 'Ver mi resultado'}
            <span>{preguntaActual + 1 < preguntas.length ? '→' : '🏆'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
