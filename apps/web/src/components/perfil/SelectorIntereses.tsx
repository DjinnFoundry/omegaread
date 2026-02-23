'use client';

/**
 * Selector visual de intereses/personalidad del nino.
 * Tag cloud de chips predefinidos y tags custom.
 */
import { type FormEvent, useState } from 'react';
import { guardarIntereses } from '@/server/actions/profile-actions';
import { INTEREST_TAGS } from '@/lib/data/interest-tags';

const CUSTOM_PREFIX = 'custom:';
const PREDEFINED_SLUGS = new Set(INTEREST_TAGS.map((tag) => tag.slug));
const TAG_GROUPS = [1, 2, 3] as const;

const TAGS_BY_GROUP = TAG_GROUPS.map((group) =>
  INTEREST_TAGS.filter((tag) => tag.grupo === group),
);

function slugifyCustomTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatCustomLabel(customSlug: string): string {
  return customSlug.replace(CUSTOM_PREFIX, '').replace(/-/g, ' ').trim();
}

function initialSelection(interesesActuales: string[]): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const interest of interesesActuales) {
    const candidate = interest.trim();
    if (!candidate) continue;
    if (!PREDEFINED_SLUGS.has(candidate) && !candidate.startsWith(CUSTOM_PREFIX)) continue;
    if (seen.has(candidate)) continue;

    seen.add(candidate);
    selected.push(candidate);
  }

  return selected;
}

function initialCustomLabels(interesesActuales: string[]): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const interest of interesesActuales) {
    const candidate = interest.trim();
    if (!candidate.startsWith(CUSTOM_PREFIX)) continue;
    labels[candidate] = formatCustomLabel(candidate);
  }

  return labels;
}

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
  const [seleccionados, setSeleccionados] = useState<string[]>(() =>
    initialSelection(interesesActuales),
  );
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(() =>
    initialCustomLabels(interesesActuales),
  );
  const [nuevoCustom, setNuevoCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleTag(slug: string) {
    setSeleccionados(prev => {
      if (prev.includes(slug)) return prev.filter(s => s !== slug);
      return [...prev, slug];
    });
  }

  function agregarCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limpio = nuevoCustom.trim();
    if (!limpio) return;

    const slugCustom = slugifyCustomTag(limpio);
    if (!slugCustom) return;

    const valor = `${CUSTOM_PREFIX}${slugCustom}`;
    setCustomLabels(prev => ({ ...prev, [valor]: limpio }));
    setSeleccionados(prev => (prev.includes(valor) ? prev : [...prev, valor]));
    setNuevoCustom('');
  }

  function borrarCustom(slug: string) {
    setSeleccionados(prev => prev.filter((item) => item !== slug));
    setCustomLabels(prev => {
      if (!(slug in prev)) return prev;
      const { [slug]: _removed, ...rest } = prev;
      return rest;
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

  const customSeleccionados = seleccionados.filter((item) => item.startsWith(CUSTOM_PREFIX));

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <span className="text-5xl">🌟</span>
      <h2 className="mt-3 text-2xl font-extrabold text-texto">
        Como es {studentNombre}?
      </h2>
      <p className="mt-1 text-base text-texto-suave">
        Selecciona lo que mejor le describe
      </p>

      {error && (
        <div className="mt-3 rounded-2xl bg-error-suave p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {TAGS_BY_GROUP.map((groupTags, groupIndex) => (
          <div
            key={groupIndex}
            className={`flex flex-wrap justify-center gap-2 ${groupIndex > 0 ? 'pt-1' : ''}`}
          >
            {groupTags.map((tag) => {
              const activo = seleccionados.includes(tag.slug);
              return (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => toggleTag(tag.slug)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all active:scale-95
                    ${activo
                      ? 'bg-turquesa/15 border border-turquesa text-turquesa font-semibold'
                      : 'border border-neutro/30 bg-superficie text-texto'
                    }`}
                  aria-pressed={activo}
                  aria-label={tag.label}
                >
                  <span aria-hidden>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <form onSubmit={agregarCustom} className="mt-5">
        <div className="mx-auto flex w-full max-w-md items-center gap-2">
          <input
            type="text"
            value={nuevoCustom}
            onChange={(event) => setNuevoCustom(event.target.value)}
            placeholder="Anadir otra cosa..."
            className="w-full rounded-full border border-neutro/30 bg-superficie px-4 py-2 text-sm text-texto outline-none transition focus:border-turquesa"
            maxLength={50}
            aria-label="Anadir un interes personalizado"
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-coral text-xl font-bold text-white transition hover:opacity-90 active:scale-95"
            aria-label="Anadir tag personalizado"
          >
            +
          </button>
        </div>
      </form>

      {customSeleccionados.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {customSeleccionados.map((slug) => (
            <span
              key={slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-turquesa bg-turquesa/15 px-3 py-1.5 text-sm font-semibold text-turquesa"
            >
              <span>✨ {customLabels[slug] ?? formatCustomLabel(slug)}</span>
              <button
                type="button"
                onClick={() => borrarCustom(slug)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-turquesa/20 text-xs leading-none"
                aria-label={`Eliminar ${customLabels[slug] ?? formatCustomLabel(slug)}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-texto-suave">
        {seleccionados.length === 0
          ? 'Selecciona al menos 1 tag'
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
