'use client';

/**
 * Pagina para crear perfil de un nuevo hijo.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearEstudiante } from '@/server/actions/student-actions';

export default function NuevoHijoPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await crearEstudiante(formData);
    if (result.ok) {
      const estudiante = result.data.estudiante as { id: string; nombre: string };
      sessionStorage.setItem(
        'estudianteActivo',
        JSON.stringify({ id: estudiante.id, nombre: estudiante.nombre }),
      );
      router.push('/jugar/lectura');
    } else {
      setError(result.message ?? 'Error al crear el perfil');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-fondo">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">🧒</span>
          <h1 className="mt-4 text-3xl font-bold text-texto">
            Nuevo lector
          </h1>
          <p className="mt-2 text-texto-suave">
            Crea el perfil de tu hijo para personalizar su experiencia de lectura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-2xl bg-error-suave p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-semibold text-texto mb-1">
              Nombre del nino/a
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Lucia"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label htmlFor="fechaNacimiento" className="block text-sm font-semibold text-texto mb-1">
              Fecha de nacimiento
            </label>
            <input
              id="fechaNacimiento"
              name="fechaNacimiento"
              type="date"
              required
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Creando perfil...' : 'Crear perfil'}
          </button>
        </form>

      </div>
    </main>
  );
}
