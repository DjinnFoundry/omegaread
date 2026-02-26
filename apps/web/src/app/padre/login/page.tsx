'use client';

/**
 * Página de login para padres.
 * Usa form POST nativo a /api/auth/login (no fetch).
 * La API setea la cookie via 302 redirect, que funciona en todos los browsers.
 */
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-fondo">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">👨‍👩‍👧</span>
          <h1 className="mt-4 text-3xl font-bold text-texto font-datos">
            Acceso para padres
          </h1>
          <p className="mt-2 text-texto-suave">
            Entra para ver el progreso de tus hijos
          </p>
        </div>

        <form method="POST" action="/api/auth/login" className="space-y-4">
          {error && (
            <div className="rounded-2xl bg-error-suave p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-texto mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-texto mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-turquesa px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-texto-suave">
          ¿No tienes cuenta?{' '}
          <Link href="/padre/registro" className="text-turquesa font-semibold hover:underline">
            Regístrate
          </Link>
        </p>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-texto-suave hover:text-texto"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
