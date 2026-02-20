import Link from 'next/link';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

/**
 * Navbar para la zona de padres.
 * Server component, recibe el nombre del padre como prop.
 */
export function NavPadre({ nombrePadre }: { nombrePadre: string }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutro/10 bg-superficie/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="text-lg font-extrabold text-texto">OmegaRead</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-texto-suave sm:inline">
            {nombrePadre}
          </span>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
