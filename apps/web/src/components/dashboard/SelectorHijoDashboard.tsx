'use client';

/**
 * Selector de hijo para dashboard detallado del padre.
 * Usa query params para persistir la seleccion en la URL.
 */
import { useRouter } from 'next/navigation';

interface Props {
  hijos: Array<{ id: string; nombre: string }>;
  hijoSeleccionadoId?: string;
}

export function SelectorHijoDashboard({ hijos, hijoSeleccionadoId }: Props) {
  const router = useRouter();

  function seleccionar(id: string) {
    router.push(`/padre/dashboard?hijo=${id}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {hijos.map(hijo => (
        <button
          key={hijo.id}
          onClick={() => seleccionar(hijo.id)}
          className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
            hijo.id === hijoSeleccionadoId
              ? 'bg-turquesa text-white'
              : 'bg-superficie text-texto-suave hover:bg-turquesa/10'
          }`}
        >
          {hijo.nombre}
        </button>
      ))}
    </div>
  );
}
