/**
 * Utilidades JWT compartidas para autenticacion de padres y admin.
 * Ambos flujos usan la misma clave secreta (AUTH_SECRET) con HS256.
 */
import { SignJWT, jwtVerify } from 'jose';

/**
 * Lee AUTH_SECRET del entorno y lo convierte en Uint8Array para jose.
 * Valida que exista y tenga al menos 32 caracteres.
 *
 * En Cloudflare Workers los secrets viven en bindings, no en process.env.
 * Por eso usamos getCloudflareContext() como fuente primaria y process.env como fallback (dev).
 */
let _cachedSecret: Uint8Array | null = null;
let _cachedRawSecret: string | null = null;

export async function getSecret(): Promise<Uint8Array> {
  let raw = process.env.AUTH_SECRET;

  if (!raw) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      raw = (env as Record<string, string>).AUTH_SECRET;
    } catch {
      // Not in Cloudflare context (local dev)
    }
  }

  if (!raw) {
    throw new Error(
      'AUTH_SECRET must be set (at least 32 characters). Generate one with: openssl rand -base64 32',
    );
  }
  if (raw.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters');
  }

  // Reuse only if the actual secret value is unchanged.
  if (_cachedSecret && _cachedRawSecret === raw) {
    return _cachedSecret;
  }

  _cachedRawSecret = raw;
  _cachedSecret = new TextEncoder().encode(raw);
  return _cachedSecret;
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
    .sign(await getSecret());
}

/**
 * Verifica un token JWT y devuelve el payload si es valido, o `null` si no lo es.
 */
export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
