'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hablar } from '@/lib/audio/tts';
import { acierto as sonidoAcierto, error as sonidoError } from '@/lib/audio/sonidos';
import { BarraProgreso } from '@/components/ui/BarraProgreso';
import { Estrellas } from '@/components/ui/Estrellas';
import { Celebracion } from '@/components/ui/Celebracion';
import { BotonGrande } from '@/components/ui/BotonGrande';
import {
  ORDEN_SILABAS,
  PRONUNCIACION_SILABA,
  SesionSilabasTracker,
  generarEjercicioConstruirPalabra,
  generarEjercicioFusionSilabica,
  generarEjercicioSonidoSilaba,
  type Silaba,
} from '@/lib/actividades/generadorSilabas';

type ActividadSilabas = 'fusion' | 'sonido' | 'palabra';

const CICLO_ACTIVIDADES: ActividadSilabas[] = ['fusion', 'sonido', 'palabra'];
const DURACION_MAX_MS = 12 * 60 * 1000;
const OBJETIVO_SILABAS_SESION = 3;

type EjercicioSilabas =
  | ReturnType<typeof generarEjercicioFusionSilabica>
  | ReturnType<typeof generarEjercicioSonidoSilaba>
  | ReturnType<typeof generarEjercicioConstruirPalabra>;

export interface RespuestaSesionSilabas {
  silaba: Silaba;
  actividad: ActividadSilabas;
  correcto: boolean;
  tiempoMs: number;
}

export interface ResumenSesionSilabas {
  silabasDominadas: Silaba[];
  totalRespuestas: number;
  progresoSesion: number;
}

export interface SesionSilabasProps {
  nombreNino?: string;
  silabaInicial?: Silaba;
  silabasYaDominadas?: string[];
  onRespuesta?: (
    respuesta: RespuestaSesionSilabas,
  ) => Promise<{ dominada: boolean } | void> | { dominada: boolean } | void;
  onSilabaDominada?: (silaba: Silaba) => void;
  onEstrella?: () => void;
  onTerminar?: (resumen: ResumenSesionSilabas) => void;
  className?: string;
}

function obtenerSiguienteSilaba(dominadas: Set<string>): Silaba | null {
  return ORDEN_SILABAS.find((silaba) => !dominadas.has(silaba)) ?? null;
}

function obtenerSilabaInicial(
  silabaInicial: Silaba | undefined,
  silabasYaDominadas: string[],
): Silaba {
  if (silabaInicial) return silabaInicial;
  const dominadas = new Set(silabasYaDominadas);
  return obtenerSiguienteSilaba(dominadas) ?? ORDEN_SILABAS[0];
}

export function SesionSilabas({
  nombreNino = 'amiguito',
  silabaInicial,
  silabasYaDominadas = [],
  onRespuesta,
  onSilabaDominada,
  onEstrella,
  onTerminar,
  className = '',
}: SesionSilabasProps) {
  const [tracker] = useState(() => new SesionSilabasTracker());
  const [silabaActual, setSilabaActual] = useState<Silaba>(() =>
    obtenerSilabaInicial(silabaInicial, silabasYaDominadas),
  );
  const [actividadIdx, setActividadIdx] = useState(0);
  const [ejercicioKey, setEjercicioKey] = useState(0);
  const [estrellas, setEstrellas] = useState(0);
  const [dominadasSesion, setDominadasSesion] = useState<Silaba[]>([]);
  const [seleccion, setSeleccion] = useState<Silaba | null>(null);
  const [estado, setEstado] = useState<'jugando' | 'correcto' | 'incorrecto'>('jugando');
  const [bloqueado, setBloqueado] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [mostrarCelebracion, setMostrarCelebracion] = useState(false);
  const [finalizada, setFinalizada] = useState(false);

  const inicioRef = useRef(0);
  const tiempoRespuestaRef = useRef(0);
  const respuestasRef = useRef<RespuestaSesionSilabas[]>([]);
  const finalizadaRef = useRef(false);

  const actividadActual = CICLO_ACTIVIDADES[actividadIdx % CICLO_ACTIVIDADES.length];

  const ejercicio = useMemo<EjercicioSilabas>(() => {
    const _seed = ejercicioKey;
    switch (actividadActual) {
      case 'fusion':
        return generarEjercicioFusionSilabica(silabaActual);
      case 'sonido':
        return generarEjercicioSonidoSilaba(silabaActual);
      case 'palabra':
        return generarEjercicioConstruirPalabra(silabaActual, tracker);
    }
  }, [actividadActual, silabaActual, ejercicioKey, tracker]);

  const silabaCorrecta = useMemo<Silaba>(() => {
    if ('silabaFaltante' in ejercicio) return ejercicio.silabaFaltante;
    return ejercicio.silabaCorrecta;
  }, [ejercicio]);

  const finalizarSesion = useCallback(() => {
    if (finalizadaRef.current) return;
    finalizadaRef.current = true;
    setFinalizada(true);
    setMostrarCelebracion(true);
    hablar(`¡Excelente ${nombreNino}! ¡Avanzaste en sílabas!`);

    onTerminar?.({
      silabasDominadas: dominadasSesion,
      totalRespuestas: respuestasRef.current.length,
      progresoSesion: dominadasSesion.length / OBJETIVO_SILABAS_SESION,
    });
  }, [dominadasSesion, nombreNino, onTerminar]);

  useEffect(() => {
    const inicio = Date.now();
    inicioRef.current = inicio;
    tiempoRespuestaRef.current = inicio;

    const interval = setInterval(() => {
      const transcurrido = Date.now() - inicioRef.current;
      setTiempoTranscurrido(transcurrido);
      if (transcurrido >= DURACION_MAX_MS) {
        finalizarSesion();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [finalizarSesion]);

  useEffect(() => {
    if (finalizada) return;

    const timer = setTimeout(() => {
      if (actividadActual === 'fusion' && 'consonante' in ejercicio) {
        hablar(`Si juntamos ${ejercicio.consonante} con ${ejercicio.vocal}, ¿qué sílaba sale?`);
      } else if (actividadActual === 'sonido') {
        hablar(`Escucha: ${PRONUNCIACION_SILABA[silabaActual]}`);
      } else if (actividadActual === 'palabra' && 'palabra' in ejercicio) {
        hablar(`Completa la palabra: ${ejercicio.palabra.pronunciacion}`);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [actividadActual, ejercicio, silabaActual, finalizada]);

  const avanzarEjercicio = useCallback(() => {
    setActividadIdx((idx) => idx + 1);
    setEjercicioKey((k) => k + 1);
    setSeleccion(null);
    setEstado('jugando');
    setBloqueado(false);
    tiempoRespuestaRef.current = Date.now();
  }, []);

  const manejarRespuesta = useCallback(
    async (opcion: Silaba) => {
      if (bloqueado || finalizadaRef.current) return;

      setBloqueado(true);
      setSeleccion(opcion);
      const correcto = opcion === silabaCorrecta;
      const tiempoMs = Date.now() - tiempoRespuestaRef.current;
      const respuesta: RespuestaSesionSilabas = {
        silaba: silabaActual,
        actividad: actividadActual,
        correcto,
        tiempoMs,
      };
      respuestasRef.current.push(respuesta);

      setEstado(correcto ? 'correcto' : 'incorrecto');
      if (correcto) {
        sonidoAcierto();
        hablar(`¡Muy bien! ${silabaCorrecta}`);
      } else {
        sonidoError();
        hablar(`¡Casi! Era ${silabaCorrecta}`);
      }

      let dominada = false;
      try {
        const resultado = await onRespuesta?.(respuesta);
        dominada = Boolean(
          resultado &&
            typeof resultado === 'object' &&
            'dominada' in resultado &&
            resultado.dominada,
        );
      } catch {
        dominada = false;
      }

      setTimeout(() => {
        if (!correcto || !dominada) {
          avanzarEjercicio();
          return;
        }

        if (!dominadasSesion.includes(silabaActual)) {
          const nuevasDominadas = [...dominadasSesion, silabaActual];
          setDominadasSesion(nuevasDominadas);
          setEstrellas((e) => e + 1);
          onEstrella?.();
          onSilabaDominada?.(silabaActual);

          if (nuevasDominadas.length >= OBJETIVO_SILABAS_SESION) {
            finalizarSesion();
            return;
          }

          const dominadasGlobales = new Set<string>([
            ...silabasYaDominadas,
            ...nuevasDominadas,
          ]);
          const siguiente = obtenerSiguienteSilaba(dominadasGlobales);
          if (!siguiente) {
            finalizarSesion();
            return;
          }

          setSilabaActual(siguiente);
          setActividadIdx(0);
          setEjercicioKey((k) => k + 1);
          setSeleccion(null);
          setEstado('jugando');
          setBloqueado(false);
          tiempoRespuestaRef.current = Date.now();
          return;
        }

        avanzarEjercicio();
      }, correcto ? 900 : 1200);
    },
    [
      bloqueado,
      silabaCorrecta,
      silabaActual,
      actividadActual,
      onRespuesta,
      avanzarEjercicio,
      dominadasSesion,
      onEstrella,
      onSilabaDominada,
      silabasYaDominadas,
      finalizarSesion,
    ],
  );

  const progresoSesion = Math.min(1, dominadasSesion.length / OBJETIVO_SILABAS_SESION);
  const minutosRestantes = Math.max(0, Math.ceil((DURACION_MAX_MS - tiempoTranscurrido) / 60000));

  return (
    <div className={`flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4 ${className}`}>
      <div className="w-full flex items-center justify-between gap-3">
        <Estrellas cantidad={estrellas} max={5} />
        <div
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: '#FFF9F0', color: '#8D6E63' }}
          aria-label={`${minutosRestantes} minutos restantes`}
        >
          ⏱️ {minutosRestantes}m
        </div>
      </div>

      <BarraProgreso progreso={progresoSesion} color="#A28BD4" />

      <div className="w-full rounded-2xl bg-superficie p-3 text-center shadow-sm">
        <p className="text-xs font-semibold text-texto-suave">Sílaba actual</p>
        <p className="mt-1 text-3xl font-extrabold text-montana">{silabaActual}</p>
        <p className="text-xs text-texto-suave mt-1">
          Dominadas en esta sesión: {dominadasSesion.length}/{OBJETIVO_SILABAS_SESION}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 w-full min-h-[320px]">
        {!finalizada && actividadActual === 'fusion' && 'consonante' in ejercicio && (
          <>
            <p className="text-lg font-bold text-texto">Fusiona para crear la sílaba</p>
            <div className="flex items-center gap-3 text-4xl font-extrabold text-montana">
              <span>{ejercicio.consonante}</span>
              <span className="text-texto-suave">+</span>
              <span>{ejercicio.vocal}</span>
              <span className="text-texto-suave">=</span>
              <span>?</span>
            </div>
          </>
        )}

        {!finalizada && actividadActual === 'sonido' && (
          <>
            <p className="text-lg font-bold text-texto">Escucha y elige</p>
            <BotonGrande
              variante="secundario"
              icono="🔊"
              texto="Repetir sonido"
              tamano="pequeno"
              onClick={() => hablar(PRONUNCIACION_SILABA[silabaActual])}
              deshabilitado={bloqueado}
              ariaLabel="Repetir el sonido de la sílaba"
            />
          </>
        )}

        {!finalizada && actividadActual === 'palabra' && 'palabra' in ejercicio && (
          <>
            <p className="text-lg font-bold text-texto">Completa la palabra</p>
            <div className="text-6xl" role="presentation">
              {ejercicio.palabra.emoji}
            </div>
            <p className="text-3xl font-extrabold text-texto tracking-wide">
              {ejercicio.palabraConHueco}
            </p>
          </>
        )}

        {!finalizada && (
          <div className="grid grid-cols-3 gap-3 w-full">
            {ejercicio.opciones.map((opcion) => {
              const esSeleccionada = seleccion === opcion;
              const estiloCorrecto = esSeleccionada && estado === 'correcto';
              const estiloError = esSeleccionada && estado === 'incorrecto';

              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => void manejarRespuesta(opcion)}
                  disabled={bloqueado}
                  className="h-[72px] rounded-2xl border-2 font-extrabold text-xl transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    backgroundColor: estiloCorrecto
                      ? '#7BC67E'
                      : estiloError
                        ? '#FFB5B5'
                        : '#FFF9F0',
                    color: estiloCorrecto || estiloError ? 'white' : '#5D4037',
                    borderColor: estiloCorrecto
                      ? '#4CAF50'
                      : estiloError
                        ? '#FF6B6B'
                        : '#E8E0D8',
                  }}
                >
                  {opcion}
                </button>
              );
            })}
          </div>
        )}

        {finalizada && (
          <div className="text-center">
            <div className="text-7xl mb-3" role="presentation">
              🎉
            </div>
            <p className="text-2xl font-bold text-texto">¡Excelente, {nombreNino}!</p>
            <p className="text-base text-texto-suave mt-1">
              Avanzaste con nuevas sílabas.
            </p>
          </div>
        )}
      </div>

      <Celebracion visible={mostrarCelebracion} onClose={() => setMostrarCelebracion(false)} />
    </div>
  );
}

