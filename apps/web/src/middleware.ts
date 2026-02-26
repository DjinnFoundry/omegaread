import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ZetaRead"' },
  });
}

export function middleware(request: NextRequest) {
  // Basic Auth gate for beta access.
  // Uses a cookie to "remember" auth so that subsequent navigations,
  // form POSTs, and fetch() calls work on all browsers (including
  // iOS Safari which doesn't resend Basic Auth credentials reliably).
  const BASIC_USER = process.env.BASIC_AUTH_USER;
  const BASIC_PASS = process.env.BASIC_AUTH_PASS;

  // If Basic Auth is not configured, let everything through
  if (!BASIC_USER || !BASIC_PASS) {
    return NextResponse.next();
  }

  // If the user already passed Basic Auth before, they have this cookie
  const GATE_COOKIE = 'zeta-gate';
  if (request.cookies.get(GATE_COOKIE)?.value === '1') {
    return NextResponse.next();
  }

  // Check Basic Auth header
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return unauthorized();

  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(':');
  if (user !== BASIC_USER || pass !== BASIC_PASS) return unauthorized();

  // Basic Auth passed: set a cookie so we don't need to check again.
  // This makes all subsequent requests (form POSTs, fetch, RSC) work
  // even on browsers that don't resend Basic Auth credentials.
  const response = NextResponse.next();
  response.cookies.set(GATE_COOKIE, '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png).*)'],
};
