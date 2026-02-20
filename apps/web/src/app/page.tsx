import Link from 'next/link';

/**
 * Landing page de OmegaRead.
 * Hero + 3 value props + CTA + footer AGPL-3.0.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-fondo">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
        <div className="text-8xl animate-float" role="presentation">
          📖
        </div>

        <h1 className="mt-6 text-4xl font-extrabold text-texto leading-tight sm:text-5xl">
          OmegaRead
        </h1>
        <p className="mt-3 text-xl font-semibold text-turquesa sm:text-2xl">
          Tu hijo lee mejor cada dia
        </p>
        <p className="mt-4 max-w-md text-base text-texto-suave leading-relaxed">
          Historias personalizadas que se adaptan al nivel de tu hijo.
          Comprension lectora medible. Progreso visible.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-4 w-full max-w-xs">
          <Link
            href="/padre/registro"
            className="flex items-center justify-center gap-3 rounded-3xl bg-coral px-8 py-5 text-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
          >
            <span className="text-2xl">🚀</span>
            Empezar gratis
          </Link>

          <Link
            href="/padre/login"
            className="flex items-center justify-center gap-2 rounded-3xl bg-superficie px-8 py-4 text-base font-semibold text-texto shadow-md active:scale-95 transition-transform border-2 border-neutro/20"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="px-6 py-12 bg-superficie">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold text-texto mb-10">
            Por que OmegaRead
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            <ValueProp
              emoji="🎯"
              titulo="Personalizado"
              descripcion="Historias basadas en los intereses de tu hijo. Dinosaurios, espacio, animales... lo que le apasione."
            />
            <ValueProp
              emoji="📊"
              titulo="Adaptativo"
              descripcion="El nivel de dificultad se ajusta automaticamente segun la comprension. Ni muy facil ni muy dificil."
            />
            <ValueProp
              emoji="✨"
              titulo="Metricas claras"
              descripcion="Dashboard para padres con evolucion de nivel, comprension y velocidad lectora. Sin ruido."
            />
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-extrabold text-texto mb-10">
            Como funciona
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            <Step numero={1} emoji="🧒" texto="Crea el perfil de tu hijo y elige sus intereses" />
            <Step numero={2} emoji="📚" texto="Tu hijo lee historias personalizadas y responde preguntas" />
            <Step numero={3} emoji="📈" texto="Sigue su progreso y ve como mejora cada semana" />
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-6 py-12 bg-turquesa/10 text-center">
        <p className="text-4xl mb-4">📖</p>
        <h2 className="text-2xl font-extrabold text-texto">
          Listo para empezar?
        </h2>
        <p className="mt-2 text-texto-suave max-w-md mx-auto">
          Es gratis, open source, y pensado para familias hispanohablantes.
        </p>
        <Link
          href="/padre/registro"
          className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-coral px-8 py-4 text-lg font-bold text-white shadow-lg active:scale-95 transition-transform"
        >
          Crear cuenta
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 text-center text-sm text-texto-suave border-t border-neutro/10">
        <p className="font-semibold text-texto">OmegaRead</p>
        <p className="mt-1">
          Lectura adaptativa para ninos de 5 a 9 anos
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <a
            href="https://github.com/juancartagena/omegaread"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-texto transition-colors"
          >
            GitHub
          </a>
          <span className="text-neutro/30">|</span>
          <span>AGPL-3.0</span>
        </div>
        <p className="mt-3 text-xs text-neutro">
          Open source. Hecho para familias hispanohablantes.
        </p>
      </footer>
    </main>
  );
}

function ValueProp({
  emoji,
  titulo,
  descripcion,
}: {
  emoji: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-5xl" role="presentation">
        {emoji}
      </span>
      <h3 className="mt-3 text-lg font-bold text-texto">{titulo}</h3>
      <p className="mt-2 text-sm text-texto-suave leading-relaxed">
        {descripcion}
      </p>
    </div>
  );
}

function Step({
  numero,
  emoji,
  texto,
}: {
  numero: number;
  emoji: string;
  texto: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-turquesa text-white text-lg font-extrabold">
        {numero}
      </div>
      <span className="mt-3 text-4xl" role="presentation">
        {emoji}
      </span>
      <p className="mt-2 text-sm text-texto-suave leading-relaxed">{texto}</p>
    </div>
  );
}
