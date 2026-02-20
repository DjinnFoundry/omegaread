'use client';

/**
 * Tarjeta de resumen de un hijo en el dashboard del padre
 */

interface DashboardHijoProps {
  nombre: string;
  fechaNacimiento: Date;
  resumen: {
    sesionesHoy: number;
    tiempoHoyMin: number;
    totalEstrellas: number;
    vocalesDominadas: string[];
    racha: number;
    stickers: Array<{ icono: string | null; nombre: string }>;
  } | null;
}

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

function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}
