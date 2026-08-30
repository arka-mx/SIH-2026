import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Clear the secure cookie by setting Max-Age to 0
  response.headers.set(
    "Set-Cookie",
    "momentum_admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );
  return response;
}
