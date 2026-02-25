/**
 * Utilidades JWT compartidas para autenticacion de padres y admin.
 * Ambos flujos usan la misma clave secreta (AUTH_SECRET) con HS256.
 */
import { SignJWT, jwtVerify } from 'jose';

/**
 * Lee AUTH_SECRET del entorno y lo convierte en Uint8Array para jose.
 * Valida que exista y tenga al menos 32 caracteres.
 *
 * Validacion lazy: el error se lanza en la primera peticion que llame a getSecret(),
 * lo que hace que el problema sea visible en los logs del worker desde el primer
 * request de autenticacion. En Cloudflare Workers, process.env solo esta disponible
 * despues de que ensureEnvFromCloudflare() haya copiado los bindings, por lo que
 * no podemos validar en tiempo de inicializacion de modulo.
 */
export function getSecret(): Uint8Array {
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

/**
 * Crea un token JWT firmado con HS256 valido por 7 dias.
 * El payload puede ser cualquier objeto serializable como JSON.
 */
export async function createToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

/**
 * Verifica un token JWT y devuelve el payload si es valido, o `null` si no lo es.
 */
export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
