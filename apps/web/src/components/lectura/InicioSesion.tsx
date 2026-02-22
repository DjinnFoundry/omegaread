'use client';

/**
 * Pantalla de inicio de sesion de lectura.
 * Muestra dominios con skills expandibles (tech tree).
 * El nino elige una skill (1 tap = empieza la historia)
 * o pulsa "Sorprendeme!" para una skill aleatoria.
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DOMINIOS,
  getSkillsPorEdad,
  type DominioInfo,
  type SkillDef,
} from '@/lib/data/skills';

interface InicioSesionProps {
  studentNombre: string;
  intereses: string[];
  edadAnos: number;
  onStart: (skillSlug: string) => void;
  generando: boolean;
}

export default function InicioSesion({
  studentNombre,
  intereses,
  edadAnos,
  onStart,
  generando,
}: InicioSesionProps) {
  const router = useRouter();
  const [dominioAbierto, setDominioAbierto] = useState<string | null>(null);

  // Skills filtradas por edad
  const skillsPorEdad = useMemo(
    () => getSkillsPorEdad(edadAnos),
    [edadAnos],
  );

  // Separar dominios favoritos de los demas
  const { dominiosFav, dominiosOtros } = useMemo(() => {
    const dominiosConSkills = DOMINIOS.filter(dom =>
      skillsPorEdad.some(s => s.dominio === dom.slug),
    );
    const fav = dominiosConSkills.filter(d => intereses.includes(d.slug));
    const otros = dominiosConSkills.filter(d => !intereses.includes(d.slug));
    return { dominiosFav: fav, dominiosOtros: otros };
  }, [skillsPorEdad, intereses]);

  const skillsDeDominio = useCallback(
    (dominioSlug: string) =>
      skillsPorEdad
        .filter(s => s.dominio === dominioSlug)
        .sort((a, b) => a.nivel - b.nivel || a.orden - b.orden),
    [skillsPorEdad],
  );

  const handleToggleDominio = useCallback((slug: string) => {
    setDominioAbierto(prev => (prev === slug ? null : slug));
  }, []);

  // "Sorprendeme!" - random skill pesada hacia favoritos
  const handleSorprendeme = useCallback(() => {
    if (generando) return;
    const favSkills = skillsPorEdad.filter(s => intereses.includes(s.dominio));
    const otrasSkills = skillsPorEdad.filter(s => !intereses.includes(s.dominio));

    let pool: SkillDef[];
    if (favSkills.length > 0 && (otrasSkills.length === 0 || Math.random() < 0.7)) {
      pool = favSkills;
    } else if (otrasSkills.length > 0) {
      pool = otrasSkills;
    } else {
      pool = skillsPorEdad;
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) onStart(pick.slug);
  }, [generando, skillsPorEdad, intereses, onStart]);

  const handleSkillClick = useCallback((slug: string) => {
    if (generando) return;
    onStart(slug);
  }, [generando, onStart]);

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-5">
        <span className="text-5xl">📚</span>
        <h1 className="mt-3 text-2xl font-extrabold text-texto">
          Hola, {studentNombre}!
        </h1>
        <p className="mt-2 text-sm text-texto-suave leading-relaxed">
          Empezamos con un nivel inicial segun tu edad y lo ajustamos automaticamente
          segun tus respuestas de comprension.
        </p>
      </div>

      {/* Sorprendeme button */}
      <div className="mb-5">
        <button
          type="button"
          onClick={handleSorprendeme}
          disabled={generando}
          className="
            w-full flex items-center justify-center gap-2.5
            px-4 py-3.5 rounded-2xl
            bg-gradient-to-r from-coral to-coral/80
            text-white font-bold text-base
            shadow-md hover:shadow-lg
            transition-all duration-150
            active:scale-[0.98] touch-manipulation
            disabled:opacity-50
          "
        >
          <span className="text-xl">🎲</span>
          Sorprendeme!
        </button>
      </div>

      {/* Skill selector */}
      <div className="mb-5">
        <p className="text-base font-semibold text-texto mb-3 text-center">
          Que quieres descubrir hoy?
        </p>

        {/* Dominios favoritos */}
        {dominiosFav.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-texto-suave mb-2 px-1">Tus favoritos</p>
            <DominioList
              dominios={dominiosFav}
              dominioAbierto={dominioAbierto}
              onToggleDominio={handleToggleDominio}
              onSelectSkill={handleSkillClick}
              skillsDeDominio={skillsDeDominio}
              generando={generando}
            />
          </div>
        )}

        {/* Otros dominios */}
        {dominiosOtros.length > 0 && (
          <div>
            {dominiosFav.length > 0 && (
              <p className="text-xs text-texto-suave mb-2 px-1">Mas temas</p>
            )}
            <DominioList
              dominios={dominiosOtros}
              dominioAbierto={dominioAbierto}
              onToggleDominio={handleToggleDominio}
              onSelectSkill={handleSkillClick}
              skillsDeDominio={skillsDeDominio}
              generando={generando}
            />
          </div>
        )}
      </div>

      {/* Volver al dashboard */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push('/padre')}
          className="text-sm text-texto-suave hover:text-texto transition-colors py-2 touch-manipulation"
        >
          ← Volver al panel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────

const NIVEL_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: 'L1', color: 'bg-turquesa/15 text-turquesa' },
  2: { label: 'L2', color: 'bg-coral/15 text-coral' },
  3: { label: 'L3', color: 'bg-violeta/15 text-violeta' },
};

function DominioList({
  dominios,
  dominioAbierto,
  onToggleDominio,
  onSelectSkill,
  skillsDeDominio,
  generando,
}: {
  dominios: DominioInfo[];
  dominioAbierto: string | null;
  onToggleDominio: (slug: string) => void;
  onSelectSkill: (slug: string) => void;
  skillsDeDominio: (dominioSlug: string) => SkillDef[];
  generando: boolean;
}) {
  return (
    <div className="space-y-2">
      {dominios.map(dom => {
        const abierto = dominioAbierto === dom.slug;
        const skills = skillsDeDominio(dom.slug);

        return (
          <div key={dom.slug}>
            {/* Dominio header */}
            <button
              type="button"
              onClick={() => onToggleDominio(dom.slug)}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-2xl
                transition-all duration-150
                active:scale-[0.98] touch-manipulation
                ${abierto
                  ? 'bg-superficie border-2 border-turquesa/30 shadow-sm'
                  : 'bg-superficie border-2 border-transparent hover:border-neutro/20'
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{dom.emoji}</span>
                <span className="text-sm font-semibold text-texto">{dom.nombre}</span>
                <span className="text-[10px] text-texto-suave bg-neutro/10 rounded-full px-2 py-0.5">
                  {skills.length}
                </span>
              </div>
              <span className={`text-texto-suave text-xs transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Skills expandidas - click = start */}
            {abierto && (
              <div className="mt-1.5 ml-2 mr-1 space-y-1.5 animate-fade-in">
                {skills.map(skill => {
                  const badge = NIVEL_BADGE[skill.nivel] ?? NIVEL_BADGE[1];
                  return (
                    <button
                      key={skill.slug}
                      type="button"
                      disabled={generando}
                      onClick={() => onSelectSkill(skill.slug)}
                      className="
                        w-full flex items-center gap-2.5
                        px-3.5 py-2.5 rounded-xl text-left
                        transition-all duration-150
                        active:scale-[0.98] touch-manipulation
                        bg-superficie/60 border-2 border-transparent
                        hover:border-turquesa/30 hover:bg-turquesa/5
                        disabled:opacity-50
                      "
                    >
                      <span className="text-lg shrink-0">{skill.emoji}</span>
                      <span className="text-xs font-medium leading-snug text-texto flex-1">
                        {skill.nombre}
                      </span>
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${badge.color}`}>
                        {badge.label}
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
