import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const ADMIN_COOKIE = 'omega-admin';
const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

type AdminTokenPayload = {
  role: 'admin';
  username: string;
};

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error(
      'AUTH_SECRET must be set (at least 32 characters). Generate one with: openssl rand -base64 32',
    );
  }
  if (raw.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(raw);
}

function getAdminCredentials() {
  return {
    username: (process.env.ADMIN_USER ?? 'juan').trim(),
    password: (process.env.ADMIN_PASSWORD ?? 'juan').trim(),
    usingDefaults: !process.env.ADMIN_USER && !process.env.ADMIN_PASSWORD,
  };
}

async function createToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

async function verifyToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === 'admin' && typeof payload.username === 'string') {
      return {
        role: 'admin',
        username: payload.username,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const data = await verifyToken(token);
  if (!data) return null;

  return {
    username: data.username,
    usingDefaultCredentials: getAdminCredentials().usingDefaults,
  };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}

export async function requireAdminAuth() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error('Admin no autenticado');
  }
  return admin;
}

export async function loginAdmin(username: string, password: string) {
  const creds = getAdminCredentials();
  if (username.trim() !== creds.username || password.trim() !== creds.password) {
    return {
      ok: false as const,
      error: 'Credenciales invalidas',
    };
  }

  const store = await cookies();
  const token = await createToken({ role: 'admin', username: creds.username });
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_SECONDS,
    path: '/admin',
  });

  return {
    ok: true as const,
    username: creds.username,
    usingDefaultCredentials: creds.usingDefaults,
  };
}

export async function logoutAdmin() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/admin',
  });
}
