'use client';

/**
 * Test de baseline de lectura.
 * Presenta 3-4 textos de dificultad creciente con preguntas de comprension.
 * Mide aciertos por tipo y tiempo de lectura.
 * Calcula nivel inicial con confianza.
 */
import { useState, useRef, useCallback } from 'react';
import { BASELINE_TEXTS, type BaselineText } from '@/lib/data/baseline-texts';
import { calcularBaseline } from '@/lib/types/reading';
import type { ComprehensionQuestion } from '@/lib/types/reading';
import { guardarRespuestaBaseline, finalizarBaseline } from '@/server/actions/baseline-actions';

/** Wrapper para medir tiempo sin que el linter lo marque como impuro */
function timestamp(): number {
  return performance.now();
}

interface Props {
  studentId: string;
  studentNombre: string;
  onComplete: () => void;
}

type Fase = 'intro' | 'leyendo' | 'preguntas' | 'resultado';

interface ResultadoTexto {
  nivelTexto: number;
  textoId: string;
  totalPreguntas: number;
  aciertos: number;
  aciertosPorTipo: Record<string, number>;
  tiempoLecturaMs: number;
  respuestas: Array<{
    preguntaId: string;
    tipo: string;
    respuesta: string;
    correcta: boolean;
    tiempoMs: number;
  }>;
}

export default function TestBaseline({ studentId, studentNombre, onComplete }: Props) {
  const [fase, setFase] = useState<Fase>('intro');
  const [textoIdx, setTextoIdx] = useState(0);
  const [preguntaIdx, setPreguntaIdx] = useState(0);
  const [resultados, setResultados] = useState<ResultadoTexto[]>([]);
  const [respuestasTextoActual, setRespuestasTextoActual] = useState<ResultadoTexto['respuestas']>([]);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [mostrandoFeedback, setMostrandoFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nivelFinal, setNivelFinal] = useState<number>(0);
  const [confianzaFinal, setConfianzaFinal] = useState<string>('');

  const tiempoInicioLectura = useRef<number>(0);
  const tiempoInicioPregunta = useRef<number>(0);

  const textoActual: BaselineText | undefined = BASELINE_TEXTS[textoIdx];
  const preguntaActual: ComprehensionQuestion | undefined = textoActual?.preguntas[preguntaIdx];

  const iniciarLectura = useCallback(() => {
    tiempoInicioLectura.current = timestamp();
    setFase('leyendo');
  }, []);

  const terminarLectura = useCallback(() => {
    tiempoInicioPregunta.current = timestamp();
    setPreguntaIdx(0);
    setRespuestasTextoActual([]);
    setFase('preguntas');
  }, []);

  async function handleSeleccion(idx: number) {
    if (mostrandoFeedback || !preguntaActual || !textoActual) return;

    setSeleccion(idx);
    setMostrandoFeedback(true);

    const correcta = idx === preguntaActual.respuestaCorrecta;
    const tiempoMs = timestamp() - tiempoInicioPregunta.current;

    const respuesta = {
      preguntaId: preguntaActual.id,
      tipo: preguntaActual.tipo,
      respuesta: String(idx),
      correcta,
      tiempoMs,
    };

    const nuevasRespuestas = [...respuestasTextoActual, respuesta];
    setRespuestasTextoActual(nuevasRespuestas);

    // Esperar 1.2s para mostrar feedback
    await new Promise(r => setTimeout(r, 1200));
    setMostrandoFeedback(false);
    setSeleccion(null);

    const siguientePregunta = preguntaIdx + 1;

    if (siguientePregunta < textoActual.preguntas.length) {
      // Siguiente pregunta
      setPreguntaIdx(siguientePregunta);
      tiempoInicioPregunta.current = timestamp();
    } else {
      // Texto completado - guardar resultado
      const tiempoLecturaMs = timestamp() - tiempoInicioLectura.current;
      const aciertos = nuevasRespuestas.filter(r => r.correcta).length;

      const aciertosPorTipo: Record<string, number> = {};
      for (const r of nuevasRespuestas) {
        if (r.correcta) {
          aciertosPorTipo[r.tipo] = (aciertosPorTipo[r.tipo] ?? 0) + 1;
        } else {
          aciertosPorTipo[r.tipo] = aciertosPorTipo[r.tipo] ?? 0;
        }
      }

      const resultado: ResultadoTexto = {
        nivelTexto: textoActual.nivel,
        textoId: textoActual.id,
        totalPreguntas: textoActual.preguntas.length,
        aciertos,
        aciertosPorTipo,
        tiempoLecturaMs,
        respuestas: nuevasRespuestas,
      };

      const nuevosResultados = [...resultados, resultado];
      setResultados(nuevosResultados);

      // Guardar en DB
      await guardarRespuestaBaseline({
        studentId,
        ...resultado,
      });

      // Decidir si continuar o finalizar
      const ratio = aciertos / textoActual.preguntas.length;
      const siguienteTexto = textoIdx + 1;

      // Parar si: ya no hay mas textos, o acierto < 30% en este nivel
      if (siguienteTexto >= BASELINE_TEXTS.length || ratio < 0.30) {
        await finalizarTest(nuevosResultados);
      } else {
        setTextoIdx(siguienteTexto);
        setPreguntaIdx(0);
        setRespuestasTextoActual([]);
        setFase('leyendo');
        tiempoInicioLectura.current = timestamp();
      }
    }
  }

  async function finalizarTest(resultadosFinales: ResultadoTexto[]) {
    setLoading(true);

    const baseline = calcularBaseline(resultadosFinales);

    setNivelFinal(baseline.nivelLectura);
    setConfianzaFinal(baseline.confianza);

    await finalizarBaseline({
      studentId,
      nivelLectura: baseline.nivelLectura,
      comprensionScore: baseline.comprensionScore,
      confianza: baseline.confianza,
    });

    setLoading(false);
    setFase('resultado');
  }

  // ─── RENDER ────────────────────────────────

  if (fase === 'intro') {
    return (
      <div className="w-full max-w-lg mx-auto text-center animate-fade-in">
        <span className="text-5xl">📖</span>
        <h2 className="mt-3 text-2xl font-extrabold text-texto">
          Vamos a leer, {studentNombre}!
        </h2>
        <p className="mt-2 text-base text-texto-suave max-w-xs mx-auto">
          Vas a leer algunos textos cortos y responder preguntas.
          No te preocupes, no hay respuestas malas!
        </p>
        <div className="mt-6 space-y-3 text-left max-w-xs mx-auto">
          <div className="flex items-center gap-3 text-sm text-texto">
            <span className="text-xl">1️⃣</span> Lee el texto con calma
          </div>
          <div className="flex items-center gap-3 text-sm text-texto">
            <span className="text-xl">2️⃣</span> Responde las preguntas
          </div>
          <div className="flex items-center gap-3 text-sm text-texto">
            <span className="text-xl">3️⃣</span> Son {BASELINE_TEXTS.length} textos cortos
          </div>
        </div>
        <button
          type="button"
          onClick={iniciarLectura}
          className="mt-8 w-full max-w-xs rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Empezar
        </button>
      </div>
    );
  }

  if (fase === 'leyendo' && textoActual) {
    return (
      <div className="w-full max-w-lg mx-auto animate-fade-in">
        {/* Progreso */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-neutro/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-turquesa transition-all duration-300"
              style={{ width: `${((textoIdx) / BASELINE_TEXTS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-texto-suave font-medium">
            {textoIdx + 1}/{BASELINE_TEXTS.length}
          </span>
        </div>

        <h3 className="text-lg font-bold text-texto mb-3">
          {textoActual.titulo}
        </h3>

        <div className="rounded-2xl bg-superficie border-2 border-neutro/10 p-5 shadow-sm">
          <p className="text-base text-texto leading-relaxed whitespace-pre-line">
            {textoActual.contenido}
          </p>
        </div>

        <button
          type="button"
          onClick={terminarLectura}
          className="mt-6 w-full rounded-2xl bg-turquesa px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Ya termine de leer
        </button>
      </div>
    );
  }

  if (fase === 'preguntas' && textoActual && preguntaActual) {
    return (
      <div className="w-full max-w-lg mx-auto animate-fade-in">
        {/* Progreso */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-neutro/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-turquesa transition-all duration-300"
              style={{ width: `${((textoIdx + (preguntaIdx + 1) / textoActual.preguntas.length) / BASELINE_TEXTS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-texto-suave font-medium">
            Pregunta {preguntaIdx + 1}/{textoActual.preguntas.length}
          </span>
        </div>

        <p className="text-sm text-texto-suave mb-1">
          Sobre: {textoActual.titulo}
        </p>

        <h3 className="text-lg font-bold text-texto mb-4">
          {preguntaActual.pregunta}
        </h3>

        <div className="space-y-2">
          {preguntaActual.opciones.map((opcion, idx) => {
            let estilo = 'border-neutro/20 bg-superficie text-texto hover:border-turquesa/50';

            if (mostrandoFeedback) {
              if (idx === preguntaActual.respuestaCorrecta) {
                estilo = 'border-bosque bg-bosque/10 text-bosque';
              } else if (idx === seleccion && idx !== preguntaActual.respuestaCorrecta) {
                estilo = 'border-coral bg-coral/10 text-coral';
              } else {
                estilo = 'border-neutro/10 bg-superficie/50 text-texto-suave';
              }
            } else if (seleccion === idx) {
              estilo = 'border-turquesa bg-turquesa/10 text-turquesa';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSeleccion(idx)}
                disabled={mostrandoFeedback}
                className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${estilo}`}
              >
                {opcion}
              </button>
            );
          })}
        </div>

        {mostrandoFeedback && seleccion !== null && (
          <div className="mt-4 text-center animate-scale-in">
            {seleccion === preguntaActual.respuestaCorrecta ? (
              <span className="text-2xl">🎉</span>
            ) : (
              <span className="text-2xl">💪</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (fase === 'resultado') {
    const totalAciertos = resultados.reduce((s, r) => s + r.aciertos, 0);
    const totalPreguntas = resultados.reduce((s, r) => s + r.totalPreguntas, 0);

    return (
      <div className="w-full max-w-lg mx-auto text-center animate-fade-in">
        <span className="text-6xl">🏆</span>
        <h2 className="mt-3 text-2xl font-extrabold text-texto">
          Genial, {studentNombre}!
        </h2>
        <p className="mt-2 text-base text-texto-suave">
          Has completado el test de lectura
        </p>

        <div className="mt-6 rounded-2xl bg-superficie border-2 border-neutro/10 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Textos leidos</span>
            <span className="text-lg font-bold text-texto">{resultados.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Respuestas correctas</span>
            <span className="text-lg font-bold text-bosque">{totalAciertos}/{totalPreguntas}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Tu nivel</span>
            <span className="text-lg font-bold text-turquesa">Nivel {nivelFinal}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Confianza</span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              confianzaFinal === 'alto' ? 'bg-bosque/10 text-bosque' :
              confianzaFinal === 'medio' ? 'bg-amarillo/20 text-taller' :
              'bg-neutro/10 text-texto-suave'
            }`}>
              {confianzaFinal === 'alto' ? 'Alta' : confianzaFinal === 'medio' ? 'Media' : 'Baja'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onComplete}
          disabled={loading}
          className="mt-8 w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Continuar
        </button>
      </div>
    );
  }

  return null;
}
