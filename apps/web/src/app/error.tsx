'use client';

import Link from 'next/link';

/**
 * Error boundary global.
 * Captura errores no manejados por boundaries mas especificos.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <span className="text-7xl animate-bounce-suave" role="presentation">
        🌈
      </span>
      <h1 className="text-2xl font-extrabold text-texto text-center">
        Algo salio mal
      </h1>
      <p className="text-texto-suave text-center max-w-sm">
        Ocurrio un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-3xl bg-turquesa px-6 py-3 font-bold text-white shadow-md active:scale-95 transition-transform"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-3xl bg-superficie px-6 py-3 font-bold text-texto shadow-md border-2 border-neutro/20 active:scale-95 transition-transform"
        >
          Inicio
        </Link>
      </div>
    </main>
  );
}
