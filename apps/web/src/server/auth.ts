/**
 * Autenticación simple para padres
 * Usa JWT en cookies HTTP-only
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db, parents } from '@omegaread/db';
import { eq } from 'drizzle-orm';

const AUTH_COOKIE = 'omega-auth';
const AUTH_SECRET = process.env.AUTH_SECRET ?? 'dev-secret';

// ─── Helpers de JWT simplificado ───

/** Codifica payload a base64 con firma simple (HMAC-like) */
function crearToken(payload: { parentId: string; email: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const encoded = Buffer.from(data).toString('base64url');
  const firma = Buffer.from(
    Array.from(new TextEncoder().encode(encoded + AUTH_SECRET))
      .reduce((acc, b) => ((acc << 5) - acc + b) | 0, 0)
      .toString(16)
  ).toString('base64url');
  return `${encoded}.${firma}`;
}

/** Verifica y decodifica un token */
function verificarToken(token: string): { parentId: string; email: string } | null {
  try {
    const [encoded, firma] = token.split('.');
    if (!encoded || !firma) return null;

    const expectedFirma = Buffer.from(
      Array.from(new TextEncoder().encode(encoded + AUTH_SECRET))
        .reduce((acc, b) => ((acc << 5) - acc + b) | 0, 0)
        .toString(16)
    ).toString('base64url');

    if (firma !== expectedFirma) return null;

    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (data.exp < Date.now()) return null;

    return { parentId: data.parentId, email: data.email };
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
  const token = crearToken({ parentId: padre.id, email: padre.email });
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

  const datos = verificarToken(token);
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
