import { cookies } from 'next/headers';
import { createToken, verifyToken } from '@/server/jwt';

const ADMIN_COOKIE = 'omega-admin';
const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

type AdminTokenPayload = {
  role: 'admin';
  username: string;
};

function getAdminCredentials() {
  return {
    username: (process.env.ADMIN_USER ?? 'juan').trim(),
    password: (process.env.ADMIN_PASSWORD ?? 'juan').trim(),
    usingDefaults: !process.env.ADMIN_USER && !process.env.ADMIN_PASSWORD,
  };
}

async function crearTokenAdmin(payload: AdminTokenPayload): Promise<string> {
  return createToken(payload);
}

async function verificarTokenAdmin(token: string): Promise<AdminTokenPayload | null> {
  const payload = await verifyToken(token);
  if (payload && payload.role === 'admin' && typeof payload.username === 'string') {
    return {
      role: 'admin',
      username: payload.username as string,
    };
  }
  return null;
}

export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const data = await verificarTokenAdmin(token);
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
  const token = await crearTokenAdmin({ role: 'admin', username: creds.username });
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
