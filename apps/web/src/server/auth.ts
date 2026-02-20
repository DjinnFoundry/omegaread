/**
 * Autenticación simple para padres
 * Usa JWT en cookies HTTP-only (firmado con jose HS256)
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db, parents } from '@omegaread/db';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';

const AUTH_COOKIE = 'omega-auth';

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw && process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET must be set in production (at least 32 characters)'
    );
  }
  return new TextEncoder().encode(raw ?? 'dev-secret');
}

// ─── Helpers de JWT ───

/** Crea un token JWT firmado con HS256 */
async function crearToken(payload: { parentId: string; email: string }): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/** Verifica y decodifica un token JWT */
async function verificarToken(
  token: string
): Promise<{ parentId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.parentId === 'string' &&
      typeof payload.email === 'string'
    ) {
      return { parentId: payload.parentId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── API pública ───

/** Registra un nuevo padre */
export async function registrarPadre(datos: {
  email: string;
  password: string;
  nombre: string;
}) {
  const passwordHash = await bcrypt.hash(datos.password, 12);

  const [padre] = await db
    .insert(parents)
    .values({
      email: datos.email.toLowerCase().trim(),
      passwordHash,
      nombre: datos.nombre.trim(),
    })
    .returning();

  return padre;
}

/** Inicia sesión de padre */
export async function loginPadre(email: string, password: string) {
  const padre = await db.query.parents.findFirst({
    where: eq(parents.email, email.toLowerCase().trim()),
  });

  if (!padre) return null;

  const passwordValida = await bcrypt.compare(password, padre.passwordHash);
  if (!passwordValida) return null;

  // Crear token y setear cookie
  const token = await crearToken({ parentId: padre.id, email: padre.email });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 días
    path: '/',
  });

  return padre;
}

/** Obtiene el padre autenticado actual (o null) */
export async function obtenerPadreActual() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const datos = await verificarToken(token);
  if (!datos) return null;

  const padre = await db.query.parents.findFirst({
    where: eq(parents.id, datos.parentId),
    with: { students: true },
  });

  return padre;
}

/** Requiere autenticación — redirige si no hay sesión */
export async function requireAuth() {
  const padre = await obtenerPadreActual();
  if (!padre) redirect('/padre/login');
  return padre;
}

/** Cierra sesión */
export async function logoutPadre() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
