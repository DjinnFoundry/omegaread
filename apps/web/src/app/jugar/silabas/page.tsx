'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mascota, type EstadoMascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';
import { AuthGuardNino } from '@/components/ui/AuthGuardNino';
import {
  SesionSilabas,
  type ResumenSesionSilabas,
  type RespuestaSesionSilabas,
} from '@/components/actividades/silabas/SesionSilabas';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { ORDEN_SILABAS, type Silaba } from '@/lib/actividades/generadorSilabas';
import {
  actualizarProgresoInmediato,
  actualizarSesionEnCurso,
  finalizarSesionDB,
  guardarRespuestaIndividual,
  iniciarSesion,
} from '@/server/actions/session-actions';

export default function SilabasPage() {
  const router = useRouter();
  const {
    estudiante,
    progress,
    addEstrellas,
    addSticker,
    marcarSilabaDominada,
  } = useStudentProgress();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [estadoMascota, setEstadoMascota] = useState<EstadoMascota>('feliz');
  const [dialogoMascota, setDialogoMascota] = useState('');

  const inicioRef = useRef(0);
  const estrellasEnSesionRef = useRef(0);

  useEffect(() => {
    if (!estudiante) {
      const timer = setTimeout(() => {
        const saved = sessionStorage.getItem('estudianteActivo');
        if (!saved) {
          router.push('/jugar');
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [estudiante, router]);

  useEffect(() => {
    if (!estudiante) return;

    let cancelled = false;
    iniciarSesion({
      studentId: estudiante.id,
      tipoActividad: 'silabas',
      modulo: 'lectura-inicial',
    })
      .then((result) => {
        if (!cancelled && result.ok) {
          setSessionId(result.sessionId);
          setReady(true);
          inicioRef.current = Date.now();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('NEXT_REDIRECT') || msg.includes('no autorizado') || msg.includes('Acceso')) {
            setAuthFailed(true);
          } else {
            setReady(true);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [estudiante]);

  const onRespuesta = useCallback(
    async (respuesta: RespuestaSesionSilabas) => {
      if (!estudiante) return { dominada: false };

      if (respuesta.correcto) {
        setEstadoMascota('celebrando');
        setDialogoMascota('¡Muy bien!');
      } else {
        setEstadoMascota('pensando');
        setDialogoMascota('¡Vamos de nuevo!');
      }
      setTimeout(() => {
        setEstadoMascota('feliz');
        setDialogoMascota('');
      }, 1200);

      if (!sessionId) return { dominada: false };

      const ejecutarPersistencia = async () => {
        await guardarRespuestaIndividual({
          sessionId,
          studentId: estudiante.id,
          ejercicioId: `silaba-${respuesta.silaba}-${respuesta.actividad}-${Date.now()}`,
          tipoEjercicio: `silabas-${respuesta.actividad}`,
          pregunta: `Actividad ${respuesta.actividad} con sílaba ${respuesta.silaba}`,
          respuesta: respuesta.correcto ? respuesta.silaba : 'error',
          respuestaCorrecta: respuesta.silaba,
          correcta: respuesta.correcto,
          tiempoRespuestaMs: respuesta.tiempoMs,
        });

        const progresoResultado = await actualizarProgresoInmediato({
          studentId: estudiante.id,
          skillId: `silaba-${respuesta.silaba.toLowerCase()}`,
          categoria: 'silabas',
          correcto: respuesta.correcto,
          tiempoRespuestaMs: respuesta.tiempoMs,
        });

        if (progresoResultado.dominada) {
          marcarSilabaDominada(respuesta.silaba);
        }

        return { dominada: progresoResultado.dominada };
      };

      try {
        return await ejecutarPersistencia();
      } catch {
        try {
          await new Promise((r) => setTimeout(r, 800));
          return await ejecutarPersistencia();
        } catch {
          return { dominada: false };
        }
      }
    },
    [estudiante, sessionId, marcarSilabaDominada],
  );

  const onEstrella = useCallback(() => {
    estrellasEnSesionRef.current += 1;
    addEstrellas(1);

    if (sessionId && estudiante) {
      actualizarSesionEnCurso({
        sessionId,
        studentId: estudiante.id,
        estrellasGanadas: estrellasEnSesionRef.current,
      }).catch(() => {});
    }
  }, [sessionId, estudiante, addEstrellas]);

  const onSilabaDominada = useCallback((silaba: Silaba) => {
    setEstadoMascota('celebrando');
    setDialogoMascota(`¡Dominas ${silaba}!`);
    setTimeout(() => {
      setEstadoMascota('feliz');
      setDialogoMascota('');
    }, 1600);
  }, []);

  const onTerminar = useCallback(
    async (_resumen: ResumenSesionSilabas) => {
      const sticker = ['📚', '🧠', '🎓', '✨'][Math.floor(Math.random() * 4)];
      addSticker(sticker, 'Sticker de sílabas');

      if (sessionId && estudiante) {
        try {
          await finalizarSesionDB({
            sessionId,
            duracionSegundos: Math.round((Date.now() - inicioRef.current) / 1000),
            completada: true,
            estrellasGanadas: estrellasEnSesionRef.current,
            stickerGanado: sticker,
            studentId: estudiante.id,
          });
        } catch {
          // Best effort
        }
      }

      setTimeout(() => {
        router.push('/jugar/mapa');
      }, 3500);
    },
    [sessionId, estudiante, addSticker, router],
  );

  if (authFailed) {
    return <AuthGuardNino tipo="sin-sesion" />;
  }

  if (!estudiante || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="flex flex-col items-center gap-4">
          <Mascota estado="feliz" size="lg" />
          <div className="text-2xl animate-pulse text-texto-suave">Preparando sílabas...</div>
        </div>
      </main>
    );
  }

  const silabaInicial = (progress.silabaActual as Silaba) || ORDEN_SILABAS[0];

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => router.push('/jugar/mapa')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-superficie shadow-sm text-xl active:scale-90 transition-transform"
        >
          🏠
        </button>
      </div>

      <div className="flex flex-col items-center px-4 pt-2 pb-1">
        {dialogoMascota && (
          <MascotaDialogo
            texto={dialogoMascota}
            onFinish={() => setDialogoMascota('')}
            visible={!!dialogoMascota}
          />
        )}
        <Mascota
          estado={estadoMascota}
          size="sm"
          tipo={estudiante.mascotaTipo ?? undefined}
          nombre={estudiante.mascotaNombre ?? undefined}
        />
      </div>

      <div className="flex-1 px-4 pb-4">
        <SesionSilabas
          nombreNino={estudiante.nombre}
          silabaInicial={silabaInicial}
          silabasYaDominadas={progress.silabasDominadas}
          onRespuesta={onRespuesta}
          onEstrella={onEstrella}
          onSilabaDominada={onSilabaDominada}
          onTerminar={onTerminar}
        />
      </div>
    </main>
  );
}
