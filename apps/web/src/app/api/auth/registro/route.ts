import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db';
import { parents } from '@zetaread/db';
import { createToken } from '@/server/jwt';

const AUTH_COOKIE = 'omega-auth';

function shouldUseSecureCookie(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  return (
    forwardedProto === 'https' ||
    request.nextUrl.protocol === 'https:'
  );
}

/**
 * Native form POST registration. Sets cookie via HTTP 302 redirect.
 */
export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID().slice(0, 8);

  try {
    console.info(`[api/auth/registro:${traceId}] POST start`, {
      hasGateCookie: request.cookies.has('zeta-gate'),
      hasOmegaCookie: request.cookies.has(AUTH_COOKIE),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      referer: request.headers.get('referer') ?? 'unknown',
    });

    const formData = await request.formData();
    const nombre = formData.get('nombre') as string | null;
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    if (!nombre || !email || !password) {
      console.warn(`[api/auth/registro:${traceId}] missing fields`);
      return redirectWithError(request, 'Todos los campos son obligatorios');
    }

    if (password.length < 6) {
      console.warn(`[api/auth/registro:${traceId}] weak password`);
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
        console.warn(`[api/auth/registro:${traceId}] duplicate email`, {
          email: normalizedEmail,
        });
        return redirectWithError(request, 'Ya existe una cuenta con este email');
      }
      throw error;
    }

    const token = await createToken({ parentId: padre.id, email: padre.email });

    const url = new URL('/padre/dashboard', request.url);
    // 303 redirect (POST -> GET) para mayor compatibilidad en WebKit.
    const response = NextResponse.redirect(url, 303);
    const secureCookie = shouldUseSecureCookie(request);
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    console.info(`[api/auth/registro:${traceId}] success`, {
      parentId: padre.id,
      redirectTo: '/padre/dashboard',
      secureCookie,
    });

    return response;
  } catch (error) {
    console.error(`[api/auth/registro:${traceId}] Error:`, error);
    return redirectWithError(request, 'Error interno del servidor');
  }
}

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL('/padre/registro', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 303);
}
