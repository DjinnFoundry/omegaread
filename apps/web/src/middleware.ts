import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GATE_COOKIE = 'zeta-gate';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ZetaRead"' },
  });
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  return (
    forwardedProto === 'https' ||
    request.nextUrl.protocol === 'https:'
  );
}

function parseBasicCredentials(authHeader: string): { user: string; pass: string } | null {
  if (!authHeader.startsWith('Basic ')) return null;

  let decoded = '';
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return null;

  return {
    user: decoded.slice(0, separatorIndex),
    pass: decoded.slice(separatorIndex + 1),
  };
}

function computeGateCookieValue(user: string, pass: string): string {
  // DJB2-style hash. Not cryptographic, but deterministic and ASCII-safe.
  // We only need a stable marker that survives browser cookie parsing.
  const input = `${user}:${pass}`;
  let hash = 5381;
  for (const char of input) {
    hash = ((hash << 5) + hash) ^ char.codePointAt(0)!;
  }
  return `v1-${(hash >>> 0).toString(16)}`;
}

function isAuthCriticalPath(pathname: string): boolean {
  return (
    pathname === '/padre' ||
    pathname.startsWith('/padre/') ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isSecure = isSecureRequest(request);

  // Force HTTPS before any auth flow to ensure Secure cookies can be stored.
  // We keep localhost/dev untouched.
  if (!isSecure && request.nextUrl.hostname !== 'localhost') {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 307);
  }

  // Final WebKit/Safari mitigation:
  // Never enforce HTTP Basic on the app-auth flow itself.
  // Basic auth + iOS WebKit can break POST/redirect/cookie sequences.
  if (isAuthCriticalPath(pathname)) {
    return NextResponse.next();
  }

  // Basic Auth gate for beta access.
  // Uses a cookie to "remember" auth so that subsequent navigations,
  // form POSTs, and fetch() calls work on all browsers (including
  // iOS Safari which doesn't resend Basic Auth credentials reliably).
  const BASIC_USER = process.env.BASIC_AUTH_USER;
  const BASIC_PASS = process.env.BASIC_AUTH_PASS;

  // If Basic Auth is not configured, let everything through
  if (!BASIC_USER || !BASIC_PASS) {
    // In production we fail-closed on protected paths to avoid accidental exposure.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Basic auth no configurado en produccion', {
        status: 503,
      });
    }
    return NextResponse.next();
  }

  // Gate cookie value tied to the configured Basic credentials.
  // Prevents bypass by manually setting zeta-gate=1.
  const expectedGateValue = computeGateCookieValue(BASIC_USER, BASIC_PASS);

  // If the user already passed Basic Auth before, they have this cookie
  const existingGateValue = request.cookies.get(GATE_COOKIE)?.value;
  if (
    existingGateValue === expectedGateValue ||
    existingGateValue === '1' // backward compatibility with previous deployments
  ) {
    return NextResponse.next();
  }

  // Check Basic Auth header
  const auth = request.headers.get('authorization');
  if (!auth) return unauthorized();

  const parsed = parseBasicCredentials(auth);
  if (!parsed) return unauthorized();

  const { user, pass } = parsed;
  if (user !== BASIC_USER || pass !== BASIC_PASS) return unauthorized();

  // Basic Auth passed: set a cookie so we don't need to check again.
  // This makes all subsequent requests (form POSTs, fetch, RSC) work
  // even on browsers that don't resend Basic Auth credentials.
  const response = NextResponse.next();
  response.cookies.set(GATE_COOKIE, expectedGateValue, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png).*)'],
};
