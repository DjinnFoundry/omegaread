import { obtenerPadreActual } from '@/server/auth';
import { NavPadre } from '@/components/ui/NavPadre';

export const dynamic = 'force-dynamic';

/**
 * Layout para la zona de padres.
 * Muestra navbar con nombre del padre si esta autenticado.
 */
export default async function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const padre = await obtenerPadreActual();

  return (
    <>
      {padre && <NavPadre nombrePadre={padre.nombre} />}
      {children}
    </>
  );
}
