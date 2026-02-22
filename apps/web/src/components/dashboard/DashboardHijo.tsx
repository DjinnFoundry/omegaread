'use client';

/**
 * Tarjeta de resumen de un hijo en el dashboard del padre.
 * Muestra metricas de lectura: tiempo, racha, estrellas, sesiones.
 * Heatmap mensual tipo GitHub para visualizar actividad.
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
    actividadMes: Record<string, number>;
  } | null;
}

const DIAS_SEMANA_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function intensidadColor(sesiones: number): string {
  if (sesiones === 0) return 'bg-neutro/10';
  if (sesiones === 1) return 'bg-acierto/30';
  if (sesiones === 2) return 'bg-acierto/60';
  return 'bg-acierto';
}

function HeatmapMes({ actividadMes }: { actividadMes: Record<string, number> }) {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const hoyDia = hoy.getDate();

  // Dia de la semana del 1 del mes (0=domingo, convertir a lunes=0)
  const primerDiaSemana = new Date(year, month, 1).getDay();
  const offsetInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  // Construir grid: 7 filas (L-D) x N columnas (semanas)
  const totalSlots = offsetInicio + diasEnMes;
  const numSemanas = Math.ceil(totalSlots / 7);

  // Matriz semanas x dias
  const grid: Array<Array<{ dia: number; sesiones: number; futuro: boolean } | null>> = [];
  for (let semana = 0; semana < numSemanas; semana++) {
    const fila: Array<{ dia: number; sesiones: number; futuro: boolean } | null> = [];
    for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
      const slot = semana * 7 + diaSemana;
      const dia = slot - offsetInicio + 1;
      if (dia < 1 || dia > diasEnMes) {
        fila.push(null);
      } else {
        const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        fila.push({
          dia,
          sesiones: actividadMes[fecha] ?? 0,
          futuro: dia > hoyDia,
        });
      }
    }
    grid.push(fila);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-texto-suave mb-2">
        {MESES[month]}
      </p>
      <div className="flex gap-1">
        {/* Labels de dias */}
        <div className="flex flex-col gap-1 mr-0.5">
          {DIAS_SEMANA_CORTO.map((d) => (
            <div key={d} className="h-3 w-3 flex items-center justify-center">
              <span className="text-[8px] text-texto-suave leading-none">{d}</span>
            </div>
          ))}
        </div>
        {/* Columnas (semanas) */}
        {grid.map((semana, si) => (
          <div key={si} className="flex flex-col gap-1">
            {semana.map((celda, di) => (
              <div
                key={di}
                className={`h-3 w-3 rounded-[3px] ${
                  celda === null
                    ? 'bg-transparent'
                    : celda.futuro
                      ? 'bg-neutro/5'
                      : celda.dia === hoyDia
                        ? `${intensidadColor(celda.sesiones)} ring-1 ring-turquesa`
                        : intensidadColor(celda.sesiones)
                }`}
                title={
                  celda
                    ? `${celda.dia} ${MESES[month]}: ${celda.sesiones} sesion${celda.sesiones !== 1 ? 'es' : ''}`
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>
      {/* Leyenda */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[8px] text-texto-suave">Menos</span>
        <div className="h-2.5 w-2.5 rounded-[2px] bg-neutro/10" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-acierto/30" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-acierto/60" />
        <div className="h-2.5 w-2.5 rounded-[2px] bg-acierto" />
        <span className="text-[8px] text-texto-suave">Mas</span>
      </div>
    </div>
  );
}

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

      {/* Heatmap mensual */}
      <div className="mt-3">
        <HeatmapMes actividadMes={resumen.actividadMes} />
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
