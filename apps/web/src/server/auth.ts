/**
 * Autenticación simple para padres
 * Usa JWT en cookies HTTP-only (firmado con jose HS256)
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { getDb } from '@/server/db';
import { parents, students, eq, and } from '@omegaread/db';
import { SignJWT, jwtVerify } from 'jose';

const AUTH_COOKIE = 'omega-auth';

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error(
      'AUTH_SECRET must be set (at least 32 characters). Generate one with: openssl rand -base64 32',
    );
  }
  return new TextEncoder().encode(raw);
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
async function verificarToken(token: string): Promise<{ parentId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.parentId === 'string' && typeof payload.email === 'string') {
      return { parentId: payload.parentId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── API pública ───

/** Registra un nuevo padre */
export async function registrarPadre(datos: { email: string; password: string; nombre: string }) {
  console.log('[registrarPadre] Iniciando registro para:', datos.email);
  const db = await getDb();
  const passwordHash = await bcrypt.hash(datos.password, 12);

  console.log('[registrarPadre] Hash generado, insertando en DB...');
  const [padre] = await db
    .insert(parents)
    .values({
      email: datos.email.toLowerCase().trim(),
      passwordHash,
      nombre: datos.nombre.trim(),
    })
    .returning();

  console.log('[registrarPadre] Padre creado con id:', padre.id);
  return padre;
}

/** Inicia sesión de padre */
export async function loginPadre(email: string, password: string) {
  console.log('[loginPadre] Intento de login para:', email);
  const db = await getDb();
  const normalizedEmail = email.toLowerCase().trim();

  // Dev-only: auto-create admin user on first login attempt.
  // Requires NODE_ENV !== 'production' AND explicit DEV_ADMIN_ENABLED=true.
  // This prevents accidental activation in preview/staging deployments.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_ADMIN_ENABLED === 'true' &&
    normalizedEmail === 'admin@admin.com' &&
    password === 'admin'
  ) {
    const existing = await db.query.parents.findFirst({
      where: eq(parents.email, normalizedEmail),
    });
    if (!existing) {
      await registrarPadre({
        email: normalizedEmail,
        password: 'admin',
        nombre: 'Admin Test',
      });
    }
  }

  const padre = await db.query.parents.findFirst({
    where: eq(parents.email, normalizedEmail),
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
  const db = await getDb();
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

/**
 * Verifica que el padre autenticado es dueño del estudiante.
 * Combina requireAuth() + verificación de ownership en un solo helper.
 * @throws Redirige a /padre/login si no hay sesión.
 * @throws Error si el estudiante no pertenece al padre.
 */
export async function requireStudentOwnership(studentId: string) {
  const db = await getDb();
  const padre = await requireAuth();
  const estudiante = await db.query.students.findFirst({
    where: and(eq(students.id, studentId), eq(students.parentId, padre.id)),
  });
  if (!estudiante) {
    throw new Error('Acceso no autorizado: el estudiante no pertenece a este padre');
  }
  return { padre, estudiante };
}
