'use client';

/**
 * Formulario de perfil enriquecido del nino (llenado por el padre).
 * Secciones: curso/contexto, rutina de lectura, senales de dificultad.
 * Se muestra cuando perfilCompleto = false.
 */
import { useState } from 'react';
import { actualizarPerfilEstudiante } from '@/server/actions/profile-actions';
import { CATEGORIAS } from '@/lib/data/topics';

interface Props {
  studentId: string;
  studentNombre: string;
  onComplete: () => void;
}

const CURSOS = [
  { value: 'infantil-3', label: 'Infantil (3 anos)' },
  { value: 'infantil-4', label: 'Infantil (4 anos)' },
  { value: 'infantil-5', label: 'Infantil (5 anos)' },
  { value: '1o-primaria', label: '1o de Primaria' },
  { value: '2o-primaria', label: '2o de Primaria' },
  { value: '3o-primaria', label: '3o de Primaria' },
  { value: '4o-primaria', label: '4o de Primaria' },
];

const RUTINAS = [
  { value: 'diaria', label: 'Todos los dias', emoji: '📖' },
  { value: 'varias-por-semana', label: 'Varias veces por semana', emoji: '📚' },
  { value: 'ocasional', label: 'De vez en cuando', emoji: '📕' },
  { value: 'rara-vez', label: 'Casi nunca', emoji: '😶' },
];

const ACOMPANAMIENTO = [
  { value: 'siempre', label: 'Siempre lo acompano', emoji: '👨‍👧' },
  { value: 'a-veces', label: 'A veces', emoji: '🤝' },
  { value: 'nunca', label: 'Lee solo/a', emoji: '🧒' },
];

export default function FormularioPerfil({ studentId, studentNombre, onComplete }: Props) {
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: contexto escolar
  const [curso, setCurso] = useState('');
  const [centroEscolar, setCentroEscolar] = useState('');

  // Paso 2: rutina lectura
  const [rutinaLectura, setRutinaLectura] = useState('');
  const [acompanamiento, setAcompanamiento] = useState('');

  // Paso 3: senales + extras
  const [atencion, setAtencion] = useState(false);
  const [vocabulario, setVocabulario] = useState(false);
  const [frustracion, setFrustracion] = useState(false);
  const [otroDetalle, setOtroDetalle] = useState('');
  const [personajesFavoritos, setPersonajesFavoritos] = useState('');
  const [temasEvitar, setTemasEvitar] = useState<string[]>([]);

  const totalPasos = 3;

  function toggleTemaEvitar(slug: string) {
    setTemasEvitar(prev =>
      prev.includes(slug) ? prev.filter(t => t !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    const result = await actualizarPerfilEstudiante({
      studentId,
      curso,
      centroEscolar: centroEscolar || undefined,
      rutinaLectura,
      acompanamiento,
      senalesDificultad: {
        atencion: atencion || undefined,
        vocabulario: vocabulario || undefined,
        frustracion: frustracion || undefined,
        otroDetalle: otroDetalle || undefined,
      },
      personajesFavoritos: personajesFavoritos || undefined,
      temasEvitar: temasEvitar.length > 0 ? temasEvitar : undefined,
    });

    if (result.ok) {
      onComplete();
    } else {
      setError(result.error ?? 'Error al guardar el perfil');
      setLoading(false);
    }
  }

  function canAdvance(): boolean {
    if (paso === 1) return !!curso;
    if (paso === 2) return !!rutinaLectura && !!acompanamiento;
    return true; // Paso 3 es todo opcional
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <span className="text-4xl">📝</span>
        <h2 className="mt-2 text-2xl font-bold text-texto">
          Perfil de {studentNombre}
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          Paso {paso} de {totalPasos}
        </p>
        {/* Barra de progreso */}
        <div className="mt-3 h-2 rounded-full bg-neutro/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-turquesa transition-all duration-300"
            style={{ width: `${(paso / totalPasos) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-error-suave p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* PASO 1: Contexto escolar */}
      {paso === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <label htmlFor="curso" className="block text-sm font-semibold text-texto mb-2">
              Curso actual
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CURSOS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCurso(c.value)}
                  className={`rounded-2xl border-2 px-3 py-3 text-sm font-medium transition-all
                    ${curso === c.value
                      ? 'border-turquesa bg-turquesa/10 text-turquesa'
                      : 'border-neutro/20 bg-superficie text-texto hover:border-turquesa/50'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="centroEscolar" className="block text-sm font-semibold text-texto mb-1">
              Centro escolar <span className="text-texto-suave font-normal">(opcional)</span>
            </label>
            <input
              id="centroEscolar"
              type="text"
              value={centroEscolar}
              onChange={e => setCentroEscolar(e.target.value)}
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Nombre del colegio"
            />
          </div>
        </div>
      )}

      {/* PASO 2: Rutina de lectura */}
      {paso === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <p className="text-sm font-semibold text-texto mb-2">
              Con que frecuencia lee {studentNombre}?
            </p>
            <div className="space-y-2">
              {RUTINAS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRutinaLectura(r.value)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all flex items-center gap-3
                    ${rutinaLectura === r.value
                      ? 'border-turquesa bg-turquesa/10 text-turquesa'
                      : 'border-neutro/20 bg-superficie text-texto hover:border-turquesa/50'
                    }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-texto mb-2">
              Lo acompanas cuando lee?
            </p>
            <div className="space-y-2">
              {ACOMPANAMIENTO.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAcompanamiento(a.value)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all flex items-center gap-3
                    ${acompanamiento === a.value
                      ? 'border-turquesa bg-turquesa/10 text-turquesa'
                      : 'border-neutro/20 bg-superficie text-texto hover:border-turquesa/50'
                    }`}
                >
                  <span className="text-xl">{a.emoji}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: Senales + preferencias */}
      {paso === 3 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <p className="text-sm font-semibold text-texto mb-2">
              Has notado alguna de estas dificultades?
              <span className="text-texto-suave font-normal"> (opcional)</span>
            </p>
            <div className="space-y-2">
              {[
                { key: 'atencion', label: 'Se distrae facilmente al leer', emoji: '🦋', value: atencion, setter: setAtencion },
                { key: 'vocabulario', label: 'Le cuesta entender palabras nuevas', emoji: '🤔', value: vocabulario, setter: setVocabulario },
                { key: 'frustracion', label: 'Se frustra cuando no entiende', emoji: '😤', value: frustracion, setter: setFrustracion },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => item.setter(!item.value)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-all flex items-center gap-3
                    ${item.value
                      ? 'border-coral bg-coral/10 text-coral'
                      : 'border-neutro/20 bg-superficie text-texto hover:border-neutro/40'
                    }`}
                >
                  <span className="text-xl">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={otroDetalle}
              onChange={e => setOtroDetalle(e.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-sm text-texto outline-none focus:border-turquesa transition-colors resize-none"
              placeholder="Algo mas que quieras comentar..."
              rows={2}
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-texto mb-1">
              Personajes favoritos <span className="text-texto-suave font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={personajesFavoritos}
              onChange={e => setPersonajesFavoritos(e.target.value)}
              className="w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-3 text-sm text-texto outline-none focus:border-turquesa transition-colors"
              placeholder="Ej: Spiderman, Elsa, dinosaurios..."
              maxLength={300}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-texto mb-2">
              Temas a evitar <span className="text-texto-suave font-normal">(opcional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => toggleTemaEvitar(cat.slug)}
                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1
                    ${temasEvitar.includes(cat.slug)
                      ? 'border-coral bg-coral/10 text-coral'
                      : 'border-neutro/20 bg-superficie text-texto-suave hover:border-neutro/40'
                    }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navegacion */}
      <div className="mt-8 flex gap-3">
        {paso > 1 && (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="flex-1 rounded-2xl border-2 border-neutro/30 px-4 py-3 text-sm font-bold text-texto-suave hover:border-neutro/50 transition-all"
          >
            Atras
          </button>
        )}

        {paso < totalPasos ? (
          <button
            type="button"
            onClick={() => setPaso(paso + 1)}
            disabled={!canAdvance()}
            className="flex-1 rounded-2xl bg-turquesa px-4 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-2xl bg-coral px-4 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </button>
        )}
      </div>
    </div>
  );
}
