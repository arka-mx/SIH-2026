import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";

// Lets client components read the current session (the cookie itself is HttpOnly).
export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user });
}
