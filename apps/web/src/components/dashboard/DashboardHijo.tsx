'use client';

/**
 * Tarjeta de resumen de un hijo en el dashboard del padre.
 * Muestra metricas de lectura: tiempo, racha, estrellas, sesiones.
 */
import Link from 'next/link';
import { calcularEdad } from '@/lib/utils/fecha';

interface DashboardHijoProps {
  nombre: string;
  fechaNacimiento: Date;
  resumen: {
    sesionesHoy: number;
    tiempoHoyMin: number;
    totalEstrellas: number;
    racha: number;
    totalSesiones: number;
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
          {nombre} ({edad} anos)
        </h2>
        <p className="mt-2 text-sm text-texto-suave">
          Aun no hay datos de progreso. Es hora de empezar a leer!
        </p>
        <Link
          href="/jugar/lectura"
          className="
            mt-3 flex items-center justify-center gap-2
            w-full rounded-2xl bg-turquesa px-4 py-3
            text-sm font-bold text-white
            active:scale-95 transition-transform
            touch-manipulation
          "
        >
          <span>📖</span> Empezar a leer con {nombre}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-superficie p-5 shadow-sm">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-texto">
          {nombre} ({edad} anos)
        </h2>
        <span className="text-sm text-texto-suave">
          {resumen.sesionesHoy > 0 ? (
            <span className="text-acierto font-semibold">
              🟢 {resumen.sesionesHoy} sesion{resumen.sesionesHoy !== 1 ? 'es' : ''} hoy
            </span>
          ) : (
            <span className="text-texto-suave">⚪ Sin sesiones hoy</span>
          )}
        </span>
      </div>

      {/* Dias de uso esta semana */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-texto-suave mb-1.5">📅 Esta semana</p>
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

      {/* Boton ir a leer */}
      <div className="mt-4">
        <Link
          href="/jugar/lectura"
          className="
            flex items-center justify-center gap-2
            w-full rounded-2xl bg-turquesa px-4 py-3
            text-sm font-bold text-white
            active:scale-95 transition-transform
            touch-manipulation
          "
        >
          <span>📖</span> Ir a leer con {nombre}
        </Link>
      </div>

      {/* Metricas */}
      <div className="mt-4 grid grid-cols-2 gap-3">
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
            {resumen.racha} <span className="text-sm font-normal">dias</span>
          </p>
        </div>

        {/* Estrellas */}
        <div className="rounded-2xl bg-amarillo/20 p-3">
          <p className="text-xs font-semibold text-texto">⭐ Estrellas</p>
          <p className="mt-1 text-2xl font-bold text-texto">
            {resumen.totalEstrellas}
          </p>
        </div>

        {/* Sesiones totales */}
        <div className="rounded-2xl bg-bosque/10 p-3">
          <p className="text-xs font-semibold text-bosque">📚 Sesiones</p>
          <p className="mt-1 text-2xl font-bold text-bosque">
            {resumen.totalSesiones}
          </p>
        </div>
      </div>
    </div>
  );
}
