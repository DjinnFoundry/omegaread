'use client';

/**
 * Página de sesión de vocales
 * Controlador principal de la actividad de vocales
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';
import { BarraProgreso } from '@/components/ui/BarraProgreso';
import { Celebracion } from '@/components/ui/Celebracion';
import { StickerReveal } from '@/components/gamificacion/StickerReveal';
import { ReconocerVocal } from '@/components/actividades/vocales/ReconocerVocal';
import { SonidoVocal } from '@/components/actividades/vocales/SonidoVocal';
import { CompletarVocal } from '@/components/actividades/vocales/CompletarVocal';
import { generarEjercicioReconocimiento, generarEjercicioSonido, generarEjercicioCompletar, type EjercicioReconocimiento, type EjercicioSonido, type EjercicioCompletar, type NivelDificultad } from '@/lib/actividades/generadorVocales';
import { hablar } from '@/lib/audio/tts';
import { sonidos } from '@/lib/audio/sonidos';

type Vocal = 'A' | 'E' | 'I' | 'O' | 'U';
type TipoActividad = 'reconocer' | 'sonido' | 'completar';
type MascotaEstado = 'feliz' | 'pensando' | 'celebrando' | 'triste';

interface Respuesta {
  vocal: Vocal;
  actividad: TipoActividad;
  correcta: boolean;
  tiempoMs: number;
}

const VOCALES: Vocal[] = ['A', 'E', 'I', 'O', 'U'];
const ACTIVIDADES: TipoActividad[] = ['reconocer', 'sonido', 'completar'];
const DURACION_MAX_MS = 10 * 60 * 1000; // 10 minutos

const STICKERS_POSIBLES = ['🐬', '🦋', '🌟', '🐢', '🦄', '🐙', '🦕', '🍀', '🎨', '🌈'];

export default function VocalesPage() {
  const router = useRouter();
  const [vocalActual, setVocalActual] = useState<Vocal>('A');
  const [actividadActual, setActividadActual] = useState<TipoActividad>('reconocer');
  const [actividadIndex, setActividadIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [dialogo, setDialogo] = useState('');
  const [mascotaEstado, setMascotaEstado] = useState<MascotaEstado>('feliz');
  const [mostrarCelebracion, setMostrarCelebracion] = useState(false);
  const [mostrarSticker, setMostrarSticker] = useState(false);
  const [stickerEmoji, setStickerEmoji] = useState('');
  const [sesionTerminada, setSesionTerminada] = useState(false);
  const [inicioSesion] = useState(Date.now());
  const [ejercicioActual, setEjercicioActual] = useState<EjercicioReconocimiento | null>(null);
  const [ejercicioSonido, setEjercicioSonido] = useState<EjercicioSonido | null>(null);
  const [ejercicioCompletar, setEjercicioCompletar] = useState<EjercicioCompletar | null>(null);
  const [tiempoInicioEjercicio, setTiempoInicioEjercicio] = useState(Date.now());

  // Generar ejercicio al cambiar actividad
  useEffect(() => {
    generarNuevoEjercicio();
    setTiempoInicioEjercicio(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocalActual, actividadActual, actividadIndex]);

  // Auto-cierre por tiempo
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - inicioSesion >= DURACION_MAX_MS) {
        finalizarSesion();
      }
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicioSesion]);

  // Introducción
  useEffect(() => {
    setDialogo(`¡Hoy vamos a jugar con las vocales! Empezamos con la ${vocalActual}`);
  }, []);

  function generarNuevoEjercicio() {
    const nivel = calcularNivel(vocalActual);
    switch (actividadActual) {
      case 'reconocer':
        setEjercicioActual(generarEjercicioReconocimiento(vocalActual, nivel));
        break;
      case 'sonido':
        setEjercicioSonido(generarEjercicioSonido(vocalActual));
        break;
      case 'completar':
        setEjercicioCompletar(generarEjercicioCompletar(vocalActual));
        break;
    }
  }

  function calcularNivel(vocal: Vocal): NivelDificultad {
    const intentos = respuestas.filter((r) => r.vocal === vocal);
    if (intentos.length < 3) return 1;
    const aciertos = intentos.filter((r) => r.correcta).length;
    return (aciertos / intentos.length > 0.7 ? 2 : 1) as NivelDificultad;
  }

  function calcularMastery(vocal: Vocal): number {
    const ultimos = respuestas.filter((r) => r.vocal === vocal).slice(-5);
    if (ultimos.length < 5) return 0;
    return ultimos.filter((r) => r.correcta).length / ultimos.length;
  }

  function handleAcierto() {
    const tiempoMs = Date.now() - tiempoInicioEjercicio;
    const nuevaRespuesta: Respuesta = {
      vocal: vocalActual,
      actividad: actividadActual,
      correcta: true,
      tiempoMs,
    };
    const nuevasRespuestas = [...respuestas, nuevaRespuesta];
    setRespuestas(nuevasRespuestas);

    setMascotaEstado('celebrando');
    setMostrarCelebracion(true);
    setTimeout(() => setMostrarCelebracion(false), 1500);

    // Comprobar mastery
    const mastery = calcularMastery(vocalActual);
    if (mastery >= 0.9 && nuevasRespuestas.filter((r) => r.vocal === vocalActual).length >= 5) {
      // Vocal dominada — pasar a la siguiente
      const indexVocal = VOCALES.indexOf(vocalActual);
      if (indexVocal < VOCALES.length - 1) {
        setTimeout(() => {
          const siguiente = VOCALES[indexVocal + 1];
          setVocalActual(siguiente);
          setActividadActual('reconocer');
          setActividadIndex(0);
          setDialogo(`¡Genial! Ya dominas la ${vocalActual}. ¡Ahora vamos con la ${siguiente}!`);
          setMascotaEstado('celebrando');
        }, 2000);
        return;
      } else {
        // Todas las vocales dominadas
        finalizarSesion();
        return;
      }
    }

    // Siguiente ejercicio (rotar actividades)
    setTimeout(() => {
      avanzarActividad();
    }, 2000);
  }

  function handleError() {
    const tiempoMs = Date.now() - tiempoInicioEjercicio;
    setRespuestas((prev) => [
      ...prev,
      { vocal: vocalActual, actividad: actividadActual, correcta: false, tiempoMs },
    ]);
    setMascotaEstado('pensando');
    setDialogo('¡Casi! Inténtalo otra vez');
    setTimeout(() => setMascotaEstado('feliz'), 1500);
  }

  function avanzarActividad() {
    const nextIndex = (ACTIVIDADES.indexOf(actividadActual) + 1) % ACTIVIDADES.length;
    setActividadActual(ACTIVIDADES[nextIndex]);
    setActividadIndex((prev) => prev + 1);
    setMascotaEstado('feliz');
  }

  function finalizarSesion() {
    setSesionTerminada(true);
    const sticker = STICKERS_POSIBLES[Math.floor(Math.random() * STICKERS_POSIBLES.length)];
    setStickerEmoji(sticker);
    setMostrarSticker(true);
    setDialogo('¡Lo hiciste genial! ¡Mira tu sticker nuevo!');
    setMascotaEstado('celebrando');

    // Guardar sesión (fire and forget)
    guardarResultados(sticker);
  }

  async function guardarResultados(sticker: string) {
    const estStr = sessionStorage.getItem('estudianteActivo');
    if (!estStr) return;
    const est = JSON.parse(estStr);

    try {
      const { guardarSesion } = await import('@/server/actions/student-actions');
      await guardarSesion({
        studentId: est.id,
        tipoActividad: 'vocales',
        modulo: 'pre-lectura',
        duracionSegundos: Math.round((Date.now() - inicioSesion) / 1000),
        completada: true,
        estrellasGanadas: respuestas.filter((r) => r.correcta).length,
        stickerGanado: sticker,
        respuestas: respuestas.map((r, i) => ({
          ejercicioId: `vocal-${r.vocal}-${r.actividad}-${i}`,
          tipoEjercicio: r.actividad,
          pregunta: `${r.actividad} vocal ${r.vocal}`,
          respuesta: r.correcta ? r.vocal : 'error',
          respuestaCorrecta: r.vocal,
          correcta: r.correcta,
          tiempoRespuestaMs: r.tiempoMs,
        })),
      });
    } catch {
      console.warn('No se pudieron guardar los resultados (offline?)');
    }
  }

  // Progreso general
  const vocalesAttempted = VOCALES.filter((v) =>
    respuestas.some((r) => r.vocal === v)
  ).length;
  const progreso = vocalesAttempted / VOCALES.length;

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      {/* Header con mascota y progreso */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => router.push('/jugar/mapa')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-superficie shadow-sm text-xl active:scale-90 transition-transform"
        >
          🏠
        </button>
        <div className="flex-1">
          <BarraProgreso progreso={progreso} color="bg-bosque" />
        </div>
        <span className="text-sm font-bold text-texto-suave">
          {vocalActual}
        </span>
      </div>

      {/* Mascota + diálogo */}
      <div className="flex items-end gap-3 px-4 pt-2 pb-2">
        <Mascota tipo="gato" estado={mascotaEstado} size="sm" />
        {dialogo && (
          <MascotaDialogo
            texto={dialogo}
            onFinish={() => setDialogo('')}
          />
        )}
      </div>

      {/* Área de actividad */}
      <div className="flex-1 px-4 pb-4">
        {!sesionTerminada && actividadActual === 'reconocer' && ejercicioActual && (
          <ReconocerVocal
            vocal={ejercicioActual.vocal}
            distractores={ejercicioActual.distractores}
            onAcierto={handleAcierto}
            onError={handleError}
          />
        )}
        {!sesionTerminada && actividadActual === 'sonido' && ejercicioSonido && (
          <SonidoVocal
            vocalCorrecta={ejercicioSonido.vocalCorrecta}
            opciones={ejercicioSonido.opciones}
            onAcierto={handleAcierto}
            onError={handleError}
          />
        )}
        {!sesionTerminada && actividadActual === 'completar' && ejercicioCompletar && (
          <CompletarVocal
            palabra={ejercicioCompletar.palabra}
            opciones={ejercicioCompletar.opciones}
            onAcierto={handleAcierto}
            onError={handleError}
          />
        )}

        {/* Fin de sesión */}
        {sesionTerminada && !mostrarSticker && (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <Mascota tipo="gato" estado="celebrando" size="lg" />
            <p className="text-2xl font-bold text-texto text-center">
              ¡Hasta luego! ¡Fue divertido!
            </p>
            <button
              onClick={() => router.push('/jugar/mapa')}
              className="rounded-3xl bg-turquesa px-8 py-4 text-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
            >
              🏠 Volver al mapa
            </button>
          </div>
        )}
      </div>

      {/* Overlays */}
      <Celebracion visible={mostrarCelebracion} onClose={() => setMostrarCelebracion(false)} />
      <StickerReveal
        emoji={stickerEmoji}
        nombre="Sticker de sesión"
        visible={mostrarSticker}
        onClose={() => {
          setMostrarSticker(false);
        }}
      />
    </main>
  );
}
