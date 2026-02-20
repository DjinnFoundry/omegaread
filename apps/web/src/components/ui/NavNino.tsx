'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStudentProgress } from '@/contexts/StudentProgressContext';

/**
 * Navbar para la zona del nino.
 * Client component: necesita pathname + contexto del estudiante.
 */
export function NavNino() {
  const pathname = usePathname();
  const { estudiante, progress } = useStudentProgress();

  const links = [
    { href: '/jugar/lectura', label: 'Leer', emoji: '📚' },
    { href: '/jugar/progreso', label: 'Progreso', emoji: '📊' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-neutro/10 bg-superficie/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/jugar" className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="text-lg font-extrabold text-texto">OmegaRead</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                pathname === link.href
                  ? 'bg-turquesa/15 text-turquesa'
                  : 'text-texto-suave hover:text-texto'
              }`}
            >
              <span className="text-base">{link.emoji}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {progress.loaded && (
            <span className="text-sm font-bold text-amarillo" title="Estrellas">
              {progress.totalEstrellas} ⭐
            </span>
          )}
          {estudiante && (
            <span className="text-xs text-texto-suave hidden sm:inline">
              {estudiante.nombre}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
