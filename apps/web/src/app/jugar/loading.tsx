/**
 * Loading state para la zona del nino.
 * Next.js lo muestra automaticamente durante la carga de la ruta.
 */
export default function JugarLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo">
      <div className="text-center animate-pulse-brillo">
        <span className="text-5xl">📚</span>
        <p className="mt-3 text-texto-suave font-semibold">Cargando...</p>
      </div>
    </main>
  );
}
