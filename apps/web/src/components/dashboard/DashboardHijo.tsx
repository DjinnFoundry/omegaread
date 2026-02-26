'use client';

/**
 * Tarjeta de resumen de un hijo en el dashboard del padre.
 * Muestra metricas de lectura: tiempo, racha, estrellas, sesiones.
 * Heatmap mensual tipo GitHub para visualizar actividad.
 */
import Link from 'next/link';
import { BookOpen, Timer, Flame, Star, Library } from 'lucide-react';


interface DashboardHijoProps {
  nombre: string;
  resumen: {
    sesionesHoy: number;
    tiempoHoyMin: number;
    totalEstrellas: number;
    racha: number;
    totalSesiones: number;
    actividadMes: Record<string, number>;
  } | null;
}

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

  const dias = Array.from({ length: diasEnMes }, (_, i) => {
    const dia = i + 1;
    const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return {
      dia,
      sesiones: actividadMes[fecha] ?? 0,
      futuro: dia > hoyDia,
      fecha,
    };
  });

  const marcas = new Set([1, Math.ceil(diasEnMes / 2), hoyDia]);
  const gridColumns = { gridTemplateColumns: `repeat(${diasEnMes}, minmax(0, 1fr))` };

  return (
    <div>
      <p className="text-xs font-semibold text-texto-suave mb-2">
        {MESES[month]}
      </p>
      <div className="grid w-full gap-1" style={gridColumns}>
        {dias.map((celda) => (
          <div
            key={celda.fecha}
            className={`aspect-square rounded-[3px] ${
              celda.futuro
                ? 'bg-neutro/5'
                : celda.dia === hoyDia
                  ? `${intensidadColor(celda.sesiones)} ring-1 ring-turquesa`
                  : intensidadColor(celda.sesiones)
            }`}
            title={`${celda.dia} ${MESES[month]}: ${celda.sesiones} sesion${celda.sesiones !== 1 ? 'es' : ''}`}
          />
        ))}
      </div>
      <div className="mt-1 grid w-full gap-1" style={gridColumns}>
        {dias.map((celda) => (
          <span key={`marca-${celda.fecha}`} className="text-[8px] leading-none text-texto-suave text-center">
            {marcas.has(celda.dia) ? celda.dia : ''}
          </span>
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

export function DashboardHijo({ nombre, resumen }: DashboardHijoProps) {

  if (!resumen) {
    return (
      <div className="rounded-3xl bg-superficie p-5 shadow-sm">
        <h2 className="text-lg font-bold text-texto">
          Vamos a leer!
        </h2>
        <p className="mt-2 text-sm text-texto-suave">
          Aun no hay datos de progreso. Es hora de empezar!
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
          <BookOpen size={18} /> Empezar a leer con {nombre}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-superficie p-5 shadow-sm">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-texto">
          Vamos a leer!
        </h2>
        <span className="text-sm text-texto-suave">
          {resumen.sesionesHoy > 0 ? (
            <span className="flex items-center gap-1 text-acierto font-semibold">
              <span className="h-2 w-2 rounded-full bg-acierto" />
              {resumen.sesionesHoy} sesion{resumen.sesionesHoy !== 1 ? 'es' : ''} hoy
            </span>
          ) : (
            <span className="flex items-center gap-1 text-texto-suave">
              <span className="h-2 w-2 rounded-full bg-neutro/30" />
              Sin sesiones hoy
            </span>
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
          <BookOpen size={18} /> Ir a leer con {nombre}
        </Link>
      </div>

      {/* Metricas */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Tiempo */}
        <div className="rounded-2xl bg-turquesa/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-turquesa">
            <Timer size={14} /> Tiempo hoy
          </p>
          <p className="mt-1 text-2xl font-bold font-datos text-turquesa">
            {resumen.tiempoHoyMin} <span className="text-sm font-normal font-principal">min</span>
          </p>
        </div>

        {/* Racha */}
        <div className="rounded-2xl bg-coral/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-coral">
            <Flame size={14} /> Racha
          </p>
          <p className="mt-1 text-2xl font-bold font-datos text-coral">
            {resumen.racha} <span className="text-sm font-normal font-principal">dias</span>
          </p>
        </div>

        {/* Estrellas */}
        <div className="rounded-2xl bg-amarillo/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-texto">
            <Star size={14} className="text-ambar" /> Estrellas
          </p>
          <p className="mt-1 text-2xl font-bold font-datos text-texto">
            {resumen.totalEstrellas}
          </p>
        </div>

        {/* Sesiones totales */}
        <div className="rounded-2xl bg-bosque/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-bosque">
            <Library size={14} /> Sesiones
          </p>
          <p className="mt-1 text-2xl font-bold font-datos text-bosque">
            {resumen.totalSesiones}
          </p>
        </div>
      </div>
    </div>
  );
}
