'use client';

/**
 * Sidebar de navegacion del dashboard del padre.
 * Desktop (>=768px): sidebar fijo a la izquierda, 220px.
 * Mobile (<768px): bottom navigation bar con 5 iconos.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, Route, UserRound, History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: readonly { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: '/padre/dashboard', label: 'Resumen', icon: Home, exact: true },
  { href: '/padre/dashboard/progreso', label: 'Progreso', icon: TrendingUp, exact: false },
  { href: '/padre/dashboard/ruta', label: 'Ruta', icon: Route, exact: false },
  { href: '/padre/dashboard/perfil', label: 'Perfil', icon: UserRound, exact: false },
  { href: '/padre/dashboard/historial', label: 'Historial', icon: History, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden md:flex fixed left-0 top-[49px] bottom-0 w-56 flex-col border-r border-texto/10 bg-white py-4 gap-1 z-40">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 mx-2 rounded-xl
                text-sm font-medium transition-colors
                ${active
                  ? 'bg-turquesa/10 text-turquesa font-semibold border-l-[3px] border-turquesa'
                  : 'text-texto-suave hover:bg-turquesa/5 hover:text-texto border-l-[3px] border-transparent'
                }
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="font-datos">{item.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* ─── Mobile bottom nav ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-white border-t border-texto/10 z-50">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl
                text-xs font-medium transition-colors
                ${active
                  ? 'text-turquesa font-semibold'
                  : 'text-texto-suave'
                }
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="font-datos">{item.label}</span>
              {active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-turquesa" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
