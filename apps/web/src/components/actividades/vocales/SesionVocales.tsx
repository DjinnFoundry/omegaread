'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hablar } from '@/lib/audio/tts';
import { BarraProgreso } from '@/components/ui/BarraProgreso';
import { Estrellas } from '@/components/ui/Estrellas';
import { Celebracion } from '@/components/ui/Celebracion';
import { ReconocerVocal } from './ReconocerVocal';
import { SonidoVocal } from './SonidoVocal';
import { CompletarVocal } from './CompletarVocal';
import {
  MasteryTracker,
  type TipoActividad,
  type ResumenSesion,
} from '@/lib/actividades/masteryTracker';
import {
  generarEjercicioReconocimiento,
  generarEjercicioSonido,
  generarEjercicioCompletar,
  SesionTracker,
  ORDEN_VOCALES,
  type Vocal,
  type NivelDificultad,
} from '@/lib/actividades/generadorVocales';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

/** Fase de la sesión */
type FaseSesion = 'saludo' | 'actividad' | 'transicion-vocal' | 'celebracion-final';

/** Actividad actual */
type ActividadTipo = 'reconocimiento' | 'sonido' | 'completar';

/** Orden cíclico de actividades */
const CICLO_ACTIVIDADES: ActividadTipo[] = ['reconocimiento', 'sonido', 'completar'];

/** Duración máxima de sesión en ms (10 minutos) */
const DURACION_MAX_MS = 10 * 60 * 1000;

/** Stickers de premio */
const STICKERS = ['🦁', '🐬', '🦋', '🌈', '🚀', '🎸', '🦄', '🐉', '🌟', '🎪'];

/**
 * Props de SesionVocales.
 */
export interface SesionVocalesProps {
  /** Nombre del niño (para mensajes personalizados) */
  nombreNino?: string;
  /** Callback cuando la sesión termina */
  onTerminar?: (resumen: ResumenSesion) => void;
  /** Callback cuando el niño responde (para guardado progresivo) */
  onRespuesta?: (datos: {
    vocal: string;
    actividad: string;
    correcto: boolean;
    tiempoMs: number;
  }) => void;
  /** Callback cuando el niño gana una estrella */
  onEstrella?: () => void;
  /** Callback cuando una vocal se marca como dominada */
  onVocalDominada?: (vocal: string) => void;
  /** Vocal inicial (default: primera no dominada) */
  vocalInicial?: Vocal;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Controlador de sesión de vocales.
 *
 * Gestiona el flujo completo:
 * 1. La mascota saluda y explica
 * 2. Alterna entre las 3 actividades
 * 3. Tracking de aciertos/errores por vocal
 * 4. Mastery: ≥90% en una vocal (mín 5 intentos) → pasa a la siguiente
 * 5. Orden: A → E → I → O → U
 * 6. Auto-cierre a los 10 minutos
 * 7. Al terminar: celebración + sticker
 */
export function SesionVocales({
  nombreNino = 'amiguito',
  onTerminar,
  onRespuesta,
  onEstrella,
  onVocalDominada,
  vocalInicial,
  className = '',
}: SesionVocalesProps) {
  // ── Estado central ──
  const [fase, setFase] = useState<FaseSesion>('saludo');
  const [vocalActual, setVocalActual] = useState<Vocal>(vocalInicial ?? 'A');
  const [actividadIdx, setActividadIdx] = useState(0);
  const [estrellas, setEstrellas] = useState(0);
  const [stickerGanado, setStickerGanado] = useState<string | null>(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [mostrarCelebracion, setMostrarCelebracion] = useState(false);
  const [nivelDificultad, setNivelDificultad] = useState<NivelDificultad>(1);

  // ── Ejercicio actual ──
  const [ejercicioKey, setEjercicioKey] = useState(0);

  // ── Refs estables ──
  const masteryRef = useRef(new MasteryTracker());
  const sesionTrackerRef = useRef(new SesionTracker());
  const inicioRef = useRef(Date.now());
  const tiempoRespuestaRef = useRef(Date.now());

  // ── Actividad actual (derivada) ──
  const actividadActual = CICLO_ACTIVIDADES[actividadIdx % CICLO_ACTIVIDADES.length];

  // ── Timer de sesión ──
  useEffect(() => {
    const interval = setInterval(() => {
      const transcurrido = Date.now() - inicioRef.current;
      setTiempoTranscurrido(transcurrido);

      if (transcurrido >= DURACION_MAX_MS) {
        finalizarSesion();
      }
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generar ejercicio actual ──
  const ejercicio = useMemo(() => {
    switch (actividadActual) {
      case 'reconocimiento':
        return generarEjercicioReconocimiento(vocalActual, nivelDificultad);
      case 'sonido':
        return generarEjercicioSonido(vocalActual);
      case 'completar':
        return generarEjercicioCompletar(vocalActual, sesionTrackerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocalActual, actividadActual, nivelDificultad, ejercicioKey]);

  // ── Saludo inicial ──
  useEffect(() => {
    if (fase === 'saludo') {
      const timer = setTimeout(() => {
        hablar(`¡Hola ${nombreNino}! ¡Vamos a aprender las vocales!`, {
          onEnd: () => {
            setTimeout(() => {
              hablar(`Empezamos con la ${vocalActual}`, {
                onEnd: () => {
                  setFase('actividad');
                  tiempoRespuestaRef.current = Date.now();
                },
              });
            }, 400);
          },
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fase, nombreNino, vocalActual]);

  // ── Finalizar sesión ──
  const finalizarSesion = useCallback(() => {
    const resumen = masteryRef.current.obtenerResumen();
    const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
    setStickerGanado(sticker);
    setFase('celebracion-final');
    setMostrarCelebracion(true);
    hablar(`¡Increíble ${nombreNino}! ¡Lo hiciste genial! ¡Ganaste un sticker!`);
    onTerminar?.(resumen);
  }, [nombreNino, onTerminar]);

  // ── Avanzar a siguiente ejercicio o vocal ──
  const avanzar = useCallback(() => {
    const mastery = masteryRef.current;
    const vocal = vocalActual;

    // ¿Mastery alcanzado en esta vocal?
    if (mastery.estaDominada(vocal)) {
      // Notificar vocal dominada
      onVocalDominada?.(vocal);

      // Buscar siguiente vocal no dominada
      const siguiente = mastery.siguienteVocal();

      if (!siguiente) {
        // ¡Todas dominadas! 🎉
        finalizarSesion();
        return;
      }

      // Transición a nueva vocal
      setFase('transicion-vocal');
      setMostrarCelebracion(true);
      setEstrellas((e) => e + 1);
      onEstrella?.();
      hablar(`¡Excelente! ¡Ya sabes la ${vocal}! Ahora vamos con la ${siguiente}`, {
        onEnd: () => {
          setMostrarCelebracion(false);
          setVocalActual(siguiente);
          setActividadIdx(0);
          setNivelDificultad(1);
          setEjercicioKey((k) => k + 1);
          setFase('actividad');
          tiempoRespuestaRef.current = Date.now();
        },
      });
    } else {
      // Siguiente actividad
      setActividadIdx((idx) => idx + 1);
      setEjercicioKey((k) => k + 1);
      tiempoRespuestaRef.current = Date.now();

      // Subir dificultad progresivamente
      const m = mastery.obtenerMastery(vocal);
      if (m.totalIntentos >= 3 && m.mastery >= 0.7 && nivelDificultad < 3) {
        setNivelDificultad((n) => Math.min(3, n + 1) as NivelDificultad);
      }
    }
  }, [vocalActual, nivelDificultad, finalizarSesion, onEstrella, onVocalDominada]);

  // ── Handlers de respuesta ──
  const manejarAcierto = useCallback(() => {
    const tiempoMs = Date.now() - tiempoRespuestaRef.current;
    masteryRef.current.registrar({
      vocal: vocalActual,
      actividad: actividadActual as TipoActividad,
      correcto: true,
      tiempoMs,
    });

    // Guardar respuesta progresivamente
    onRespuesta?.({
      vocal: vocalActual,
      actividad: actividadActual,
      correcto: true,
      tiempoMs,
    });

    // Avanzar tras un delay para que se vea el feedback
    setTimeout(avanzar, 300);
  }, [vocalActual, actividadActual, avanzar, onRespuesta]);

  const manejarError = useCallback(() => {
    const tiempoMs = Date.now() - tiempoRespuestaRef.current;
    masteryRef.current.registrar({
      vocal: vocalActual,
      actividad: actividadActual as TipoActividad,
      correcto: false,
      tiempoMs,
    });

    // Guardar respuesta progresivamente
    onRespuesta?.({
      vocal: vocalActual,
      actividad: actividadActual,
      correcto: false,
      tiempoMs,
    });

    // Resetear timer para siguiente intento
    tiempoRespuestaRef.current = Date.now();
  }, [vocalActual, actividadActual, onRespuesta]);

  // ── Progreso visual ──
  const progreso = useMemo(() => {
    const idxVocal = ORDEN_VOCALES.indexOf(vocalActual);
    const masteryActual = masteryRef.current.obtenerMastery(vocalActual).mastery;
    return (idxVocal + masteryActual) / ORDEN_VOCALES.length;
  }, [vocalActual, ejercicioKey]);

  // ── Timer visual ──
  const minutosRestantes = Math.max(
    0,
    Math.ceil((DURACION_MAX_MS - tiempoTranscurrido) / 60000),
  );

  // ── Render ──
  return (
    <div className={`flex flex-col items-center gap-4 w-full max-w-md mx-auto p-4 ${className}`}>
      {/* Header: estrellas + progreso + timer */}
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

      {/* Barra de progreso (sin números) */}
      <BarraProgreso progreso={progreso} color="#4ECDC4" />

      {/* Indicador de vocal actual */}
      <div className="flex items-center gap-2">
        {ORDEN_VOCALES.map((v) => {
          const dominada = masteryRef.current.estaDominada(v);
          const esActual = v === vocalActual && fase === 'actividad';
          return (
            <div
              key={v}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                text-sm font-bold transition-all duration-300
                ${esActual ? 'scale-125' : ''}
              `}
              style={{
                backgroundColor: dominada ? '#7BC67E' : esActual ? '#FFE66D' : '#E8E0D8',
                color: dominada ? 'white' : '#5D4037',
                outline: esActual ? '2px solid #FFC107' : undefined,
                outlineOffset: esActual ? '2px' : undefined,
              }}
              aria-label={`Vocal ${v}${dominada ? ' dominada' : esActual ? ' actual' : ''}`}
            >
              {dominada ? '✓' : v}
            </div>
          );
        })}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center w-full min-h-[300px]">
        {fase === 'saludo' && (
          <div className="text-center">
            <div className="text-6xl mb-4" role="presentation">🐱</div>
            <p className="text-xl font-bold" style={{ color: '#5D4037' }}>
              ¡Vamos a jugar!
            </p>
          </div>
        )}

        {fase === 'actividad' && ejercicio && (
          <>
            {actividadActual === 'reconocimiento' && 'vocal' in ejercicio && (
              <ReconocerVocal
                key={ejercicioKey}
                vocal={ejercicio.vocal}
                distractores={ejercicio.distractores}
                onAcierto={manejarAcierto}
                onError={manejarError}
              />
            )}

            {actividadActual === 'sonido' && 'vocalCorrecta' in ejercicio && 'opciones' in ejercicio && !('palabra' in ejercicio) && (
              <SonidoVocal
                key={ejercicioKey}
                vocalCorrecta={(ejercicio as { vocalCorrecta: Vocal; opciones: Vocal[] }).vocalCorrecta}
                opciones={(ejercicio as { vocalCorrecta: Vocal; opciones: Vocal[] }).opciones}
                onAcierto={manejarAcierto}
                onError={manejarError}
              />
            )}

            {actividadActual === 'completar' && 'palabra' in ejercicio && (
              <CompletarVocal
                key={ejercicioKey}
                palabra={ejercicio.palabra}
                opciones={ejercicio.opciones}
                onAcierto={manejarAcierto}
                onError={manejarError}
              />
            )}
          </>
        )}

        {fase === 'transicion-vocal' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce" role="presentation">🎉</div>
            <p className="text-xl font-bold" style={{ color: '#4CAF50' }}>
              ¡Vocal {vocalActual} dominada!
            </p>
          </div>
        )}

        {fase === 'celebracion-final' && (
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce" role="presentation">
              {stickerGanado ?? '🎉'}
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: '#5D4037' }}>
              ¡Increíble, {nombreNino}!
            </p>
            <p className="text-lg" style={{ color: '#8D6E63' }}>
              ¡Ganaste un sticker!
            </p>
          </div>
        )}
      </div>

      {/* Overlay de celebración */}
      <Celebracion
        visible={mostrarCelebracion}
        onClose={() => setMostrarCelebracion(false)}
      />
    </div>
  );
}
