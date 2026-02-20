'use client';

/**
 * Tarjeta de resumen de un hijo en el dashboard del padre
 */
import { calcularEdad } from '@/lib/utils/fecha';

interface DashboardHijoProps {
  nombre: string;
  fechaNacimiento: Date;
  resumen: {
    sesionesHoy: number;
    tiempoHoyMin: number;
    totalEstrellas: number;
    vocalesDominadas: string[];
    silabasDominadas: string[];
    racha: number;
    stickers: Array<{ icono: string | null; nombre: string }>;
    proximaMeta: string | null;
    diasUsoSemana: boolean[];
  } | null;
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function DashboardHijo({ nombre, fechaNacimiento, resumen }: DashboardHijoProps) {
  const edad = calcularEdad(fechaNacimiento);

  if (!resumen) {
    return (
      <div className="rounded-3xl bg-superficie p-5 shadow-sm">
        <h2 className="text-lg font-bold text-texto">
          {nombre} ({edad} años)
        </h2>
        <p className="mt-2 text-sm text-texto-suave">
          Aún no hay datos de progreso. ¡Es hora de empezar a jugar!
        </p>
      </div>
    );
  }

  const vocales = ['A', 'E', 'I', 'O', 'U'];

  return (
    <div className="rounded-3xl bg-superficie p-5 shadow-sm">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-texto">
          {nombre} ({edad} años)
        </h2>
        <span className="text-sm text-texto-suave">
          {resumen.sesionesHoy > 0 ? (
            <span className="text-acierto font-semibold">
              🟢 {resumen.sesionesHoy} sesión{resumen.sesionesHoy !== 1 ? 'es' : ''} hoy
            </span>
          ) : (
            <span className="text-texto-suave">⚪ Sin sesiones hoy</span>
          )}
        </span>
      </div>

      {/* Próxima meta */}
      {resumen.proximaMeta && (
        <div className="mt-3 rounded-2xl bg-turquesa/10 px-4 py-2">
          <p className="text-sm font-semibold text-turquesa">
            🎯 Próxima meta: {resumen.proximaMeta}
          </p>
        </div>
      )}

      {/* Días de uso esta semana */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-texto-suave mb-1.5">📅 Días de uso esta semana</p>
        <div className="flex gap-1.5">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={dia}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                resumen.diasUsoSemana[i]
                  ? 'bg-acierto text-white'
                  : 'bg-neutro/20 text-neutro'
              }`}
            >
              {dia}
            </div>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Vocales */}
        <div className="rounded-2xl bg-bosque/10 p-3">
          <p className="text-xs font-semibold text-bosque">🔤 Vocales</p>
          <div className="mt-2 flex gap-1.5">
            {vocales.map((v) => (
              <span
                key={v}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  resumen.vocalesDominadas.includes(v)
                    ? 'bg-bosque text-white'
                    : 'bg-neutro/20 text-neutro'
                }`}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Tiempo */}
        <div className="rounded-2xl bg-turquesa/10 p-3">
          <p className="text-xs font-semibold text-turquesa">⏱️ Tiempo hoy</p>
          <p className="mt-1 text-2xl font-bold text-turquesa">
            {resumen.tiempoHoyMin} <span className="text-sm font-normal">min</span>
          </p>
        </div>

        {/* Racha */}
        <div className="rounded-2xl bg-coral/10 p-3">
          <p className="text-xs font-semibold text-coral">🔥 Racha</p>
          <p className="mt-1 text-2xl font-bold text-coral">
            {resumen.racha} <span className="text-sm font-normal">días</span>
          </p>
        </div>

        {/* Estrellas */}
        <div className="rounded-2xl bg-amarillo/20 p-3">
          <p className="text-xs font-semibold text-texto">⭐ Estrellas</p>
          <p className="mt-1 text-2xl font-bold text-texto">
            {resumen.totalEstrellas}
          </p>
        </div>
      </div>

      {/* Silabas dominadas */}
      <div className="mt-3 rounded-2xl bg-montana/10 p-3">
        <p className="text-xs font-semibold text-montana">🔠 Sílabas dominadas</p>
        <p className="mt-1 text-xl font-bold text-montana">
          {resumen.silabasDominadas.length}
          <span className="ml-1 text-sm font-normal text-texto-suave">/ 30</span>
        </p>
        {resumen.silabasDominadas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {resumen.silabasDominadas.slice(0, 12).map((silaba) => (
              <span
                key={silaba}
                className="rounded-full bg-superficie px-2 py-1 text-xs font-bold text-texto shadow-sm"
              >
                {silaba}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stickers recientes */}
      {resumen.stickers.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-texto-suave">🏷️ Stickers recientes</p>
          <div className="mt-1 flex gap-2">
            {resumen.stickers.slice(0, 8).map((s, i) => (
              <span key={i} className="text-2xl" title={s.nombre}>
                {s.icono}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// calcularEdad imported from @/lib/utils/fecha
