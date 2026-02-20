'use client';

/**
 * Página de sesión de vocales.
 *
 * Usa el componente SesionVocales como única fuente de verdad
 * para la lógica de sesión y mastery. Esta página se encarga de:
 * - Integrar con el contexto de progreso del estudiante
 * - Guardar respuestas progresivamente en la DB
 * - Navegar al finalizar
 * - Gestionar la mascota como interfaz reactiva
 *
 * Maneja errores de auth gracefully redirigiendo a /jugar
 * en vez de crashear.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SesionVocales } from '@/components/actividades/vocales/SesionVocales';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { Mascota, type EstadoMascota } from '@/components/mascota/Mascota';
import { MascotaDialogo } from '@/components/mascota/MascotaDialogo';
import { AuthGuardNino } from '@/components/ui/AuthGuardNino';
import type { ResumenSesion } from '@/lib/actividades/masteryTracker';
import type { Vocal } from '@/lib/actividades/generadorVocales';
import {
  iniciarSesion,
  guardarRespuestaIndividual,
  actualizarProgresoInmediato,
  finalizarSesionDB,
  actualizarSesionEnCurso,
} from '@/server/actions/session-actions';

export default function VocalesPage() {
  const router = useRouter();
  const {
    estudiante,
    progress,
    addEstrellas,
    addSticker,
    marcarVocalDominada,
  } = useStudentProgress();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [estadoMascota, setEstadoMascota] = useState<EstadoMascota>('feliz');
  const [dialogoMascota, setDialogoMascota] = useState('');
  const inicioRef = useRef(Date.now());
  const estrellasEnSesionRef = useRef(0);
  const erroresConsecutivosRef = useRef(0);

  // Redirigir si no hay estudiante
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

  // Crear sesión en DB al montar (para guardado progresivo)
  useEffect(() => {
    if (!estudiante) return;

    let cancelled = false;
    iniciarSesion({
      studentId: estudiante.id,
      tipoActividad: 'vocales',
      modulo: 'pre-lectura',
    }).then((result) => {
      if (!cancelled && result.ok) {
        setSessionId(result.sessionId);
        setReady(true);
        inicioRef.current = Date.now();
      }
    }).catch((err) => {
      if (!cancelled) {
        // Si es error de auth/ownership, mostrar guard amigable
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NEXT_REDIRECT') || msg.includes('no autorizado') || msg.includes('Acceso')) {
          setAuthFailed(true);
        } else {
          // Si falla la DB por otra razón, permitir jugar sin guardado
          setReady(true);
        }
      }
    });

    return () => { cancelled = true; };
  }, [estudiante]);

  // ── Callback para guardar cada respuesta progresivamente ──
  const onRespuesta = useCallback(
    async (datos: {
      vocal: string;
      actividad: string;
      correcto: boolean;
      tiempoMs: number;
    }) => {
      if (!estudiante) return;

      // Actualizar estado de la mascota según resultado
      if (datos.correcto) {
        erroresConsecutivosRef.current = 0;
        setEstadoMascota('celebrando');
        // Frases variadas para aciertos
        const frases = [
          '¡Genial!', '¡Muy bien!', '¡Eso es!', '¡Bravo!',
          '¡Increíble!', '¡Súper!',
        ];
        setDialogoMascota(frases[Math.floor(Math.random() * frases.length)]);
        // Volver a estado normal después
        setTimeout(() => {
          setEstadoMascota('feliz');
          setDialogoMascota('');
        }, 1500);
      } else {
        erroresConsecutivosRef.current++;
        setEstadoMascota('pensando');

        if (erroresConsecutivosRef.current >= 2) {
          // Animar al niño tras fallos consecutivos
          const animos = [
            '¡Tú puedes!', '¡Sigue intentando!',
            '¡Casi lo tienes!', '¡No te rindas!',
          ];
          setDialogoMascota(animos[Math.floor(Math.random() * animos.length)]);
        } else {
          setDialogoMascota('¡Casi!');
        }
        setTimeout(() => {
          setEstadoMascota('feliz');
          setDialogoMascota('');
        }, 2000);
      }

      if (!sessionId) return;

      // Guardar respuesta en DB inmediatamente (con retry simple)
      const guardarConRetry = async (intentos = 2) => {
        await guardarRespuestaIndividual({
          sessionId,
          studentId: estudiante.id,
          ejercicioId: `vocal-${datos.vocal}-${datos.actividad}-${Date.now()}`,
          tipoEjercicio: datos.actividad,
          pregunta: `${datos.actividad} vocal ${datos.vocal}`,
          respuesta: datos.correcto ? datos.vocal : 'error',
          respuestaCorrecta: datos.vocal,
          correcta: datos.correcto,
          tiempoRespuestaMs: datos.tiempoMs,
        });

        // Actualizar progreso de habilidad en DB inmediatamente
        const resultado = await actualizarProgresoInmediato({
          studentId: estudiante.id,
          skillId: `vocal-${datos.vocal.toLowerCase()}`,
          categoria: 'vocales',
          correcto: datos.correcto,
        });

        // BLOCKER B2 FIX: Usar resultado del servidor como fuente de verdad
        if (resultado.dominada) {
          marcarVocalDominada(datos.vocal);
        }
        return resultado;
      };

      try {
        await guardarConRetry();
      } catch (err) {
        // Retry una vez tras breve delay
        try {
          await new Promise((r) => setTimeout(r, 1000));
          await guardarConRetry(1);
        } catch {
          // Log real error, no silenciar
          console.error('[VocalesPage] Error persistiendo respuesta tras retry:', err);
        }
      }
    },
    [sessionId, estudiante, marcarVocalDominada],
  );

  // ── Callback cuando se gana una estrella ──
  const onEstrella = useCallback(() => {
    estrellasEnSesionRef.current += 1;
    addEstrellas(1);

    // Actualizar sesión en DB
    if (sessionId && estudiante) {
      actualizarSesionEnCurso({
        sessionId,
        studentId: estudiante.id,
        estrellasGanadas: estrellasEnSesionRef.current,
      }).catch(() => {});
    }
  }, [sessionId, estudiante, addEstrellas]);

  // ── Callback cuando se domina una vocal ──
  const onVocalDominada = useCallback(
    (vocal: string) => {
      marcarVocalDominada(vocal);
      setEstadoMascota('celebrando');
    },
    [marcarVocalDominada],
  );

  // ── Callback cuando la sesión termina ──
  const onTerminar = useCallback(
    async (resumen: ResumenSesion) => {
      const sticker = resumen.respuestas.length > 0
        ? ['🐬', '🦋', '🌟', '🐢', '🦄', '🐙', '🦕', '🍀', '🎨', '🌈'][
            Math.floor(Math.random() * 10)
          ]
        : undefined;

      if (sticker) {
        addSticker(sticker, 'Sticker de sesión');
      }

      // Finalizar sesión en DB
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
          console.warn('Error finalizando sesión (offline?)');
        }
      }

      // Volver al mapa después de un delay
      setTimeout(() => {
        router.push('/jugar/mapa');
      }, 4000);
    },
    [sessionId, estudiante, addSticker, router],
  );

  // ── Auth failure → mostrar guard amigable ──
  if (authFailed) {
    return <AuthGuardNino tipo="sin-sesion" />;
  }

  // ── Loading ──
  if (!estudiante || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="flex flex-col items-center gap-4">
          <Mascota estado="feliz" size="lg" />
          <div className="text-2xl animate-pulse text-texto-suave">
            Preparando...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-fondo">
      {/* Header con botón home */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => router.push('/jugar/mapa')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-superficie shadow-sm text-xl active:scale-90 transition-transform"
        >
          🏠
        </button>
      </div>

      {/* Mascota reactiva durante la sesión */}
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

      {/* Sesión de vocales — componente único, fuente de verdad */}
      <div className="flex-1 px-4 pb-4">
        <SesionVocales
          nombreNino={estudiante.nombre}
          vocalInicial={(progress.vocalActual as Vocal) || 'A'}
          onTerminar={onTerminar}
          onRespuesta={onRespuesta}
          onEstrella={onEstrella}
          onVocalDominada={onVocalDominada}
        />
      </div>
    </main>
  );
}
