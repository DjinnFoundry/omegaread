'use client';

import { actionLogout } from '@/server/actions/auth-actions';

/** Botón de cerrar sesión */
export function LogoutButton() {
  return (
    <form action={actionLogout}>
      <button
        type="submit"
        className="rounded-xl bg-neutro/20 px-4 py-2 text-sm font-semibold text-texto-suave hover:bg-neutro/30 transition-colors"
      >
        Salir
      </button>
    </form>
  );
}
