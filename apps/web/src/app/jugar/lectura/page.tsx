'use client';

/**
 * Ruta de lectura adaptativa.
 *
 * Flujo:
 * 1. Si no tiene intereses -> SelectorIntereses (nino)
 * 2. Si no tiene contexto -> FormularioContexto (padre)
 * 3. Si tiene todo -> SesionLectura (ciclo completo de lectura)
 *
 * La dificultad se ajusta automaticamente por respuestas (sin ajuste manual en UI).
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import {
  obtenerEstadoLectura,
  type EstadoFlujoLectura,
  type DatosEstudianteLectura,
} from '@/server/actions/lectura-flow-actions';
import {
  generarHistoria,
  obtenerProgresoGeneracionHistoria,
  generarPreguntasSesion,
  finalizarSesionLectura,
  analizarLecturaAudio,
  type StoryGenerationTrace,
} from '@/server/actions/story-actions';
import SelectorIntereses from '@/components/perfil/SelectorIntereses';
import FormularioContexto from '@/components/perfil/FormularioContexto';
import InicioSesion from '@/components/lectura/InicioSesion';
import PantallaLectura, {
  type WpmData,
  type AudioAnalisisPayload,
} from '@/components/lectura/PantallaLectura';
import PantallaPreguntas, { type RespuestaPregunta } from '@/components/lectura/PantallaPreguntas';
import ResultadoSesion from '@/components/lectura/ResultadoSesion';

type PasoSesion = 'elegir-topic' | 'generando' | 'leyendo' | 'preguntas' | 'resultado';

interface DatosSesionActiva {
  sessionId: string;
  storyId: string;
  fromCache: boolean;
  historia: {
    titulo: string;
    contenido: string;
    nivel: number;
    topicSlug: string;
    topicEmoji: string;
    topicNombre: string;
    tiempoEsperadoMs: number;
  };
  preguntas: Array<{
    id: string;
    tipo: 'literal' | 'inferencia' | 'vocabulario' | 'resumen';
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
  }>;
}

interface ResultadoSesionData {
  aciertos: number;
  totalPreguntas: number;
  estrellas: number;
}

function stageStatusIcon(status: StoryGenerationTrace['stages'][number]['status']): string {
  if (status === 'done') return '✅';
  if (status === 'running') return '⏳';
  if (status === 'error') return '❌';
  return '-';
}

export default function LecturaPage() {
  const router = useRouter();
  const { estudiante, autoSelecting, recargarProgreso } = useStudentProgress();
  const [estado, setEstado] = useState<EstadoFlujoLectura | null>(null);
  const [datosEstudiante, setDatosEstudiante] = useState<DatosEstudianteLectura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Estado de sesion de lectura activa
  const [pasoSesion, setPasoSesion] = useState<PasoSesion>('elegir-topic');
  const [sesionActiva, setSesionActiva] = useState<DatosSesionActiva | null>(null);
  const [tiempoLectura, setTiempoLectura] = useState(0);
  const [wpmData, setWpmData] = useState<WpmData | null>(null);
  const [resultadoSesion, setResultadoSesion] = useState<ResultadoSesionData | null>(null);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const [ultimoTopicIntentado, setUltimoTopicIntentado] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [traceGeneracion, setTraceGeneracion] = useState<StoryGenerationTrace | null>(null);

  // Estado de generacion de preguntas en background (por sesion)
  const [preguntasGenerandoPara, setPreguntasGenerandoPara] = useState<string | null>(null);
  const [errorPreguntas, setErrorPreguntas] = useState<string | null>(null);

  const preguntasCargando = !!sesionActiva && preguntasGenerandoPara === sesionActiva.sessionId;

  const cargarEstado = useCallback(async () => {
    if (!estudiante) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setErrorCarga(null);
    try {
      const result = await obtenerEstadoLectura(estudiante.id);
      if (result) {
        setEstado(result.estado);
        setDatosEstudiante(result.estudiante);
      }
    } catch (err) {
      console.error('Error cargando estado de lectura:', err);
      setErrorCarga('No pudimos cargar el perfil. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [estudiante]);

  // Cargar estado cuando el provider resuelve el estudiante
  useEffect(() => {
    if (autoSelecting) return; // Provider aun resolviendo, esperar
    void cargarEstado();
  }, [autoSelecting, cargarEstado]);

  // ─── Handlers de sesion ───

  const cargarPreguntasDeSesion = useCallback(
    async (sessionId: string, storyId: string, studentId: string) => {
      setPreguntasGenerandoPara(sessionId);
      setErrorPreguntas(null);

      try {
        const qResult = await generarPreguntasSesion({
          sessionId,
          studentId,
          storyId,
        });

        if (!qResult.ok) {
          setErrorPreguntas(qResult.error || 'No pudimos preparar tus preguntas');
          return;
        }

        setSesionActiva((prev) => {
          if (!prev || prev.sessionId !== sessionId) return prev;
          return { ...prev, preguntas: qResult.preguntas };
        });
      } catch {
        setErrorPreguntas('No pudimos preparar tus preguntas. Intentalo de nuevo.');
      } finally {
        setPreguntasGenerandoPara((current) => (current === sessionId ? null : current));
      }
    },
    [],
  );

  const iniciarPollingProgreso = useCallback((studentId: string, progressTraceId: string) => {
    let activo = true;

    const poll = async () => {
      if (!activo) return;
      try {
        const result = await obtenerProgresoGeneracionHistoria({
          studentId,
          progressTraceId,
        });
        if (result.ok) {
          setTraceGeneracion(result.trace);
        }
      } catch {
        // Silencioso: la UI ya muestra etapa actual, reintentamos en el siguiente tick.
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, 900);

    return () => {
      activo = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleStartReading = useCallback(
    async (topicSlug: string, forceRegenerate?: boolean) => {
      if (!estudiante || generando) return;
      setUltimoTopicIntentado(topicSlug);
      setGenerando(true);
      setErrorGeneracion(null);
      setPasoSesion('generando');
      setTraceGeneracion(null);

      const progressTraceId = crypto.randomUUID();
      const detenerPolling = iniciarPollingProgreso(estudiante.id, progressTraceId);

      try {
        const result = await generarHistoria({
          studentId: estudiante.id,
          topicSlug,
          forceRegenerate,
          progressTraceId,
        });

        if (result.generationTrace) {
          setTraceGeneracion(result.generationTrace);
        }

        if (!result.ok) {
          setErrorGeneracion(result.error);
          setPasoSesion('elegir-topic');
          return;
        }

        const tienePreguntas = result.preguntas && result.preguntas.length > 0;

        setSesionActiva({
          sessionId: result.sessionId,
          storyId: result.storyId,
          fromCache: result.fromCache ?? false,
          historia: result.historia,
          preguntas: tienePreguntas ? result.preguntas : [],
        });
        setErrorPreguntas(null);
        if (tienePreguntas) {
          setPreguntasGenerandoPara(null);
        }
        setPasoSesion('leyendo');

        // Si no hay preguntas (generacion nueva), generarlas en background
        if (!tienePreguntas) {
          void cargarPreguntasDeSesion(result.sessionId, result.storyId, estudiante.id);
        }
      } catch {
        setErrorGeneracion('No pudimos crear tu historia. Intentalo de nuevo.');
        setPasoSesion('elegir-topic');
      } finally {
        detenerPolling();
        setGenerando(false);
      }
    },
    [estudiante, generando, cargarPreguntasDeSesion, iniciarPollingProgreso],
  );

  const handleTerminarLectura = useCallback(
    async (tiempoMs: number, wpm: WpmData) => {
      setTiempoLectura(tiempoMs);
      setWpmData(wpm);

      // Si las preguntas ya estan listas, ir directo
      if (sesionActiva && sesionActiva.preguntas.length > 0) {
        setPasoSesion('preguntas');
        return;
      }

      // Si las preguntas aun se estan generando en background, esperar
      if (preguntasCargando) {
        setPasoSesion('preguntas');
        return;
      }

      // Si no hay preguntas y no se estan cargando, reintentar
      if (estudiante && sesionActiva) {
        setPasoSesion('preguntas');
        await cargarPreguntasDeSesion(sesionActiva.sessionId, sesionActiva.storyId, estudiante.id);
      } else {
        setPasoSesion('preguntas');
      }
    },
    [sesionActiva, preguntasCargando, estudiante, cargarPreguntasDeSesion],
  );

  const handleAnalizarAudio = useCallback(
    async (payload: AudioAnalisisPayload) => {
      if (!estudiante || !sesionActiva) {
        return { ok: false as const, error: 'Sesion de lectura no activa' };
      }

      try {
        const result = await analizarLecturaAudio({
          sessionId: sesionActiva.sessionId,
          studentId: estudiante.id,
          storyId: sesionActiva.storyId,
          audioBase64: payload.audioBase64,
          mimeType: payload.mimeType,
          tiempoVozActivaMs: payload.tiempoVozActivaMs,
          tiempoTotalMs: payload.tiempoTotalMs,
        });

        if (!result.ok) {
          return { ok: false as const, error: result.error };
        }

        return { ok: true as const, analisis: result.analisis };
      } catch {
        return { ok: false as const, error: 'No se pudo analizar el audio' };
      }
    },
    [estudiante, sesionActiva],
  );

  // Handler de regeneracion (cuando la historia viene de cache y el nino quiere otra)
  const handleRegenerar = useCallback(() => {
    if (!sesionActiva) return;
    void handleStartReading(sesionActiva.historia.topicSlug, true);
  }, [sesionActiva, handleStartReading]);

  const [errorFinalizacion, setErrorFinalizacion] = useState<string | null>(null);

  const handleRespuestasCompletas = useCallback(
    async (respuestas: RespuestaPregunta[]) => {
      if (!estudiante || !sesionActiva) return;
      setErrorFinalizacion(null);

      try {
        const result = await finalizarSesionLectura({
          sessionId: sesionActiva.sessionId,
          studentId: estudiante.id,
          tiempoLecturaMs: tiempoLectura,
          respuestas,
          wpmPromedio: wpmData?.wpmPromedio ?? null,
          wpmPorPagina: wpmData?.wpmPorPagina ?? null,
          totalPaginas: wpmData?.totalPaginas ?? null,
          audioAnalisis: wpmData?.audioAnalisis ?? undefined,
        });

        if (result.ok) {
          setResultadoSesion(result.resultado);
          setPasoSesion('resultado');
          void recargarProgreso();
        } else {
          setErrorFinalizacion('No pudimos guardar tus respuestas. Intentalo de nuevo.');
        }
      } catch {
        setErrorFinalizacion('Hubo un error de conexion. Intentalo de nuevo.');
      }
    },
    [estudiante, sesionActiva, tiempoLectura, wpmData, recargarProgreso],
  );

  const handleLeerOtra = useCallback(() => {
    setSesionActiva(null);
    setResultadoSesion(null);
    setTiempoLectura(0);
    setWpmData(null);
    setErrorGeneracion(null);
    setUltimoTopicIntentado(null);
    setPreguntasGenerandoPara(null);
    setErrorPreguntas(null);
    setTraceGeneracion(null);
    setPasoSesion('elegir-topic');
    // Recargar estado por si el nivel cambio
    void cargarEstado();
  }, [cargarEstado]);

  const handleSalirLectura = useCallback(() => {
    setSesionActiva(null);
    setTiempoLectura(0);
    setWpmData(null);
    setErrorGeneracion(null);
    setPreguntasGenerandoPara(null);
    setErrorPreguntas(null);
    setTraceGeneracion(null);
    setPasoSesion('elegir-topic');
  }, []);

  // ─── Loading ───
  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-center animate-pulse-brillo">
          <span className="text-4xl">📚</span>
          <p className="mt-2 text-texto-suave">Cargando...</p>
        </div>
      </main>
    );
  }

  // Sin estudiante activo (auto-select fallo o no hay hijos registrados)
  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl">👦</span>
          <h2 className="mt-3 text-xl font-bold text-texto">No hay lectores</h2>
          <p className="mt-2 text-sm text-texto-suave">
            Primero crea el perfil de un lector desde el panel de padre.
          </p>
          <button
            type="button"
            onClick={() => router.push('/padre')}
            className="mt-5 rounded-2xl bg-turquesa px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Ir al panel
          </button>
        </div>
      </main>
    );
  }

  // Error al cargar el estado
  if (errorCarga) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl">😕</span>
          <h2 className="mt-3 text-xl font-bold text-texto">Algo salio mal</h2>
          <p className="mt-2 text-sm text-texto-suave">{errorCarga}</p>
          <button
            type="button"
            onClick={() => void cargarEstado()}
            className="mt-5 rounded-2xl bg-coral px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (!estado || !datosEstudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl">🔍</span>
          <h2 className="mt-3 text-xl font-bold text-texto">Perfil no encontrado</h2>
          <p className="mt-2 text-sm text-texto-suave">
            No pudimos encontrar el perfil de este lector.
          </p>
          <button
            type="button"
            onClick={() => router.push('/padre')}
            className="mt-5 rounded-2xl bg-turquesa px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Volver al panel
          </button>
        </div>
      </main>
    );
  }

  // ─── Paso 1: Sin intereses (nino) ───
  if (estado.paso === 'sin-intereses') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <SelectorIntereses
          studentId={datosEstudiante.id}
          studentNombre={datosEstudiante.nombre}
          edadAnos={datosEstudiante.edadAnos}
          interesesActuales={datosEstudiante.intereses}
          onComplete={cargarEstado}
        />
      </main>
    );
  }

  // ─── Paso 3: Sin contexto personal (padre) ───
  if (estado.paso === 'sin-contexto') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <FormularioContexto
          studentId={datosEstudiante.id}
          studentNombre={datosEstudiante.nombre}
          onComplete={cargarEstado}
        />
      </main>
    );
  }

  // ─── Paso 3: Listo → Sesion de lectura ───

  // Generando historia
  if (pasoSesion === 'generando') {
    const progreso = traceGeneracion ? Math.min(100, Math.max(0, Math.round(traceGeneracion.progress))) : 6;
    const etapaActual = traceGeneracion
      ? traceGeneracion.stages.find((s) => s.id === traceGeneracion.stageCurrent)
      : null;

    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="w-full max-w-xl rounded-3xl border border-neutro/20 bg-superficie p-5 shadow-sm">
          <div className="text-center">
            <span className="text-4xl">✨</span>
            <p className="mt-3 text-lg font-semibold text-texto">Creando tu historia...</p>
            <p className="mt-1 text-sm text-texto-suave">
              {etapaActual?.detail ?? 'Inicializando generacion'}
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] text-texto-suave">
              <span>Progreso real</span>
              <span>{progreso}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutro/15">
              <div
                className="h-full rounded-full bg-turquesa transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {(traceGeneracion?.stages ?? []).map((stage) => (
              <div
                key={stage.id}
                className="flex items-start justify-between rounded-xl bg-fondo px-3 py-2"
              >
                <p className="text-xs text-texto">
                  <span className="mr-1.5">{stageStatusIcon(stage.status)}</span>
                  {stage.label}
                </p>
                <p className="text-[11px] text-texto-suave">
                  {stage.durationMs !== undefined
                    ? `${(stage.durationMs / 1000).toFixed(1)}s`
                    : stage.status === 'running'
                      ? 'en curso'
                      : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Leyendo
  if (pasoSesion === 'leyendo' && sesionActiva) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-start bg-fondo p-6 pt-8">
        <PantallaLectura
          titulo={sesionActiva.historia.titulo}
          contenido={sesionActiva.historia.contenido}
          nivel={sesionActiva.historia.nivel}
          onTerminar={handleTerminarLectura}
          onAnalizarAudio={handleAnalizarAudio}
          fromCache={sesionActiva.fromCache}
          onRegenerar={handleRegenerar}
          onSalir={handleSalirLectura}
        />
      </main>
    );
  }

  // Preguntas
  if (pasoSesion === 'preguntas' && sesionActiva) {
    // Si las preguntas aun no estan listas, mostrar loading o error con reintento
    if (sesionActiva.preguntas.length === 0) {
      if (preguntasCargando) {
        return (
          <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
            <div className="text-center animate-pulse-brillo">
              <span className="text-5xl animate-bounce-suave">🤔</span>
              <p className="mt-4 text-lg font-semibold text-texto">Preparando tus preguntas...</p>
              <p className="mt-1 text-sm text-texto-suave">Solo un momento</p>
            </div>
          </main>
        );
      }

      return (
        <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
          <div className="w-full max-w-md rounded-2xl border border-coral/20 bg-error-suave p-5 text-center">
            <span className="text-4xl">🧩</span>
            <p className="mt-3 text-base font-semibold text-texto">
              No pudimos preparar las preguntas
            </p>
            <p className="mt-2 text-sm text-texto-suave">
              {errorPreguntas ?? 'Intenta de nuevo para continuar la sesion.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!estudiante) return;
                void cargarPreguntasDeSesion(
                  sesionActiva.sessionId,
                  sesionActiva.storyId,
                  estudiante.id,
                );
              }}
              className="mt-4 rounded-2xl bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Reintentar preguntas
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        {errorFinalizacion && (
          <div className="w-full max-w-md mb-4 p-4 rounded-2xl bg-error-suave border border-coral/20 text-sm text-texto">
            <p className="font-semibold mb-1">Ups!</p>
            <p className="text-texto-suave">{errorFinalizacion}</p>
          </div>
        )}
        <PantallaPreguntas
          preguntas={sesionActiva.preguntas}
          onComplete={handleRespuestasCompletas}
          historiaContenido={sesionActiva.historia.contenido}
          historiaTitulo={sesionActiva.historia.titulo}
        />
      </main>
    );
  }

  // Resultado
  if (pasoSesion === 'resultado' && resultadoSesion) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <ResultadoSesion
          resultado={resultadoSesion}
          studentNombre={datosEstudiante.nombre}
          onLeerOtra={handleLeerOtra}
        />
      </main>
    );
  }

  // Elegir topic (pantalla de inicio de sesion)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
      {errorGeneracion && (
        <div className="w-full max-w-md mb-4 p-4 rounded-2xl bg-error-suave border border-coral/20 text-sm text-texto">
          <p className="font-semibold mb-1">Ups! Algo salio mal</p>
          <p className="text-texto-suave">{errorGeneracion}</p>
          {ultimoTopicIntentado && (
            <button
              type="button"
              onClick={() => void handleStartReading(ultimoTopicIntentado)}
              className="mt-3 rounded-2xl bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Hubo un error, reintentar
            </button>
          )}
        </div>
      )}

      <InicioSesion
        studentNombre={datosEstudiante.nombre}
        intereses={datosEstudiante.intereses}
        edadAnos={datosEstudiante.edadAnos}
        onStart={handleStartReading}
        generando={generando}
      />
    </main>
  );
}
