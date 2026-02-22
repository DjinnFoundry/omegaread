'use client';

/**
 * Pantalla de resultado de sesion.
 * Minimalista: celebracion + estrellas + CTA hacia la siguiente historia.
 * Los datos detallados (ELO, WPM, skills) van al dashboard del padre.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Celebracion } from '@/components/ui/Celebracion';

interface ResultadoSesionProps {
  resultado: {
    aciertos: number;
    totalPreguntas: number;
    estrellas: number;
  };
  studentNombre: string;
  onLeerOtra: () => void;
}

const MENSAJES: Record<string, string[]> = {
  excelente: [
    'Increible, {nombre}! Eres una estrella!',
    'Genial! Entendiste todo!',
    'Fantastico, {nombre}!',
  ],
  bien: [
    'Muy bien, {nombre}! Vas genial!',
    'Buen trabajo, {nombre}!',
    'Bien hecho! Sigue asi!',
  ],
  regular: [
    'Bien intentado, {nombre}!',
    'Sigue leyendo, {nombre}! Cada historia cuenta.',
    'Buen esfuerzo, {nombre}!',
  ],
};

function getMensaje(aciertos: number, total: number, nombre: string): string {
  const ratio = total > 0 ? aciertos / total : 0;
  const cat = ratio >= 0.75 ? 'excelente' : ratio >= 0.5 ? 'bien' : 'regular';
  const msgs = MENSAJES[cat]!;
  return msgs[Math.floor(Math.random() * msgs.length)].replace('{nombre}', nombre);
}

function getEmoji(aciertos: number, total: number): string {
  const ratio = total > 0 ? aciertos / total : 0;
  if (ratio >= 1) return '🏆';
  if (ratio >= 0.75) return '🌟';
  if (ratio >= 0.5) return '👏';
  return '💪';
}

export default function ResultadoSesion({
  resultado,
  studentNombre,
  onLeerOtra,
}: ResultadoSesionProps) {
  const router = useRouter();
  const ratio = resultado.totalPreguntas > 0 ? resultado.aciertos / resultado.totalPreguntas : 0;
  const [mostrarCelebracion, setMostrarCelebracion] = useState(() => ratio >= 0.75);

  const [mensaje] = useState(() =>
    getMensaje(resultado.aciertos, resultado.totalPreguntas, studentNombre),
  );
  const emoji = getEmoji(resultado.aciertos, resultado.totalPreguntas);

  return (
    <div className="animate-scale-in w-full max-w-sm mx-auto text-center">
      <Celebracion
        visible={mostrarCelebracion}
        onClose={() => setMostrarCelebracion(false)}
      />

      {/* Emoji + mensaje */}
      <div className="text-7xl mb-4">{emoji}</div>
      <p className="text-xl font-bold text-texto mb-6">{mensaje}</p>

      {/* Estrellas */}
      <div className="flex justify-center gap-2 mb-2">
        {Array.from({ length: 3 }, (_, i) => (
          <span
            key={i}
            className={`text-4xl transition-all ${i < resultado.estrellas ? '' : 'opacity-20 grayscale'}`}
          >
            ⭐
          </span>
        ))}
      </div>
      <p className="text-sm text-texto-suave mb-8">
        {resultado.aciertos} de {resultado.totalPreguntas} correctas
      </p>

      {/* CTA principal */}
      <button
        type="button"
        onClick={onLeerOtra}
        className="
          w-full flex items-center justify-center gap-2.5
          px-6 py-4 rounded-2xl
          bg-gradient-to-r from-turquesa to-turquesa/85
          text-white font-bold text-lg
          shadow-md hover:shadow-lg
          transition-all duration-150
          active:scale-[0.98] touch-manipulation
        "
      >
        <span className="text-xl">📖</span>
        Otra historia!
      </button>

    </div>
  );
}
