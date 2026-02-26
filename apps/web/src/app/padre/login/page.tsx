'use client';

/**
 * Página de login para padres
 */
import { useState } from 'react';
import Link from 'next/link';
import { actionLogin } from '@/server/actions/auth-actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await actionLogin(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Si no hay error, el server action redirige automáticamente
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            disabled={loading}
            className="w-full rounded-2xl bg-turquesa px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
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
