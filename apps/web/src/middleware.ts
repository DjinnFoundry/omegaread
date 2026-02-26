import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASIC_USER = 'zeta';
const BASIC_PASS = 'zeta';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ZetaRead"' },
  });
}

export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return unauthorized();

  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(':');
  if (user !== BASIC_USER || pass !== BASIC_PASS) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png).*)'],
};
