'use client';

/**
 * Formulario de contexto personal del nino.
 * Paso del onboarding donde el padre describe a su hijo en texto libre.
 * Este contexto se usa para personalizar las historias generadas.
 */
import { useState } from 'react';
import { guardarContextoPersonal } from '@/server/actions/profile-actions';

interface Props {
  studentId: string;
  studentNombre: string;
  onComplete: () => void;
}

const MAX_CHARS = 2000;

const PLACEHOLDER = `Ej: A Dario le encanta el futbol y su jugador favorito es Messi. Tiene una hermana que se llama Lucia. Tenemos un perro que se llama Rocky. Le gustan los dinosaurios, especialmente el T-Rex. Va al colegio San Jose y su mejor amigo se llama Pablo.`;

export default function FormularioContexto({ studentId, studentNombre, onComplete }: Props) {
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGuardar() {
    setError('');
    setLoading(true);
    try {
      await guardarContextoPersonal({
        studentId,
        contextoPersonal: texto || undefined,
      });
      onComplete();
    } catch {
      setError('Error al guardar');
      setLoading(false);
    }
  }

  const charsRestantes = MAX_CHARS - texto.length;

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <span className="text-5xl">💬</span>
      <h2 className="mt-3 text-2xl font-extrabold text-texto">
        Cuentanos sobre {studentNombre}
      </h2>
      <p className="mt-1 text-base text-texto-suave">
        Cuanto mas sepamos, mejores seran las historias
      </p>

      {error && (
        <div className="mt-3 rounded-2xl bg-error-suave p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <textarea
        value={texto}
        onChange={e => {
          if (e.target.value.length <= MAX_CHARS) {
            setTexto(e.target.value);
          }
        }}
        className="mt-5 w-full rounded-2xl border-2 border-neutro/30 bg-superficie px-4 py-4 text-sm text-texto outline-none focus:border-turquesa transition-colors resize-none leading-relaxed"
        placeholder={PLACEHOLDER}
        rows={6}
      />

      <div className="mt-2 flex justify-between text-xs text-texto-suave">
        <span>
          {texto.length === 0
            ? 'Puedes saltar este paso, pero te lo recomendamos'
            : `${texto.length} / ${MAX_CHARS} caracteres`}
        </span>
        {texto.length > 0 && charsRestantes < 200 && (
          <span className={charsRestantes < 50 ? 'text-coral' : ''}>
            Quedan {charsRestantes}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={loading}
          className="w-full rounded-2xl bg-coral px-6 py-4 text-lg font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Guardando...' : texto.length > 0 ? 'Continuar' : 'Saltar por ahora'}
        </button>
      </div>

      {texto.length === 0 && (
        <p className="mt-3 text-xs text-texto-suave italic">
          Puedes completar esto mas tarde desde el perfil de {studentNombre}
        </p>
      )}
    </div>
  );
}
