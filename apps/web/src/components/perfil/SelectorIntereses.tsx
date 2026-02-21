'use client';

/**
 * Selector visual de categorias de interes para el nino.
 * Grid de categorias STEM con emojis grandes, tactil, divertido.
 * Minimo 1 categoria, maximo 6.
 */
import { useState } from 'react';
import { guardarIntereses } from '@/server/actions/profile-actions';
import { CATEGORIAS } from '@/lib/data/topics';

interface Props {
  studentId: string;
  studentNombre: string;
  edadAnos: number;
  interesesActuales?: string[];
  onComplete: () => void;
}

export default function SelectorIntereses({
  studentId,
  studentNombre,
  interesesActuales = [],
  onComplete,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<string[]>(interesesActuales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleCategoria(slug: string) {
    setSeleccionados(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug);
      if (prev.length >= 6) return prev;
      return [...prev, slug];
    });
  }

  async function handleGuardar() {
    if (seleccionados.length === 0) return;
    setError('');
    setLoading(true);

    const result = await guardarIntereses({
      studentId,
      intereses: seleccionados,
    });

    if (result.ok) {
      onComplete();
    } else {
      setError(result.error ?? 'Error al guardar intereses');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <span className="text-5xl">🌟</span>
      <h2 className="mt-3 text-2xl font-extrabold text-texto">
        {studentNombre}, que te gusta aprender?
      </h2>
      <p className="mt-1 text-base text-texto-suave">
        Elige los temas que mas te interesen
      </p>

      {error && (
        <div className="mt-3 rounded-2xl bg-error-suave p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {CATEGORIAS.map(cat => {
          const activo = seleccionados.includes(cat.slug);
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => toggleCategoria(cat.slug)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-3 p-4 transition-all active:scale-95
                ${activo
                  ? 'border-turquesa bg-turquesa/10 shadow-md'
                  : 'border-neutro/20 bg-superficie hover:border-turquesa/40'
                }`}
              aria-pressed={activo}
              aria-label={cat.nombre}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className={`text-xs font-bold ${activo ? 'text-turquesa' : 'text-texto'}`}>
                {cat.nombre}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-texto-suave">
        {seleccionados.length === 0
          ? 'Toca los que te gusten'
          : `${seleccionados.length} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
      </p>

      <button
        type="button"
        onClick={handleGuardar}
        disabled={loading || seleccionados.length === 0}
        className="mt-5 w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        {loading ? 'Guardando...' : 'Listo!'}
      </button>
    </div>
  );
}
