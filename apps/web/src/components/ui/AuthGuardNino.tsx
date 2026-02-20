'use client';

/**
 * Guard de autenticación para rutas del niño.
 *
 * Muestra una pantalla amigable si no hay sesión de padre activa,
 * en vez de crashear o mostrar errores técnicos.
 * Pensado para ser entendido por niños de 4-5 años (con ayuda visual).
 */

interface AuthGuardNinoProps {
  /** Tipo de problema: sin sesión de padre, o sin perfil creado */
  tipo: 'sin-sesion' | 'sin-perfil';
}

export function AuthGuardNino({ tipo }: AuthGuardNinoProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fondo p-6">
      <span className="text-6xl animate-bounce-suave" role="presentation">
        {tipo === 'sin-sesion' ? '🔒' : '🐱'}
      </span>
      <h1 className="text-2xl font-extrabold text-texto text-center">
        {tipo === 'sin-sesion'
          ? '¡Necesitamos a mamá o papá!'
          : '¡Primero un padre debe crear tu perfil!'}
      </h1>
      <p className="text-base text-texto-suave text-center max-w-xs">
        {tipo === 'sin-sesion'
          ? 'Pide a un adulto que inicie sesión para que puedas jugar.'
          : 'Un adulto necesita crear tu cuenta para empezar la aventura.'}
      </p>
      <a
        href="/padre/login"
        className="rounded-3xl bg-turquesa px-8 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-transform"
      >
        {tipo === 'sin-sesion' ? '👨‍👩‍👧 Ir a inicio de sesión' : '👨‍👩‍👧 Ir a inicio'}
      </a>
    </main>
  );
}
