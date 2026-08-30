import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Clear the secure rescuer session cookie
  response.headers.set(
    "Set-Cookie",
    "momentum_rescuer_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );
  return response;
}
