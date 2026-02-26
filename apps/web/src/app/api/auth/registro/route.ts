import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db';
import { parents } from '@zetaread/db';
import { createToken } from '@/server/jwt';

const AUTH_COOKIE = 'omega-auth';

/**
 * Native form POST registration. Sets cookie via HTTP 302 redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const nombre = formData.get('nombre') as string | null;
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    if (!nombre || !email || !password) {
      return redirectWithError(request, 'Todos los campos son obligatorios');
    }

    if (password.length < 6) {
      return redirectWithError(request, 'La contraseña debe tener al menos 6 caracteres');
    }

    const db = await getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 12);

    let padre;
    try {
      [padre] = await db
        .insert(parents)
        .values({
          email: normalizedEmail,
          passwordHash,
          nombre: nombre.trim(),
        })
        .returning();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('duplicate')) {
        return redirectWithError(request, 'Ya existe una cuenta con este email');
      }
      throw error;
    }

    const token = await createToken({ parentId: padre.id, email: padre.email });

    const url = new URL('/padre/dashboard', request.url);
    const response = NextResponse.redirect(url, 302);
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[api/auth/registro] Error:', error);
    return redirectWithError(request, 'Error interno del servidor');
  }
}

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL('/padre/registro', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 302);
}
