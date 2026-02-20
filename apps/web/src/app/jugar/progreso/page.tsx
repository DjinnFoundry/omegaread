'use client';

/**
 * Dashboard del nino — Pantalla de progreso visual.
 * Sprint 5: Visual, motivacional, entendible por ninos de 6 anos.
 *
 * Widgets:
 * a) Tendencia comprension (barras coloreadas)
 * b) Ritmo lector (tortuga -> conejo)
 * c) Nivel actual + barra de progreso
 * d) Topics fuertes y a reforzar
 * e) Racha de lectura (calendario 7 dias)
 * f) Mensaje motivacional
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { obtenerDashboardNino, type DashboardNinoData } from '@/server/actions/dashboard-actions';
import { BarraComprension } from '@/components/charts/BarraComprension';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function ProgresoPage() {
  const router = useRouter();
  const { estudiante } = useStudentProgress();
  const [data, setData] = useState<DashboardNinoData | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!estudiante) return;
    let cancelled = false;

    obtenerDashboardNino(estudiante.id).then(result => {
      if (!cancelled) {
        setData(result);
        setCargando(false);
      }
    }).catch(() => {
      if (!cancelled) setCargando(false);
    });

    return () => { cancelled = true; };
  }, [estudiante]);

  if (!estudiante) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <p className="text-texto-suave">Selecciona un perfil para ver el progreso</p>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo">
        <div className="text-center animate-pulse-brillo">
          <span className="text-5xl">📊</span>
          <p className="mt-2 text-texto-suave">Cargando tu progreso...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fondo p-6">
        <div className="text-center">
          <span className="text-5xl">📚</span>
          <p className="mt-4 text-lg font-semibold text-texto">Aun no hay datos</p>
          <p className="mt-1 text-texto-suave">Lee tu primera historia para ver tu progreso</p>
          <button
            onClick={() => router.push('/jugar/lectura')}
            className="mt-4 rounded-2xl bg-turquesa px-6 py-3 font-bold text-white active:scale-95 transition-transform"
          >
            A leer!
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-fondo p-4 pb-8">
      <div className="mx-auto max-w-md space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-texto">
              Tu progreso
            </h1>
            <p className="text-sm text-texto-suave">{estudiante.nombre}</p>
          </div>
          <button
            onClick={() => router.push('/jugar/lectura')}
            className="rounded-2xl bg-turquesa px-4 py-2 text-sm font-bold text-white active:scale-95 transition-transform"
          >
            A leer!
          </button>
        </div>

        {/* f) Mensaje motivacional */}
        <div className="rounded-3xl bg-amarillo/30 p-4 text-center">
          <span className="text-3xl">✨</span>
          <p className="mt-1 text-sm font-semibold text-texto">
            {data.mensajeMotivacional}
          </p>
        </div>

        {/* c) Nivel actual y progreso */}
        <WidgetNivel data={data.nivelActual} />

        {/* a) Tendencia comprension */}
        <div className="rounded-3xl bg-superficie p-4 shadow-sm">
          <h2 className="text-sm font-bold text-texto mb-2">
            Como te fue en las ultimas historias
          </h2>
          <BarraComprension
            datos={data.tendenciaComprension.map(t => ({
              porcentaje: t.porcentajeAcierto,
              emoji: t.topicEmoji,
            }))}
          />
          <div className="mt-2 flex justify-center gap-4 text-[10px] text-texto-suave">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-acierto" /> Genial
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amarillo" /> Bien
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-coral" /> A mejorar
            </span>
          </div>
        </div>

        {/* b) Ritmo lector */}
        {data.ritmoLector && <WidgetRitmo data={data.ritmoLector} />}

        {/* d) Topics fuertes y a reforzar */}
        <WidgetTopics data={data.topicsResumen} />

        {/* e) Racha de lectura */}
        <WidgetRacha data={data.racha} />
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────
// WIDGETS
// ─────────────────────────────────────────────

function WidgetNivel({ data }: { data: DashboardNinoData['nivelActual'] }) {
  const progreso = data.sesionesNecesarias > 0
    ? Math.round((data.sesionesRecientesAltas / data.sesionesNecesarias) * 100)
    : 0;

  return (
    <div className="rounded-3xl bg-superficie p-5 shadow-sm text-center">
      <p className="text-xs font-semibold text-texto-suave">Tu nivel</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="text-4xl font-extrabold text-turquesa">
          {data.nivel}
        </span>
        <div className="flex">
          {Array.from({ length: Math.min(Math.floor(data.nivel), 5) }).map((_, i) => (
            <span key={i} className="text-lg">⭐</span>
          ))}
        </div>
      </div>

      {/* Barra de progreso hacia siguiente nivel */}
      <div className="mt-3">
        <div className="h-4 rounded-full bg-neutro/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-turquesa transition-all duration-700"
            style={{ width: `${progreso}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-texto-suave">
          {data.historiasParaSubir > 0
            ? `Te faltan ${data.historiasParaSubir} historia${data.historiasParaSubir !== 1 ? 's' : ''} con buena comprension para subir`
            : 'Listo para subir de nivel!'
          }
        </p>
      </div>
    </div>
  );
}

function WidgetRitmo({ data }: { data: NonNullable<DashboardNinoData['ritmoLector']> }) {
  const minAntes = Math.round(data.tiempoPromedioAnteriorMs / 60000);
  const minAhora = Math.round(data.tiempoPromedioRecienteMs / 60000);
  const icono = data.mejorando ? '🐇' : '🐢';

  return (
    <div className="rounded-3xl bg-superficie p-4 shadow-sm">
      <h2 className="text-sm font-bold text-texto mb-2">
        Tu velocidad de lectura
      </h2>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-texto-suave">Antes</p>
          <p className="text-lg font-bold text-texto">{minAntes} min</p>
        </div>
        <span className="text-3xl">{data.mejorando ? '→' : '→'}</span>
        <div className="text-center">
          <p className="text-xs text-texto-suave">Ahora</p>
          <p className="text-lg font-bold text-turquesa">{minAhora} min</p>
        </div>
        <span className="text-4xl">{icono}</span>
      </div>
      <p className="mt-2 text-center text-xs text-texto-suave">
        {data.mejorando
          ? 'Cada vez lees mas rapido!'
          : 'Tomate tu tiempo, lo importante es entender bien'
        }
      </p>
    </div>
  );
}

function WidgetTopics({ data }: { data: DashboardNinoData['topicsResumen'] }) {
  if (data.fuertes.length === 0 && !data.reforzar) {
    return null;
  }

  return (
    <div className="rounded-3xl bg-superficie p-4 shadow-sm">
      <h2 className="text-sm font-bold text-texto mb-3">
        Tus temas
      </h2>

      {data.fuertes.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-acierto mb-1.5">Tus mejores temas</p>
          <div className="flex flex-wrap gap-2">
            {data.fuertes.map(t => (
              <span
                key={t.topicSlug}
                className="inline-flex items-center gap-1.5 rounded-full bg-acierto/15 px-3 py-1.5 text-xs font-semibold text-texto"
              >
                {t.emoji} {t.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.reforzar && (
        <div>
          <p className="text-xs font-semibold text-coral mb-1.5">Puedes mejorar en</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/15 px-3 py-1.5 text-xs font-semibold text-texto">
            {data.reforzar.emoji} {data.reforzar.nombre}
          </span>
        </div>
      )}
    </div>
  );
}

function WidgetRacha({ data }: { data: DashboardNinoData['racha'] }) {
  return (
    <div className="rounded-3xl bg-superficie p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-texto">
          Racha de lectura
        </h2>
        <span className="text-lg font-extrabold text-coral">
          {data.diasConsecutivos > 0 ? `${data.diasConsecutivos} dia${data.diasConsecutivos !== 1 ? 's' : ''}` : ''}
        </span>
      </div>
      <div className="flex justify-center gap-2">
        {DIAS_SEMANA.map((dia, i) => (
          <div
            key={dia}
            className={`flex h-9 w-9 flex-col items-center justify-center rounded-xl text-xs font-bold ${
              data.ultimosDias[i]
                ? 'bg-acierto text-white'
                : 'bg-neutro/15 text-neutro'
            }`}
          >
            <span className="text-[10px] leading-none">{dia}</span>
            <span className="text-sm leading-none mt-0.5">
              {data.ultimosDias[i] ? '✓' : ''}
            </span>
          </div>
        ))}
      </div>
      {data.diasConsecutivos === 0 && (
        <p className="mt-2 text-center text-xs text-texto-suave">
          Lee hoy para empezar tu racha!
        </p>
      )}
      {data.diasConsecutivos >= 3 && (
        <p className="mt-2 text-center text-xs text-texto-suave">
          Increible! Sigue asi!
        </p>
      )}
    </div>
  );
}
