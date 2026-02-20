'use client';

/**
 * Pantalla de inicio de sesion de lectura.
 * El nino ve su nivel, elige un topic, y pulsa "Empezar a leer".
 */
import { useState, useCallback } from 'react';
import { TOPICS_SEED, type TopicSeed } from '@/lib/data/topics';
import { BotonGrande } from '@/components/ui/BotonGrande';

interface InicioSesionProps {
  studentNombre: string;
  nivelLectura: number;
  intereses: string[];
  edadAnos: number;
  onStart: (topicSlug: string) => void;
  generando: boolean;
}

export default function InicioSesion({
  studentNombre,
  nivelLectura,
  intereses,
  edadAnos,
  onStart,
  generando,
}: InicioSesionProps) {
  const [topicSeleccionado, setTopicSeleccionado] = useState<string | null>(null);

  // Filtrar topics por edad y priorizar intereses
  const topicsDisponibles = TOPICS_SEED.filter(
    t => edadAnos >= t.edadMinima && edadAnos <= t.edadMaxima
  );

  const topicsIntereses = topicsDisponibles.filter(t => intereses.includes(t.slug));
  const topicsOtros = topicsDisponibles.filter(t => !intereses.includes(t.slug));

  const handleStart = useCallback(() => {
    if (!topicSeleccionado || generando) return;
    onStart(topicSeleccionado);
  }, [topicSeleccionado, generando, onStart]);

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl">📚</span>
        <h1 className="mt-3 text-2xl font-extrabold text-texto">
          Hola, {studentNombre}!
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 bg-turquesa/10 rounded-full px-4 py-1.5">
          <span className="text-sm text-texto-suave">Nivel</span>
          <span className="text-lg font-bold text-turquesa">{nivelLectura}</span>
        </div>
      </div>

      {/* Topic selector */}
      <div className="mb-6">
        <p className="text-base font-semibold text-texto mb-3 text-center">
          Elige sobre que quieres leer hoy:
        </p>

        {/* Intereses del nino primero */}
        {topicsIntereses.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-texto-suave mb-2 px-1">Tus favoritos</p>
            <TopicGrid
              topics={topicsIntereses}
              seleccionado={topicSeleccionado}
              onSelect={setTopicSeleccionado}
            />
          </div>
        )}

        {/* Otros topics */}
        {topicsOtros.length > 0 && (
          <div>
            {topicsIntereses.length > 0 && (
              <p className="text-xs text-texto-suave mb-2 px-1">Otros temas</p>
            )}
            <TopicGrid
              topics={topicsOtros}
              seleccionado={topicSeleccionado}
              onSelect={setTopicSeleccionado}
            />
          </div>
        )}
      </div>

      {/* Start button */}
      <div className="text-center">
        <BotonGrande
          variante="primario"
          icono="📖"
          texto={generando ? 'Creando tu historia...' : 'Empezar a leer'}
          tamano="grande"
          deshabilitado={!topicSeleccionado || generando}
          onClick={handleStart}
          ariaLabel="Empezar a leer"
        />
      </div>
    </div>
  );
}

function TopicGrid({
  topics,
  seleccionado,
  onSelect,
}: {
  topics: TopicSeed[];
  seleccionado: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {topics.map(topic => {
        const isSelected = seleccionado === topic.slug;
        return (
          <button
            key={topic.slug}
            type="button"
            onClick={() => onSelect(topic.slug)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-2xl
              transition-all duration-150
              active:scale-95 touch-manipulation
              ${isSelected
                ? 'bg-turquesa/15 border-2 border-turquesa shadow-sm'
                : 'bg-superficie border-2 border-transparent hover:border-neutro/20'
              }
            `}
          >
            <span className="text-2xl" role="presentation">{topic.emoji}</span>
            <span className={`text-xs font-medium ${isSelected ? 'text-turquesa' : 'text-texto-suave'}`}>
              {topic.nombre}
            </span>
          </button>
        );
      })}
    </div>
  );
}
