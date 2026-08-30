import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { rescuerId, password } = await req.json();
    if (!rescuerId || !password) {
      return NextResponse.json({ error: "Rescuer ID and password required" }, { status: 400 });
    }

    const expectedPassword = process.env.NEXT_PUBLIC_DEFAULT_RESCUER_PASSWORD || "rescuer123";

    if (password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid rescuer password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    // Set secure HTTP-only cookie matching this rescuer's identity
    response.headers.set(
      "Set-Cookie",
      `momentum_rescuer_session=${encodeURIComponent(rescuerId.trim())}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
    );

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
