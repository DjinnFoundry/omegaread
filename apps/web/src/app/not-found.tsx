import Link from 'next/link';

/**
 * Pagina 404 personalizada.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <span className="text-7xl animate-float" role="presentation">
        🔍
      </span>
      <h1 className="text-3xl font-extrabold text-texto text-center">
        Pagina no encontrada
      </h1>
      <p className="text-base text-texto-suave text-center max-w-sm">
        La pagina que buscas no existe o fue movida.
      </p>
      <Link
        href="/"
        className="rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
