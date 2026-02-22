import Link from 'next/link';

/**
 * Navbar para la zona de padres.
 * Server component, recibe el nombre del padre como prop.
 */
export function NavPadre({ nombrePadre }: { nombrePadre: string }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-neutro/10 bg-superficie/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/padre/dashboard" className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="text-lg font-extrabold text-texto">OmegaRead</span>
        </Link>

        <span className="text-sm text-texto-suave">
          {nombrePadre}
        </span>
      </div>
    </nav>
  );
}
