import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/AdminUser";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await AdminUserModel.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const testHash = crypto.pbkdf2Sync(password, user.passwordSalt, 1000, 64, "sha512").toString("hex");
    if (testHash !== user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ 
      success: true, 
      user: { username: user.username, name: user.name, role: user.role } 
    });

    // Set HTTP-only cookie for secure administration access
    response.headers.set(
      "Set-Cookie",
      `momentum_admin_session=${user.username}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
    );

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
