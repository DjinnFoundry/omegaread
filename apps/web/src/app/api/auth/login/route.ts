import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db';
import { parents, eq } from '@zetaread/db';
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
 * Native form POST login. Sets cookie via HTTP 302 redirect.
 * This bypasses all fetch/WebKit cookie issues by letting the browser
 * handle Set-Cookie natively during a redirect.
 */
export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID().slice(0, 8);

  try {
    console.info(`[api/auth/login:${traceId}] POST start`, {
      hasGateCookie: request.cookies.has('zeta-gate'),
      hasOmegaCookie: request.cookies.has(AUTH_COOKIE),
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      referer: request.headers.get('referer') ?? 'unknown',
    });

    const formData = await request.formData();
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    if (!email || !password) {
      console.warn(`[api/auth/login:${traceId}] missing credentials`);
      return redirectWithError(request, 'Email y contraseña son obligatorios');
    }

    const db = await getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const padre = await db.query.parents.findFirst({
      where: eq(parents.email, normalizedEmail),
    });

    if (!padre) {
      console.warn(`[api/auth/login:${traceId}] parent not found`, {
        email: normalizedEmail,
      });
      return redirectWithError(request, 'Email o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(password, padre.passwordHash);
    if (!passwordValida) {
      console.warn(`[api/auth/login:${traceId}] invalid password`, {
        parentId: padre.id,
      });
      return redirectWithError(request, 'Email o contraseña incorrectos');
    }

    const token = await createToken({ parentId: padre.id, email: padre.email });

    // 303 redirect (POST -> GET) con Set-Cookie.
    // Safari/WebKit maneja mejor este patron que 302 ambiguo tras POST.
    const url = new URL('/padre/dashboard', request.url);
    const response = NextResponse.redirect(url, 303);
    const secureCookie = shouldUseSecureCookie(request);
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    console.info(`[api/auth/login:${traceId}] success`, {
      parentId: padre.id,
      redirectTo: '/padre/dashboard',
      secureCookie,
    });

    return response;
  } catch (error) {
    console.error(`[api/auth/login:${traceId}] Error:`, error);
    return redirectWithError(request, 'Error interno del servidor');
  }
}

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL('/padre/login', request.url);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 303);
}
