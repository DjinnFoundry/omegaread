'use client';

/**
 * Página para crear perfil de un nuevo hijo
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearEstudiante } from '@/server/actions/student-actions';
import Link from 'next/link';

const MASCOTAS = [
  { tipo: 'gato', emoji: '🐱', nombre: 'Gato' },
  { tipo: 'perro', emoji: '🐶', nombre: 'Perro' },
  { tipo: 'buho', emoji: '🦉', nombre: 'Búho' },
  { tipo: 'dragon', emoji: '🐉', nombre: 'Dragón' },
];

export default function NuevoHijoPage() {
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState('gato');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('mascotaTipo', mascotaSeleccionada);

    const result = await crearEstudiante(formData);
    if (result.ok) {
      router.push('/padre/dashboard');
    } else {
      setError(result.error ?? 'Error al crear el perfil');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-fondo">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-5xl">🧒</span>
          <h1 className="mt-4 text-3xl font-bold text-texto">
            Nuevo aventurero
          </h1>
          <p className="mt-2 text-texto-suave">
            Crea el perfil de tu hijo para personalizar su experiencia
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
              Nombre del niño/a
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Lucía"
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

          {/* Mascota */}
          <div>
            <label className="block text-sm font-semibold text-texto mb-2">
              Elige una mascota
            </label>
            <div className="grid grid-cols-4 gap-3">
              {MASCOTAS.map((m) => (
                <button
                  key={m.tipo}
                  type="button"
                  onClick={() => setMascotaSeleccionada(m.tipo)}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-3 transition-all ${
                    mascotaSeleccionada === m.tipo
                      ? 'bg-turquesa/20 ring-2 ring-turquesa scale-105'
                      : 'bg-superficie hover:bg-neutro/10'
                  }`}
                >
                  <span className="text-4xl">{m.emoji}</span>
                  <span className="text-xs font-semibold text-texto">{m.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre de la mascota */}
          <div>
            <label htmlFor="mascotaNombre" className="block text-sm font-semibold text-texto mb-1">
              ¿Cómo se llama la mascota?
            </label>
            <input
              id="mascotaNombre"
              name="mascotaNombre"
              type="text"
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Luna"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Creando perfil...' : '¡Crear perfil!'}
          </button>
        </form>

        <Link
          href="/padre/dashboard"
          className="mt-6 block text-center text-sm text-texto-suave hover:text-texto"
        >
          ← Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
