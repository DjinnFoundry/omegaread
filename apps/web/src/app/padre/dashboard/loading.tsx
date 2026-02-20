/**
 * Loading state para el dashboard de padres.
 * Skeleton visual mientras se cargan datos del servidor.
 */
export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-fondo p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-7 w-48 rounded-xl bg-neutro/15 animate-pulse" />
          <div className="mt-2 h-4 w-32 rounded-lg bg-neutro/10 animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-3xl bg-superficie shadow-sm animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
