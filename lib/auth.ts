import { NextRequest } from "next/server";

const AUTHORITY_TOKEN = "demo-authority-token";

export function isAuthorizedAuthority(req: NextRequest): boolean {
  const legacyToken = req.headers.get("x-authority-token");
  const authHeader = req.headers.get("authorization");

  if (legacyToken === AUTHORITY_TOKEN) {
    return true;
  }
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return true;
  }
  return false;
}
