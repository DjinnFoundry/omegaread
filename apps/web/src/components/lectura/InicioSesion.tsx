'use client';

/**
 * Pantalla de inicio de sesion de lectura.
 * El nino ve su nivel y elige un tema especifico de "Como funciona..."
 * organizado por categorias STEM.
 */
import { useState, useCallback, useMemo } from 'react';
import { CATEGORIAS, TOPICS_SEED, type TopicSeed, type CategoriaInfo } from '@/lib/data/topics';
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
  const [categoriaAbierta, setCategoriaAbierta] = useState<string | null>(null);

  // Filtrar topics por edad y agrupar por categoria
  const topicsPorEdad = useMemo(
    () => TOPICS_SEED.filter(t => edadAnos >= t.edadMinima && edadAnos <= t.edadMaxima),
    [edadAnos],
  );

  // Separar categorias favoritas de las demas
  const { categoriasFav, categoriasOtras } = useMemo(() => {
    const catConTopics = CATEGORIAS.filter(cat =>
      topicsPorEdad.some(t => t.categoria === cat.slug),
    );
    const fav = catConTopics.filter(c => intereses.includes(c.slug));
    const otras = catConTopics.filter(c => !intereses.includes(c.slug));
    return { categoriasFav: fav, categoriasOtras: otras };
  }, [topicsPorEdad, intereses]);

  const topicsDeCategoria = useCallback(
    (catSlug: string) => topicsPorEdad.filter(t => t.categoria === catSlug),
    [topicsPorEdad],
  );

  const handleToggleCategoria = useCallback((catSlug: string) => {
    setCategoriaAbierta(prev => (prev === catSlug ? null : catSlug));
  }, []);

  const handleStart = useCallback(() => {
    if (!topicSeleccionado || generando) return;
    onStart(topicSeleccionado);
  }, [topicSeleccionado, generando, onStart]);

  const topicActivo = topicSeleccionado
    ? TOPICS_SEED.find(t => t.slug === topicSeleccionado)
    : null;

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-5">
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
      <div className="mb-5">
        <p className="text-base font-semibold text-texto mb-3 text-center">
          Que quieres descubrir hoy?
        </p>

        {/* Categorias favoritas */}
        {categoriasFav.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-texto-suave mb-2 px-1">Tus favoritos</p>
            <CategoriaList
              categorias={categoriasFav}
              categoriaAbierta={categoriaAbierta}
              topicSeleccionado={topicSeleccionado}
              onToggleCategoria={handleToggleCategoria}
              onSelectTopic={setTopicSeleccionado}
              topicsDeCategoria={topicsDeCategoria}
            />
          </div>
        )}

        {/* Otras categorias */}
        {categoriasOtras.length > 0 && (
          <div>
            {categoriasFav.length > 0 && (
              <p className="text-xs text-texto-suave mb-2 px-1">Mas temas</p>
            )}
            <CategoriaList
              categorias={categoriasOtras}
              categoriaAbierta={categoriaAbierta}
              topicSeleccionado={topicSeleccionado}
              onToggleCategoria={handleToggleCategoria}
              onSelectTopic={setTopicSeleccionado}
              topicsDeCategoria={topicsDeCategoria}
            />
          </div>
        )}
      </div>

      {/* Topic seleccionado preview */}
      {topicActivo && (
        <div className="mb-5 rounded-2xl bg-turquesa/10 border border-turquesa/20 p-3 text-center animate-fade-in">
          <p className="text-sm text-texto">
            <span className="text-lg mr-1">{topicActivo.emoji}</span>
            {topicActivo.nombre}
          </p>
          <p className="text-xs text-texto-suave mt-0.5">
            {topicActivo.descripcion}
          </p>
        </div>
      )}

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

// ─────────────────────────────────────────────

function CategoriaList({
  categorias,
  categoriaAbierta,
  topicSeleccionado,
  onToggleCategoria,
  onSelectTopic,
  topicsDeCategoria,
}: {
  categorias: CategoriaInfo[];
  categoriaAbierta: string | null;
  topicSeleccionado: string | null;
  onToggleCategoria: (slug: string) => void;
  onSelectTopic: (slug: string) => void;
  topicsDeCategoria: (catSlug: string) => TopicSeed[];
}) {
  return (
    <div className="space-y-2">
      {categorias.map(cat => {
        const abierta = categoriaAbierta === cat.slug;
        const topics = topicsDeCategoria(cat.slug);
        const tieneSeleccion = topics.some(t => t.slug === topicSeleccionado);

        return (
          <div key={cat.slug}>
            {/* Categoria header */}
            <button
              type="button"
              onClick={() => onToggleCategoria(cat.slug)}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-2xl
                transition-all duration-150
                active:scale-[0.98] touch-manipulation
                ${abierta
                  ? 'bg-superficie border-2 border-turquesa/30 shadow-sm'
                  : tieneSeleccion
                    ? 'bg-turquesa/5 border-2 border-turquesa/20'
                    : 'bg-superficie border-2 border-transparent hover:border-neutro/20'
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-sm font-semibold text-texto">{cat.nombre}</span>
                <span className="text-[10px] text-texto-suave bg-neutro/10 rounded-full px-2 py-0.5">
                  {topics.length}
                </span>
              </div>
              <span className={`text-texto-suave text-xs transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Topics expandidos */}
            {abierta && (
              <div className="mt-1.5 ml-2 mr-1 space-y-1.5 animate-fade-in">
                {topics.map(topic => {
                  const isSelected = topicSeleccionado === topic.slug;
                  return (
                    <button
                      key={topic.slug}
                      type="button"
                      onClick={() => onSelectTopic(topic.slug)}
                      className={`
                        w-full flex items-center gap-2.5
                        px-3.5 py-2.5 rounded-xl text-left
                        transition-all duration-150
                        active:scale-[0.98] touch-manipulation
                        ${isSelected
                          ? 'bg-turquesa/15 border-2 border-turquesa'
                          : 'bg-superficie/60 border-2 border-transparent hover:border-neutro/20'
                        }
                      `}
                    >
                      <span className="text-lg shrink-0">{topic.emoji}</span>
                      <span className={`text-xs font-medium leading-snug ${isSelected ? 'text-turquesa' : 'text-texto'}`}>
                        {topic.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
