import { NextRequest, NextResponse } from "next/server";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function GET(req: NextRequest) {
  // Retrieve client IP address from request headers
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

  const ipHash = simpleHash(clientIp);
  const sessionId = `ip-session-${clientIp.replace(/[^a-zA-Z0-9]/g, "-")}-${ipHash}`;

  return NextResponse.json({
    ip: clientIp,
    sessionId: sessionId,
  });
}
