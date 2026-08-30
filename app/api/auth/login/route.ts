import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSession } from "@/lib/auth-session";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedUsername || !expectedPassword) {
      return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
    }

    if (!safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSession({ role: "admin", sub: expectedUsername, name: "Coordinator" });

    return NextResponse.json({ ok: true, redirect: "/admin" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
