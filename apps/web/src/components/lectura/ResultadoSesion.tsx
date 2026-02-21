'use client';

/**
 * Pantalla de resultado de sesion.
 * Muestra aciertos, mensaje motivacional, y cambio de nivel.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Celebracion } from '@/components/ui/Celebracion';
import { BotonGrande } from '@/components/ui/BotonGrande';

interface ResultadoSesionProps {
  resultado: {
    aciertos: number;
    totalPreguntas: number;
    comprensionScore: number;
    estrellas: number;
    direccion: 'subir' | 'bajar' | 'mantener';
    nivelAnterior: number;
    nivelNuevo: number;
    razon: string;
  };
  studentNombre: string;
  onLeerOtra: () => void;
  onVolver: () => void;
}

const MENSAJES_MOTIVACIONALES = {
  excelente: [
    'Increible! Eres una estrella de la lectura!',
    'Genial! Entendiste todo perfectamente!',
    'Fantastico! Tu comprension es asombrosa!',
  ],
  bien: [
    'Muy bien! Vas por buen camino!',
    'Buen trabajo! Sigue asi!',
    'Bien hecho! Cada lectura te hace mejor!',
  ],
  regular: [
    'Bien intentado! La practica hace al maestro.',
    'No te rindas! Cada historia te ayuda a mejorar.',
    'Sigue leyendo! Poco a poco llegaras lejos.',
  ],
  bajo: [
    'No pasa nada! La lectura es como un superpoder: se entrena.',
    'Animo! Vamos a intentar una historia mas sencilla.',
    'Cada intento cuenta! Tu proximo cuento sera mas divertido.',
  ],
};

function getMensajeMotivacional(aciertos: number, total: number): string {
  const ratio = total > 0 ? aciertos / total : 0;
  let categoria: keyof typeof MENSAJES_MOTIVACIONALES;

  if (ratio >= 0.9) categoria = 'excelente';
  else if (ratio >= 0.7) categoria = 'bien';
  else if (ratio >= 0.5) categoria = 'regular';
  else categoria = 'bajo';

  const mensajes = MENSAJES_MOTIVACIONALES[categoria];
  return mensajes[Math.floor(Math.random() * mensajes.length)];
}

function getNivelTexto(direccion: 'subir' | 'bajar' | 'mantener'): {
  emoji: string;
  color: string;
  texto: string;
} {
  switch (direccion) {
    case 'subir':
      return {
        emoji: '⬆️',
        color: 'text-bosque',
        texto: 'Subiste de nivel! Las historias seran un poco mas desafiantes.',
      };
    case 'bajar':
      return {
        emoji: '📘',
        color: 'text-taller',
        texto: 'Vamos a practicar con historias un poquito mas sencillas.',
      };
    case 'mantener':
      return {
        emoji: '✨',
        color: 'text-turquesa',
        texto: 'Te mantienes en tu nivel. Sigue practicando!',
      };
  }
}

export default function ResultadoSesion({
  resultado,
  studentNombre,
  onLeerOtra,
  onVolver,
}: ResultadoSesionProps) {
  const router = useRouter();
  const ratio = resultado.totalPreguntas > 0 ? resultado.aciertos / resultado.totalPreguntas : 0;
  const [mostrarCelebracion, setMostrarCelebracion] = useState(() => ratio >= 0.75);

  const mensaje = getMensajeMotivacional(resultado.aciertos, resultado.totalPreguntas);
  const nivelInfo = getNivelTexto(resultado.direccion);

  return (
    <div className="animate-scale-in w-full max-w-md mx-auto text-center">
      <Celebracion
        visible={mostrarCelebracion}
        onClose={() => setMostrarCelebracion(false)}
      />

      {/* Emoji principal */}
      <div className="text-6xl mb-4">
        {ratio >= 1 ? '🏆' : ratio >= 0.75 ? '🌟' : ratio >= 0.5 ? '👏' : '💪'}
      </div>

      {/* Mensaje */}
      <h1 className="text-2xl font-extrabold text-texto mb-2">
        {studentNombre}!
      </h1>
      <p className="text-base text-texto-suave mb-6 max-w-xs mx-auto">
        {mensaje}
      </p>

      {/* Score visual */}
      <div className="bg-superficie rounded-3xl p-5 shadow-sm border border-neutro/10 mb-5">
        {/* Aciertos */}
        <div className="flex justify-center gap-3 mb-4">
          {Array.from({ length: resultado.totalPreguntas }, (_, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                i < resultado.aciertos
                  ? 'bg-bosque/15'
                  : 'bg-neutro/10'
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {i < resultado.aciertos ? '✅' : '⬜'}
            </div>
          ))}
        </div>

        <p className="text-lg font-bold text-texto">
          {resultado.aciertos} de {resultado.totalPreguntas} correctas
        </p>

        {/* Estrellas */}
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={`text-2xl ${i < resultado.estrellas ? 'star-active' : 'opacity-30'}`}>
              ⭐
            </span>
          ))}
        </div>
      </div>

      {/* Cambio de nivel */}
      <div className={`rounded-2xl p-4 mb-6 ${
        resultado.direccion === 'subir' ? 'bg-bosque/10' :
        resultado.direccion === 'bajar' ? 'bg-taller/10' :
        'bg-turquesa/10'
      }`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-xl">{nivelInfo.emoji}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-texto-suave">{resultado.nivelAnterior}</span>
            <span className="text-texto-suave">→</span>
            <span className={`text-lg font-bold ${nivelInfo.color}`}>{resultado.nivelNuevo}</span>
          </div>
        </div>
        <p className="text-sm text-texto-suave">
          {nivelInfo.texto}
        </p>
      </div>

      {/* Botones */}
      <div className="flex flex-col gap-3">
        <BotonGrande
          variante="primario"
          icono="📖"
          texto="Leer otra historia"
          tamano="normal"
          onClick={onLeerOtra}
          ariaLabel="Leer otra historia"
        />
        <button
          type="button"
          onClick={() => router.push('/jugar/progreso')}
          className="
            inline-flex items-center justify-center gap-2
            text-turquesa text-sm font-semibold py-3
            hover:text-turquesa/80 transition-colors
            touch-manipulation
          "
        >
          <span>📊</span> Ver mi progreso
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="
            text-texto-suave text-sm font-medium py-3
            hover:text-texto transition-colors
            touch-manipulation
          "
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
