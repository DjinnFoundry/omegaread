import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db';
import { parents, eq } from '@zetaread/db';
import { createToken } from '@/server/jwt';

const AUTH_COOKIE = 'omega-auth';

/**
 * Native form POST login. Sets cookie via HTTP 302 redirect.
 * This bypasses all fetch/WebKit cookie issues by letting the browser
 * handle Set-Cookie natively during a redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    if (!email || !password) {
      return redirectWithError(request, 'Email y contraseña son obligatorios');
    }

    const db = await getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const padre = await db.query.parents.findFirst({
      where: eq(parents.email, normalizedEmail),
    });

    if (!padre) {
      return redirectWithError(request, 'Email o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(password, padre.passwordHash);
    if (!passwordValida) {
      return redirectWithError(request, 'Email o contraseña incorrectos');
    }

    const token = await createToken({ parentId: padre.id, email: padre.email });

    // 302 redirect con Set-Cookie: el browser procesa la cookie durante el redirect
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
    console.error('[api/auth/login] Error:', error);
    return redirectWithError(request, 'Error interno del servidor');
  }
}

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL('/padre/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 302);
}
