/**
 * Edge-safe session token helpers (no `next/headers`, no Node APIs).
 * Used by middleware and re-exported through `lib/auth-session` for route handlers.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "dr_session";
const ISSUER = "disaster-response";

function key(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET is missing or too short (needs >= 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  claims: Record<string, unknown>,
  maxAgeSeconds: number
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(key());
}

export async function verifySessionToken<T = Record<string, unknown>>(
  token: string
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER });
    return payload as T;
  } catch {
    return null;
  }
}
