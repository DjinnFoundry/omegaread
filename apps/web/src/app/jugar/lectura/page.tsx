'use client';

/**
 * Ruta de lectura adaptativa.
 *
 * Flujo:
 * 1. Si no tiene perfil completo -> FormularioPerfil (padre)
 * 2. Si no tiene intereses -> SelectorIntereses (nino)
 * 3. Si no tiene baseline -> TestBaseline
 * 4. Si tiene todo -> SesionLectura (ciclo completo de lectura)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import {
  obtenerEstadoLectura,
  type EstadoFlujoLectura,
  type DatosEstudianteLectura,
} from '@/server/actions/lectura-flow-actions';
import { generarHistoria, finalizarSesionLectura } from '@/server/actions/story-actions';
import FormularioPerfil from '@/components/perfil/FormularioPerfil';
import SelectorIntereses from '@/components/perfil/SelectorIntereses';
import TestBaseline from '@/components/baseline/TestBaseline';
import InicioSesion from '@/components/lectura/InicioSesion';
import PantallaLectura from '@/components/lectura/PantallaLectura';
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
  const cargaInicial = useRef(false);

  // Estado de sesion de lectura activa
  const [pasoSesion, setPasoSesion] = useState<PasoSesion>('elegir-topic');
  const [sesionActiva, setSesionActiva] = useState<DatosSesionActiva | null>(null);
  const [tiempoLectura, setTiempoLectura] = useState(0);
  const [resultadoSesion, setResultadoSesion] = useState<ResultadoSesionData | null>(null);
  const [errorGeneracion, setErrorGeneracion] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const cargarEstado = useCallback(async () => {
    if (!estudiante) return;
    setCargando(true);
    const result = await obtenerEstadoLectura(estudiante.id);
    if (result) {
      setEstado(result.estado);
      setDatosEstudiante(result.estudiante);
    }
    setCargando(false);
  }, [estudiante]);

  useEffect(() => {
    if (!estudiante || cargaInicial.current) return;
    cargaInicial.current = true;
    let cancelled = false;

    obtenerEstadoLectura(estudiante.id).then(result => {
      if (cancelled) return;
      if (result) {
        setEstado(result.estado);
        setDatosEstudiante(result.estudiante);
      }
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

    const result = await generarHistoria({
      studentId: estudiante.id,
      topicSlug,
    });

    setGenerando(false);

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
    setPasoSesion('leyendo');
  }, [estudiante, generando]);

  const handleTerminarLectura = useCallback((tiempoMs: number) => {
    setTiempoLectura(tiempoMs);
    setPasoSesion('preguntas');
  }, []);

  const handleRespuestasCompletas = useCallback(async (respuestas: RespuestaPregunta[]) => {
    if (!estudiante || !sesionActiva) return;

    const result = await finalizarSesionLectura({
      sessionId: sesionActiva.sessionId,
      studentId: estudiante.id,
      tiempoLecturaMs: tiempoLectura,
      respuestas,
    });

    if (result.ok) {
      setResultadoSesion(result.resultado);
      setPasoSesion('resultado');
      void recargarProgreso();
    }
  }, [estudiante, sesionActiva, tiempoLectura, recargarProgreso]);

  const handleLeerOtra = useCallback(() => {
    setSesionActiva(null);
    setResultadoSesion(null);
    setTiempoLectura(0);
    setErrorGeneracion(null);
    setPasoSesion('elegir-topic');
    // Recargar estado por si el nivel cambio
    void cargarEstado();
  }, [cargarEstado]);

  const handleVolver = useCallback(() => {
    router.push('/jugar');
  }, [router]);

  // ─── Loading ───
  if (!estudiante || cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-center animate-pulse-brillo">
          <span className="text-4xl">📚</span>
          <p className="mt-2 text-texto-suave">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!estado || !datosEstudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <p className="text-texto-suave">No se encontro el perfil.</p>
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

  // ─── Paso 3: Sin baseline ───
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
        />
      </main>
    );
  }

  // Preguntas
  if (pasoSesion === 'preguntas' && sesionActiva) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-fondo p-6">
        <PantallaPreguntas
          preguntas={sesionActiva.preguntas}
          onComplete={handleRespuestasCompletas}
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
          <p className="font-semibold mb-1">No se pudo crear la historia</p>
          <p className="text-texto-suave">{errorGeneracion}</p>
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
