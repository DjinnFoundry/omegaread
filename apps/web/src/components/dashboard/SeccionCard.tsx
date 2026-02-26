/**
 * Card wrapper reutilizable para secciones del dashboard.
 * Consistencia visual: rounded-3xl, bg-superficie, shadow-sm.
 */
export function SeccionCard({
  titulo,
  icon,
  children,
}: {
  titulo: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-superficie p-4 shadow-sm animate-fade-in-up">
      <h3 className="flex items-center gap-2 text-sm font-bold text-texto mb-3 font-datos">
        {icon}
        <span>{titulo}</span>
      </h3>
      {children}
    </div>
  );
}
