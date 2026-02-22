import Link from 'next/link';
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
          Pequeños Fans de la lectura
        </h1>
        
        <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed">
          Acelera su capacidad de comprensión, velocidad de lectura y conocimientos con progreso diario con historias personalizadas según su nivel.
        </p>
        
        <Link
          href="/padre/registro"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-lg shadow-turquesa/30 hover:shadow-xl hover:shadow-turquesa/40 hover:-translate-y-0.5 transition-all"
        >
          Crear cuenta gratis
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
        
        <p className="mt-6 text-sm text-slate-500">
          100% gratis. Sin tarjeta.
        </p>
      </div>
    </main>
  );
}
