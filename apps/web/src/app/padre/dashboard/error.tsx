'use client';

/**
 * Error boundary para el dashboard de padres.
 * Captura errores de server components y muestra UI amigable.
 */
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <span className="text-6xl" role="presentation">
        😕
      </span>
      <h1 className="text-2xl font-bold text-texto text-center">
        No se pudo cargar el dashboard
      </h1>
      <p className="text-texto-suave text-center max-w-sm">
        Puede ser un problema temporal. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
      >
        Reintentar
      </button>
    </main>
  );
}
