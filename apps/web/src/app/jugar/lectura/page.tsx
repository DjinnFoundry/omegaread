'use client';

/**
 * Ruta de lectura adaptativa.
 *
 * Flujo:
 * 1. Si no tiene perfil completo -> FormularioPerfil (padre)
 * 2. Si no tiene intereses -> SelectorIntereses (nino)
 * 3. Si no tiene baseline -> TestBaseline
 * 4. Si tiene todo -> "Listo para leer" con nivel mostrado
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import {
  obtenerEstadoLectura,
  type EstadoFlujoLectura,
  type DatosEstudianteLectura,
} from '@/server/actions/lectura-flow-actions';
import FormularioPerfil from '@/components/perfil/FormularioPerfil';
import SelectorIntereses from '@/components/perfil/SelectorIntereses';
import TestBaseline from '@/components/baseline/TestBaseline';

export default function LecturaPage() {
  const { estudiante } = useStudentProgress();
  const [estado, setEstado] = useState<EstadoFlujoLectura | null>(null);
  const [datosEstudiante, setDatosEstudiante] = useState<DatosEstudianteLectura | null>(null);
  const [cargando, setCargando] = useState(true);
  const cargaInicial = useRef(false);

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

  // ─── Paso 4: Listo para leer ───
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <div className="animate-scale-in text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="mt-4 text-2xl font-extrabold text-texto">
          Listo para leer, {datosEstudiante.nombre}!
        </h1>
        <p className="mt-2 text-base text-texto-suave max-w-xs mx-auto">
          Tu nivel de lectura esta preparado. Pronto tendras historias personalizadas.
        </p>

        <div className="mt-6 rounded-2xl bg-superficie border-2 border-neutro/10 p-5 shadow-sm max-w-xs mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Nivel de lectura</span>
            <span className="text-xl font-bold text-turquesa">
              {estado.nivelLectura}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Confianza</span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              estado.confianza === 'alto' ? 'bg-bosque/10 text-bosque' :
              estado.confianza === 'medio' ? 'bg-amarillo/20 text-taller' :
              'bg-neutro/10 text-texto-suave'
            }`}>
              {estado.confianza === 'alto' ? 'Alta' : estado.confianza === 'medio' ? 'Media' : 'Baja'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-texto-suave">Intereses</span>
            <span className="text-sm text-texto">
              {datosEstudiante.intereses.length} temas
            </span>
          </div>
        </div>

        <p className="mt-6 text-xs text-texto-suave">
          Sprint 2: generacion de historias personalizadas
        </p>
      </div>
    </main>
  );
}
