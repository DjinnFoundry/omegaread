'use client';

/**
 * Página de registro para padres.
 * Usa form POST nativo a /api/auth/registro.
 * Validacion de contraseñas client-side, el resto es server-side via redirect.
 */
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';

function RegistroForm() {
  const searchParams = useSearchParams();
  const serverError = searchParams.get('error');
  const [clientError, setClientError] = useState('');

  const error = clientError || serverError;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmar = (form.elements.namedItem('confirmar') as HTMLInputElement).value;

    if (password !== confirmar) {
      e.preventDefault();
      setClientError('Las contraseñas no coinciden');
    }
    // Si coinciden, deja que el form haga POST nativo
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-fondo">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">✨</span>
          <h1 className="mt-4 text-3xl font-bold text-texto font-datos">
            Crear cuenta
          </h1>
          <p className="mt-2 text-texto-suave">
            Registra tu familia para empezar la aventura
          </p>
        </div>

        <form
          method="POST"
          action="/api/auth/registro"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-2xl bg-error-suave p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="nombre" className="block text-sm font-semibold text-texto mb-1">
              Tu nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Ana"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmar" className="block text-sm font-semibold text-texto mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Repite la contraseña"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Crear cuenta
          </button>
        </form>

        <p className="mt-6 text-center text-texto-suave">
          ¿Ya tienes cuenta?{' '}
          <Link href="/padre/login" className="text-turquesa font-semibold hover:underline">
            Entra aquí
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

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  );
}
