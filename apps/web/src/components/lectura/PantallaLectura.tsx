'use client';

/**
 * Pantalla de lectura.
 * Muestra la historia con tipografia grande y amigable.
 * Cronometro invisible. Boton "He terminado de leer" prominente.
 */
import { useRef, useCallback, useEffect } from 'react';
import { BotonGrande } from '@/components/ui/BotonGrande';

interface PantallaLecturaProps {
  titulo: string;
  contenido: string;
  topicEmoji: string;
  topicNombre: string;
  nivel: number;
  onTerminar: (tiempoLecturaMs: number) => void;
}

export default function PantallaLectura({
  titulo,
  contenido,
  topicEmoji,
  topicNombre,
  nivel,
  onTerminar,
}: PantallaLecturaProps) {
  const inicioRef = useRef(0);

  useEffect(() => {
    inicioRef.current = Date.now();
  }, []);

  const handleTerminar = useCallback(() => {
    const tiempoMs = Date.now() - inicioRef.current;
    onTerminar(tiempoMs);
  }, [onTerminar]);

  const parrafos = contenido.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto">
      {/* Header minimo */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{topicEmoji}</span>
          <span className="text-xs text-texto-suave">{topicNombre}</span>
        </div>
        <div className="bg-turquesa/10 rounded-full px-3 py-1">
          <span className="text-xs text-turquesa font-medium">Nivel {nivel}</span>
        </div>
      </div>

      {/* Titulo */}
      <h1 className="text-2xl font-extrabold text-texto text-center mb-6 leading-snug">
        {titulo}
      </h1>

      {/* Historia */}
      <div className="bg-superficie rounded-3xl p-6 shadow-sm border border-neutro/10 mb-8">
        <div className="space-y-5">
          {parrafos.map((parrafo, i) => (
            <p
              key={i}
              className="text-lg leading-relaxed text-texto"
              style={{ fontFamily: 'var(--font-principal)' }}
            >
              {parrafo}
            </p>
          ))}
        </div>
      </div>

      {/* Boton terminar */}
      <div className="text-center pb-8">
        <BotonGrande
          variante="primario"
          icono="✅"
          texto="He terminado de leer"
          tamano="grande"
          onClick={handleTerminar}
          ariaLabel="He terminado de leer"
        />
      </div>
    </div>
  );
}
