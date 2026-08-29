import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "sih-2026-secure-jwt-secret-key-change-in-production";

// 6 months (180 days) expiration requirement
export const JWT_EXPIRATION = "180d";

export interface TokenPayload {
  userId?: string;
  role?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Signs a JWT token configured to expire in 6 months (180 days)
 */
export function generateJwtToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Verifies a JWT token
 */
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
