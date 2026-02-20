'use server';

/**
 * Server Actions para autenticación de padres
 */
import { redirect } from 'next/navigation';
import { registrarPadre, loginPadre, logoutPadre } from '../auth';

export type AuthResult = {
  ok: boolean;
  error?: string;
};

/** Acción: Registrar nuevo padre */
export async function actionRegistro(formData: FormData): Promise<AuthResult> {
  const nombre = formData.get('nombre') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!nombre || !email || !password) {
    return { ok: false, error: 'Todos los campos son obligatorios' };
  }

  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  try {
    await registrarPadre({ email, password, nombre });
    // Auto-login después de registro
    await loginPadre(email, password);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message.includes('unique') || message.includes('duplicate')) {
      return { ok: false, error: 'Ya existe una cuenta con este email' };
    }
    return { ok: false, error: 'Error al crear la cuenta. Inténtalo de nuevo.' };
  }

  redirect('/padre/dashboard');
}

/** Acción: Iniciar sesión */
export async function actionLogin(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { ok: false, error: 'Email y contraseña son obligatorios' };
  }

  const padre = await loginPadre(email, password);
  if (!padre) {
    return { ok: false, error: 'Email o contraseña incorrectos' };
  }

  redirect('/padre/dashboard');
}

/** Acción: Cerrar sesión */
export async function actionLogout() {
  await logoutPadre();
  redirect('/');
}
