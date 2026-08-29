import { NextRequest, NextResponse } from "next/server";

const AUTHORITY_TOKEN = "demo-authority-token";

export function requireAuthority(req: NextRequest): NextResponse | null {
  const token = req.headers.get("x-authority-token");

  if (!token || token !== AUTHORITY_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
