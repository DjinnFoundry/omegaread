'use client';

/**
 * Ruta de lectura adaptativa.
 *
 * Flujo:
 * 1. Si no tiene perfil completo -> FormularioPerfil (padre)
 * 2. Si no tiene intereses -> SelectorIntereses (nino)
 * 3. Si no tiene baseline -> TestBaseline
 * 4. Si tiene todo -> SesionLectura (ciclo completo de lectura)
 *
 * Sprint 4: reescritura en sesion con ajuste manual de dificultad.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import {
  obtenerEstadoLectura,
  type EstadoFlujoLectura,
  type DatosEstudianteLectura,
} from '@/server/actions/lectura-flow-actions';
import {
  generarHistoria,
  finalizarSesionLectura,
  reescribirHistoria,
} from '@/server/actions/story-actions';
import FormularioPerfil from '@/components/perfil/FormularioPerfil';
import SelectorIntereses from '@/components/perfil/SelectorIntereses';
import FormularioContexto from '@/components/perfil/FormularioContexto';
import TestBaseline from '@/components/baseline/TestBaseline';
import InicioSesion from '@/components/lectura/InicioSesion';
import PantallaLectura, { type WpmData } from '@/components/lectura/PantallaLectura';
import PantallaPreguntas, { type RespuestaPregunta } from '@/components/lectura/PantallaPreguntas';
import ResultadoSesion from '@/components/lectura/ResultadoSesion';

type PasoSesion = 'elegir-topic' | 'generando' | 'leyendo' | 'preguntas' | 'resultado';

interface DatosSesionActiva {
  sessionId: string;
  storyId: string;
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
  comprensionScore: number;
  estrellas: number;
  direccion: 'subir' | 'bajar' | 'mantener';
  nivelAnterior: number;
  nivelNuevo: number;
  razon: string;
}

export default function LecturaPage() {
  const router = useRouter();
  const { estudiante, recargarProgreso } = useStudentProgress();
  const [estado, setEstado] = useState<EstadoFlujoLectura | null>(null);
  const [datosEstudiante, setDatosEstudiante] = useState<DatosEstudianteLectura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const cargaInicial = useRef(false);

  // Estado de sesion de lectura activa
  const [pasoSesion, setPasoSesion] = useState<PasoSesion>('elegir-topic');
  const [sesionActiva, setSesionActiva] = useState<DatosSesionActiva | null>(null);
  const [tiempoLectura, setTiempoLectura] = useState(0);
  const [wpmData, setWpmData] = useState<WpmData | null>(null);
  const [resultadoSesion, setResultadoSesion] = useState<ResultadoSesionData | null>(null);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  // Sprint 4: estado de reescritura
  const [reescribiendo, setReescribiendo] = useState(false);
  const [ajusteUsado, setAjusteUsado] = useState(false);
  const [rewriteCount, setRewriteCount] = useState(0);

  const cargarEstado = useCallback(async () => {
    if (!estudiante) return;
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

  useEffect(() => {
    if (!estudiante) {
      setCargando(false);
      return;
    }
    if (cargaInicial.current) return;
    cargaInicial.current = true;
    let cancelled = false;

    obtenerEstadoLectura(estudiante.id)
      .then(result => {
        if (cancelled) return;
        if (result) {
          setEstado(result.estado);
          setDatosEstudiante(result.estudiante);
        }
        setCargando(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error cargando estado de lectura:', err);
        setErrorCarga('No pudimos cargar el perfil. Intenta de nuevo.');
        setCargando(false);
      });

    return () => { cancelled = true; };
  }, [estudiante]);

  // ─── Handlers de sesion ───

  const handleStartReading = useCallback(async (topicSlug: string) => {
    if (!estudiante || generando) return;
    setGenerando(true);
    setErrorGeneracion(null);
    setPasoSesion('generando');

    try {
      const result = await generarHistoria({
        studentId: estudiante.id,
        topicSlug,
      });

      if (!result.ok) {
        setErrorGeneracion(result.error);
        setPasoSesion('elegir-topic');
        return;
      }

      setSesionActiva({
        sessionId: result.sessionId,
        storyId: result.storyId,
        historia: result.historia,
        preguntas: result.preguntas,
      });
      setAjusteUsado(false);
      setPasoSesion('leyendo');
    } catch {
      setErrorGeneracion('No pudimos crear tu historia. Intentalo de nuevo.');
      setPasoSesion('elegir-topic');
    } finally {
      setGenerando(false);
    }
  }, [estudiante, generando]);

  const handleTerminarLectura = useCallback((tiempoMs: number, wpm: WpmData) => {
    setTiempoLectura(tiempoMs);
    setWpmData(wpm);
    setPasoSesion('preguntas');
  }, []);

  // Sprint 4: handler de ajuste manual (reescritura)
  const handleAjusteManual = useCallback(async (
    direccion: 'mas_facil' | 'mas_desafiante',
    tiempoLecturaMs: number,
  ) => {
    if (!estudiante || !sesionActiva || reescribiendo || ajusteUsado) return;

    setReescribiendo(true);

    try {
      const result = await reescribirHistoria({
        sessionId: sesionActiva.sessionId,
        studentId: estudiante.id,
        storyId: sesionActiva.storyId,
        direccion,
        tiempoLecturaAntesDePulsar: tiempoLecturaMs,
      });

      if (!result.ok) {
        // Fallo silencioso: el nino puede seguir leyendo la historia original
        return;
      }

      setSesionActiva(prev => {
        if (!prev) return null;
        return {
          ...prev,
          storyId: result.storyId,
          historia: result.historia,
          preguntas: result.preguntas,
        };
      });
      setAjusteUsado(true);
      setRewriteCount(c => c + 1);
    } catch {
      // Fallo silencioso: el nino puede seguir leyendo la historia original
    } finally {
      setReescribiendo(false);
    }
  }, [estudiante, sesionActiva, reescribiendo, ajusteUsado]);

  const [errorFinalizacion, setErrorFinalizacion] = useState<string | null>(null);

  const handleRespuestasCompletas = useCallback(async (respuestas: RespuestaPregunta[]) => {
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
  }, [estudiante, sesionActiva, tiempoLectura, wpmData, recargarProgreso]);

  const handleLeerOtra = useCallback(() => {
    setSesionActiva(null);
    setResultadoSesion(null);
    setTiempoLectura(0);
    setWpmData(null);
    setErrorGeneracion(null);
    setAjusteUsado(false);
    setReescribiendo(false);
    setRewriteCount(0);
    setPasoSesion('elegir-topic');
    // Recargar estado por si el nivel cambio
    void cargarEstado();
  }, [cargarEstado]);

  const handleVolver = useCallback(() => {
    router.push('/jugar');
  }, [router]);

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

  // Sin estudiante activo en el contexto (no se selecciono hijo)
  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center max-w-sm">
          <span className="text-5xl">👦</span>
          <h2 className="mt-3 text-xl font-bold text-texto">Selecciona un lector</h2>
          <p className="mt-2 text-sm text-texto-suave">
            Vuelve al panel de padre y pulsa &quot;Ir a leer&quot; con uno de tus hijos.
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
            onClick={() => {
              cargaInicial.current = false;
              setErrorCarga(null);
              void cargarEstado();
            }}
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

  // ─── Paso 1: Perfil incompleto (padre) ───
  if (estado.paso === 'perfil-incompleto') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <FormularioPerfil
          studentId={datosEstudiante.id}
          studentNombre={datosEstudiante.nombre}
          onComplete={cargarEstado}
        />
      </main>
    );
  }

  // ─── Paso 2: Sin intereses (nino) ───
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

  // ─── Paso 4: Sin baseline ───
  if (estado.paso === 'sin-baseline') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <TestBaseline
          studentId={datosEstudiante.id}
          studentNombre={datosEstudiante.nombre}
          onComplete={cargarEstado}
        />
      </main>
    );
  }

  // ─── Paso 4: Listo → Sesion de lectura ───
  const nivelActual = datosEstudiante.nivelLectura ?? estado.nivelLectura;

  // Generando historia
  if (pasoSesion === 'generando') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center animate-pulse-brillo">
          <span className="text-5xl animate-bounce-suave">✨</span>
          <p className="mt-4 text-lg font-semibold text-texto">
            Creando tu historia...
          </p>
          <p className="mt-1 text-sm text-texto-suave">
            Esto tomara unos segundos
          </p>
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
          topicEmoji={sesionActiva.historia.topicEmoji}
          topicNombre={sesionActiva.historia.topicNombre}
          nivel={sesionActiva.historia.nivel}
          onTerminar={handleTerminarLectura}
          onAjusteManual={handleAjusteManual}
          reescribiendo={reescribiendo}
          ajusteUsado={ajusteUsado}
          rewriteCount={rewriteCount}
        />
      </main>
    );
  }

  // Preguntas
  if (pasoSesion === 'preguntas' && sesionActiva) {
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
          onVolver={handleVolver}
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
          <p className="text-texto-suave">
            No pudimos crear tu historia. Intentalo de nuevo o prueba con otro tema.
          </p>
        </div>
      )}

      <InicioSesion
        studentNombre={datosEstudiante.nombre}
        nivelLectura={nivelActual}
        intereses={datosEstudiante.intereses}
        edadAnos={datosEstudiante.edadAnos}
        onStart={handleStartReading}
        generando={generando}
      />
    </main>
  );
}
