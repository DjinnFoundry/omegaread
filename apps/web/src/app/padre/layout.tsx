export const dynamic = 'force-dynamic';

/**
 * Layout para la zona de padres.
 * NavPadre was removed: the DashboardShell provides its own navigation via
 * DashboardSidebar (desktop) and bottom tab bar (mobile).
 * Non-dashboard pages (login, registro, nuevo-hijo) have their own headers.
 */
export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
