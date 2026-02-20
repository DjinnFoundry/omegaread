import Link from 'next/link';

/**
 * Página de inicio — Landing page simple
 * Redirige al niño o al padre según corresponda
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      {/* Sol decorativo */}
      <div className="text-7xl animate-float">🌤️</div>

      <h1 className="text-4xl font-extrabold text-texto text-center">
        OmegaAnywhere
      </h1>
      <p className="text-lg text-texto-suave text-center max-w-md">
        Aprende jugando — Lectura, números y aventuras para niños de 4 a 8 años
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Botón para niño — grande y colorido */}
        <Link
          href="/jugar"
          className="flex items-center justify-center gap-3 rounded-3xl bg-coral px-8 py-5 text-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
        >
          <span className="text-3xl">🎮</span>
          ¡A jugar!
        </Link>

        {/* Botón para padre */}
        <Link
          href="/padre/login"
          className="flex items-center justify-center gap-3 rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
        >
          <span className="text-2xl">👨‍👩‍👧</span>
          Soy padre/madre
        </Link>
      </div>

      <footer className="mt-12 text-sm text-texto-suave text-center">
        <p>Open source · AGPL-3.0 · Hecho con ❤️ para familias hispanohablantes</p>
      </footer>
    </main>
  );
}
