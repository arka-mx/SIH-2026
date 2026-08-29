import { Request, Response, NextFunction } from "express";
import { verifyJwtToken } from "../utils/jwt";

const AUTHORITY_TOKEN = "demo-authority-token";

export function requireAuthority(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const legacyToken = req.headers["x-authority-token"];

  // 1. Check Bearer JWT Token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const decoded = verifyJwtToken(token);
    if (decoded) {
      (req as any).user = decoded;
      return next();
    }
  }

  // 2. Check legacy x-authority-token
  if (legacyToken === AUTHORITY_TOKEN) {
    return next();
  }

  res.status(401).json({ error: "Unauthorized or expired token" });
}

